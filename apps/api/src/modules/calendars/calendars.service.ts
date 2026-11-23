import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type Redis from 'ioredis';
import { REDIS_TOKEN } from '../../shared/redis/redis.module';
import { eq, and, ne, isNull, gt, gte, lt, lte, inArray, type SQL } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  calendarConnections,
  calendarMeetings,
  agentCalendarSettings,
  type CalendarConnection,
  type CalendarMeeting,
  type NewCalendarMeeting,
} from '../../database/schema/calendars';
import { AuditService } from '../../shared/audit/audit.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { GoogleCalendarService } from './google.service';
import { MicrosoftCalendarService } from './microsoft.service';
import { MicrosoftGraphAuthService } from './ms-graph-auth.service';
import { AvailabilityService, type AvailabilityHours, type TimeSlot } from './availability.service';
import { CalendarProviderError } from './calendar-provider.error';
import { BRASILIA_TIME_ZONE, parseDateTime } from './time-zone.util';
import { agents } from '../../database/schema/agents';
import type { CreateMeetingDto, RescheduleMeetingDto } from './dto/create-meeting.dto';
import type { UpdateAgentCalendarSettingsDto } from './dto/update-agent-settings.dto';

type Provider = 'google' | 'microsoft';

interface OAuthState { tenantId: string; provider: Provider; userId: string }

export interface ExternalEventInput {
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendeeEmails?: string[];
  addMeet?: boolean;
  addTeams?: boolean;
}

/** Resultado da revogação no provedor ao desconectar uma agenda. */
export type RevocationResult = 'revoked' | 'failed' | 'shared_account' | 'not_supported';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
/** Janela máxima consultada de uma vez nos provedores. */
const MAX_AVAILABILITY_DAYS = 60;
const ACTIVE_MEETING_STATUSES: Array<CalendarMeeting['status']> = ['confirmed', 'pending'];

const OAUTH_STATE_TTL_SECONDS = 600;
const oauthStateKey = (nonce: string): string => `oauth:calendar:state:${nonce}`;

@Injectable()
export class CalendarsService {
  private readonly logger = new Logger(CalendarsService.name);
  private readonly encKey: Buffer;
  /** Renovações em andamento: chamadas simultâneas compartilham a mesma. */
  private readonly refreshing = new Map<string, Promise<string>>();

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly googleService: GoogleCalendarService,
    private readonly microsoftService: MicrosoftCalendarService,
    private readonly msGraphAuth: MicrosoftGraphAuthService,
    private readonly availabilityService: AvailabilityService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly planLimits: PlanLimitsService,
    private readonly webhooks: WebhooksService,
  ) {
    const raw = this.config.get<string>('CALENDAR_ENCRYPTION_KEY', '');
    this.encKey = raw
      ? Buffer.from(raw, 'hex')
      : crypto.randomBytes(32); /* dev fallback — not persistent across restarts */
  }

  /* ── Token encryption (AES-256-GCM) ── */

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /* ── Tokens e chamadas aos provedores ── */

  private decryptToken(ciphertext: string | null): string {
    try {
      if (!ciphertext) throw new Error('token ausente');
      return this.decrypt(ciphertext);
    } catch {
      throw new CalendarProviderError('reauth', 'token.decrypt');
    }
  }

  /** Token de acesso válido (Google ou Microsoft), renovado quando está para vencer. */
  private async getAccessToken(conn: CalendarConnection, forceRefresh = false): Promise<string> {
    const fresh = !!conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS;
    if (fresh && !forceRefresh) return this.decryptToken(conn.encryptedAccessToken);

    const running = this.refreshing.get(conn.id);
    if (running) return running;
    const refresh = this.refreshConnection(conn).finally(() => this.refreshing.delete(conn.id));
    this.refreshing.set(conn.id, refresh);
    return refresh;
  }

  private async refreshConnection(stale: CalendarConnection): Promise<string> {
    // Relê: outra requisição pode ter renovado depois que esta leu a conexão.
    const [conn] = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.id, stale.id), eq(calendarConnections.tenantId, stale.tenantId), isNull(calendarConnections.deletedAt)))
      .limit(1);
    if (!conn) throw new CalendarProviderError('reauth', `${stale.provider}.refresh`, undefined, 'disconnected');
    const renewed = conn.encryptedAccessToken !== stale.encryptedAccessToken
      && !!conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS;
    if (renewed) return this.decryptToken(conn.encryptedAccessToken);

    if (!conn.encryptedRefreshToken) throw new CalendarProviderError('reauth', `${conn.provider}.refresh`, undefined, 'no_refresh_token');
    const refreshToken = this.decryptToken(conn.encryptedRefreshToken);
    const refreshed = conn.provider === 'google'
      ? await this.googleService.refreshAccessToken(refreshToken)
      : await this.refreshMicrosoft(refreshToken);

    // Só grava em conexão ativa: uma desconexão simultânea não pode ter o token recriado.
    const saved = await this.db
      .update(calendarConnections)
      .set({
        encryptedAccessToken: this.encrypt(refreshed.accessToken),
        ...(refreshed.refreshToken ? { encryptedRefreshToken: this.encrypt(refreshed.refreshToken) } : {}),
        tokenExpiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      })
      .where(and(eq(calendarConnections.id, conn.id), eq(calendarConnections.tenantId, conn.tenantId), isNull(calendarConnections.deletedAt)))
      .returning({ id: calendarConnections.id });
    if (saved.length === 0) throw new CalendarProviderError('reauth', `${conn.provider}.refresh`, undefined, 'disconnected');

    this.logger.log(`Token de agenda renovado (conexão ${conn.id})`);
    return refreshed.accessToken;
  }

  private async refreshMicrosoft(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }> {
    try {
      return await this.msGraphAuth.refreshDelegatedToken(refreshToken);
    } catch (err) {
      const revoked = /invalid_grant|interaction_required/.test(err instanceof Error ? err.message : '');
      throw new CalendarProviderError(revoked ? 'reauth' : 'unavailable', 'microsoft.refresh');
    }
  }

  /**
   * Executa uma operação no provedor com token válido. Token recusado é renovado
   * uma vez; se a autorização acabou, a conexão fica como "Reautorizar".
   */
  private async withToken<T>(conn: CalendarConnection, operation: (token: string) => Promise<T>): Promise<T> {
    try {
      let result: T;
      try {
        result = await operation(await this.getAccessToken(conn));
      } catch (err) {
        if (!(err instanceof CalendarProviderError) || err.kind !== 'unauthorized') throw err;
        result = await operation(await this.getAccessToken(conn, true));
      }
      await this.setSyncStatus(conn, 'synced', null);
      return result;
    } catch (err) {
      if (err instanceof CalendarProviderError) {
        this.logger.warn(`Agenda (conexão ${conn.id}): ${err.message}`);
        if (err.kind === 'reauth' || err.kind === 'unauthorized') {
          await this.setSyncStatus(conn, 'reauth_required', 'A autorização da agenda expirou ou foi revogada.');
        }
      }
      throw err;
    }
  }

  /** Situação exibida no painel. Falha aqui não pode desfazer o que já ocorreu no provedor. */
  private async setSyncStatus(conn: CalendarConnection, syncStatus: 'synced' | 'error' | 'reauth_required', syncError: string | null): Promise<void> {
    try {
      await this.db
        .update(calendarConnections)
        .set({ syncStatus, syncError, updatedAt: new Date(), ...(syncStatus === 'synced' ? { lastSyncAt: new Date() } : {}) })
        .where(and(eq(calendarConnections.id, conn.id), eq(calendarConnections.tenantId, conn.tenantId), isNull(calendarConnections.deletedAt)));
    } catch (err) {
      this.logger.warn(`Não foi possível atualizar a situação da agenda ${conn.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Erro do provedor em mensagem clara; não expõe resposta do provedor nem a conta conectada. */
  private toHttpError(err: unknown): unknown {
    if (!(err instanceof CalendarProviderError)) return err;
    switch (err.kind) {
      case 'reauth':
      case 'unauthorized':
        return new ConflictException({ error: 'CALENDAR_REAUTH_REQUIRED', message: 'A autorização da agenda expirou ou foi revogada. Conecte a agenda de novo na tela Agendas.' });
      case 'not_found':
        return new ConflictException({ error: 'CALENDAR_EVENT_NOT_FOUND', message: 'O evento não existe mais na agenda conectada. Cancele esta reunião e crie outra.' });
      case 'rejected':
        return new UnprocessableEntityException({ error: 'CALENDAR_REJECTED', message: 'A agenda recusou os dados da reunião. Confira horário e e-mail do convidado.' });
      case 'unavailable':
        return new ServiceUnavailableException({ error: 'CALENDAR_UNAVAILABLE', message: 'A agenda conectada não respondeu agora. Nada foi alterado na plataforma; tente de novo em instantes.' });
    }
  }

  /** Conexão ativa do tenant. Se foi desconectada e a mesma conta reconectada, usa a nova. */
  private async findActiveConnection(tenantId: string, connectionId: string): Promise<CalendarConnection | null> {
    const [conn] = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.tenantId, tenantId)))
      .limit(1);
    if (!conn || !conn.deletedAt) return conn ?? null;

    const [replacement] = await this.db
      .select()
      .from(calendarConnections)
      .where(and(
        eq(calendarConnections.tenantId, tenantId),
        eq(calendarConnections.provider, conn.provider),
        eq(calendarConnections.email, conn.email),
        isNull(calendarConnections.deletedAt),
      ))
      .limit(1);
    return replacement ?? null;
  }

  private async requireConnection(tenantId: string, connectionId: string): Promise<CalendarConnection> {
    const conn = await this.findActiveConnection(tenantId, connectionId);
    if (!conn) {
      throw new ConflictException({ error: 'CALENDAR_NOT_CONNECTED', message: 'A agenda desta reunião não está conectada. Conecte-a de novo na tela Agendas.' });
    }
    return conn;
  }

  /* ── OAuth ── */

  /**
   * URL de autorização do provedor. O `state` é um código aleatório de uso único
   * guardado no Redis (10 min) com tenant/usuário: o retorno do provedor não
   * tem login, então o tenant nunca pode vir de algo que o navegador controla.
   */
  async createAuthUrl(tenantId: string, provider: Provider, userId: string): Promise<string> {
    await this.planLimits.assertFeature(tenantId, 'calendars');
    const nonce = crypto.randomBytes(32).toString('base64url');
    const url = provider === 'google'
      ? this.googleService.buildAuthUrl(nonce)
      : this.microsoftService.buildAuthUrl(nonce);
    const state: OAuthState = { tenantId, provider, userId };
    await this.redis.set(oauthStateKey(nonce), JSON.stringify(state), 'EX', OAUTH_STATE_TTL_SECONDS);
    return url;
  }

  async handleCallback(
    provider: Provider,
    code: string,
    nonce: string,
  ): Promise<{ tenantId: string; provider: Provider }> {
    const raw = nonce && code ? await this.redis.getdel(oauthStateKey(nonce)) : null;
    if (!raw) {
      throw new BadRequestException('O link de conexão expirou ou é inválido. Tente conectar a agenda de novo.');
    }
    const state = JSON.parse(raw) as OAuthState;
    const { tenantId, userId } = state;
    if (state.provider !== provider) {
      throw new BadRequestException('O link de conexão é inválido. Tente conectar a agenda de novo.');
    }

    const tokens =
      provider === 'google'
        ? await this.googleService.exchangeCode(code)
        : await this.microsoftService.exchangeCode(code);

    /* Upsert connection — one connection per provider+email per tenant */
    const existing = await this.db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.tenantId, tenantId),
          eq(calendarConnections.provider, provider),
          eq(calendarConnections.email, tokens.email),
          isNull(calendarConnections.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      try {
        await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
        await this.planLimits.assertCanAdd(tenantId, 'calendars');
      } catch (err: unknown) {
        // O callback mostra só mensagens de BadRequest ao usuário.
        const body = err instanceof HttpException ? (err.getResponse() as { message?: string }) : null;
        throw new BadRequestException(body?.message ?? 'Limite de agendas do plano atingido.');
      }
    }

    if (existing.length > 0) {
      await this.db
        .update(calendarConnections)
        .set({
          encryptedAccessToken: this.encrypt(tokens.accessToken),
          encryptedRefreshToken: tokens.refreshToken ? this.encrypt(tokens.refreshToken) : undefined,
          tokenExpiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          displayName: tokens.displayName ?? null,
          syncStatus: 'pending',
          syncError: null,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing[0]!.id));
    } else {
      // Agenda nova reserva a vaga com trava (duas conexões simultâneas não passam do limite).
      await this.planLimits.withSlot(tenantId, 'calendars', (tx) => tx.insert(calendarConnections).values({
        tenantId,
        connectedByUserId: userId,
        provider,
        email: tokens.email,
        displayName: tokens.displayName ?? null,
        encryptedAccessToken: this.encrypt(tokens.accessToken),
        encryptedRefreshToken: tokens.refreshToken ? this.encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        syncStatus: 'pending',
      }));
    }

    await this.auditService.log({
      tenantId,
      userId: userId ?? undefined,
      action: 'calendar.connect',
      resourceType: 'calendar_connection',
      metadata: { provider, email: tokens.email },
    });

    await this.checkNewConnection(tenantId, provider, tokens.email);
    return { tenantId, provider };
  }

  /** Consulta real logo após conectar: a tela mostra se a agenda responde. Nunca derruba a conexão. */
  private async checkNewConnection(tenantId: string, provider: Provider, email: string): Promise<void> {
    try {
      const [conn] = await this.db
        .select()
        .from(calendarConnections)
        .where(and(
          eq(calendarConnections.tenantId, tenantId),
          eq(calendarConnections.provider, provider),
          eq(calendarConnections.email, email),
          isNull(calendarConnections.deletedAt),
        ))
        .limit(1);
      if (conn) await this.checkConnection(conn);
    } catch (err) {
      this.logger.warn(`Verificação da agenda recém-conectada falhou: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Lê os horários ocupados das próximas 24 h para saber se a agenda responde. */
  private async checkConnection(conn: CalendarConnection): Promise<'synced' | 'error' | 'reauth_required'> {
    const from = new Date();
    const to = new Date(from.getTime() + 86_400_000);
    try {
      await this.withToken(conn, (token) => conn.provider === 'google'
        ? this.googleService.listBusy(token, from, to, BRASILIA_TIME_ZONE)
        : this.microsoftService.listBusy(token, from, to, BRASILIA_TIME_ZONE));
      return 'synced';
    } catch (err) {
      if (!(err instanceof CalendarProviderError)) throw err;
      if (err.kind === 'reauth' || err.kind === 'unauthorized') return 'reauth_required';
      await this.setSyncStatus(conn, 'error', 'A agenda não respondeu à última verificação.');
      return 'error';
    }
  }

  /* ── Connections CRUD ── */

  async listConnections(tenantId: string): Promise<Omit<CalendarConnection, 'encryptedAccessToken' | 'encryptedRefreshToken'>[]> {
    const rows = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)));

    return rows.map(({ encryptedAccessToken, encryptedRefreshToken, ...rest }) => rest);
  }

  /**
   * Desconecta a agenda: apaga os tokens do banco e revoga a autorização no Google.
   * Os tokens são apagados mesmo se a revogação falhar. A Microsoft não oferece
   * revogação por aplicativo, e a revogação do Google vale para a conta inteira:
   * se outra conexão ativa usa a mesma conta, só os tokens desta são apagados.
   */
  async disconnect(tenantId: string, connectionId: string, userId: string): Promise<{ revocation: RevocationResult }> {
    const [conn] = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)))
      .limit(1);

    if (!conn) throw new NotFoundException('Agenda não encontrada ou já desconectada.');

    // Primeiro apaga: a partir daqui nada mais usa nem renova estes tokens.
    await this.db
      .update(calendarConnections)
      .set({
        encryptedAccessToken: '',
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        scopes: null,
        syncError: null,
        deletedAt: new Date(),
        syncStatus: 'disconnected',
        updatedAt: new Date(),
      })
      .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.tenantId, tenantId)));

    const revocation = await this.revokeAtProvider(conn);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.disconnect',
      resourceType: 'calendar_connection',
      resourceId: connectionId,
      metadata: { provider: conn.provider, email: conn.email, tokensDeleted: true, revocation },
    });
    return { revocation };
  }

  private async revokeAtProvider(conn: CalendarConnection): Promise<RevocationResult> {
    if (conn.provider !== 'google') return 'not_supported';
    try {
      // Só verifica se existe; nenhum dado de outra organização é lido ou exposto.
      const [other] = await this.db
        .select({ id: calendarConnections.id })
        .from(calendarConnections)
        .where(and(
          eq(calendarConnections.provider, 'google'),
          eq(calendarConnections.email, conn.email),
          isNull(calendarConnections.deletedAt),
          ne(calendarConnections.id, conn.id),
        ))
        .limit(1);
      if (other) return 'shared_account';
      await this.googleService.revokeToken(this.decryptToken(conn.encryptedRefreshToken ?? conn.encryptedAccessToken));
      return 'revoked';
    } catch (err) {
      this.logger.warn(`Revogação da agenda ${conn.id} falhou: ${err instanceof Error ? err.message : String(err)}`);
      return 'failed';
    }
  }

  /** Verifica de verdade cada agenda conectada e atualiza a situação mostrada no painel. */
  async triggerSync(tenantId: string): Promise<{ checked: number; synced: number; failed: number }> {
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
    const conns = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)));

    const results = await Promise.all(conns.map((conn) => this.checkConnection(conn)));
    const synced = results.filter((r) => r === 'synced').length;
    return { checked: results.length, synced, failed: results.length - synced };
  }

  /* ── Availability ── */

  async getAvailableSlots(
    tenantId: string,
    agentId: string,
    daysAhead = 7,
  ): Promise<{ start: string; end: string }[]> {
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
    const [settings] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(and(eq(agentCalendarSettings.tenantId, tenantId), eq(agentCalendarSettings.agentId, agentId)))
      .limit(1);

    if (!settings?.canSchedule) return [];

    const now = new Date();
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + clampDays(daysAhead));

    const busyBlocks = await this.getBusyBlocks(tenantId, {
      connectionId: settings.connectionId,
      from: now,
      to: rangeEnd,
    });

    const merged = this.availabilityService.mergeBusyBlocks(busyBlocks);
    const slots = this.availabilityService.computeFreeSlots(
      merged,
      (settings.availableHours ?? {}) as AvailabilityHours,
      settings.defaultDurationMinutes,
      settings.bufferMinutes,
      now,
      rangeEnd,
    );

    return slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }

  /**
   * Horários ocupados: reuniões da plataforma + agenda conectada. Se a agenda não
   * puder ser consultada, falha — nunca trata o período como livre.
   */
  async getBusyBlocks(
    tenantId: string,
    params: { connectionId: string | null; from: Date; to: Date; ignoreMeetingId?: string },
  ): Promise<TimeSlot[]> {
    const { from, to, ignoreMeetingId } = params;
    const meetings = await this.db
      .select({ id: calendarMeetings.id, startAt: calendarMeetings.startAt, endAt: calendarMeetings.endAt })
      .from(calendarMeetings)
      .where(and(
        eq(calendarMeetings.tenantId, tenantId),
        inArray(calendarMeetings.status, ACTIVE_MEETING_STATUSES),
        isNull(calendarMeetings.deletedAt),
        lt(calendarMeetings.startAt, to),
        gt(calendarMeetings.endAt, from),
      ));
    const own = meetings.find((m) => m.id === ignoreMeetingId);
    const local = meetings.filter((m) => m.id !== ignoreMeetingId).map((m) => ({ start: m.startAt, end: m.endAt }));
    if (!params.connectionId) return local;

    const conn = await this.requireConnection(tenantId, params.connectionId);
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars', item: { resource: 'calendars', id: conn.id } });
    let external: TimeSlot[];
    try {
      external = await this.withToken(conn, (token) => conn.provider === 'google'
        ? this.googleService.listBusy(token, from, to, BRASILIA_TIME_ZONE)
        : this.microsoftService.listBusy(token, from, to, BRASILIA_TIME_ZONE));
    } catch (err) {
      throw this.toHttpError(err);
    }
    if (own) external = this.availabilityService.subtractBlock(external, { start: own.startAt, end: own.endAt });
    return [...local, ...external];
  }

  /* ── Meetings ── */

  async createMeeting(tenantId: string, userId: string, dto: CreateMeetingDto): Promise<CalendarMeeting> {
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
    const startAt = parseDateTime(dto.startAt);
    const endAt = parseDateTime(dto.endAt);
    assertValidRange(startAt, endAt);
    await this.assertNoConflict(tenantId, dto.connectionId ?? null, startAt, endAt);

    let externalEventId: string | undefined;
    let externalMeetUrl: string | undefined;

    /* Com agenda escolhida, o evento precisa existir no provedor antes de salvar */
    if (dto.connectionId) {
      const created = await this.createProviderEvent(await this.requireConnection(tenantId, dto.connectionId), {
        summary: dto.title,
        description: dto.description,
        start: startAt.toISOString(),
        end: endAt.toISOString(),
        attendeeEmails: dto.contactEmail ? [dto.contactEmail] : [],
        addMeet: dto.platform === 'google_meet',
        addTeams: dto.platform === 'teams',
      });
      externalEventId = created.id;
      externalMeetUrl = created.meetUrl;
    }

    const meeting = await this.saveMeetingOrUndo(tenantId, dto.connectionId ?? null, externalEventId, {
      tenantId,
      connectionId: dto.connectionId ?? null,
      agentId: dto.agentId ?? null,
      externalEventId: externalEventId ?? null,
      externalMeetUrl: externalMeetUrl ?? null,
      title: dto.title,
      description: dto.description ?? null,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      // Sem evento no provedor a reunião nunca é dada como confirmada.
      status: externalEventId ? 'confirmed' : 'pending',
      platform: (dto.platform ?? 'google_meet') as CalendarMeeting['platform'],
      origin: dto.agentId ? 'agent' : 'manual',
      startAt,
      endAt,
      durationMinutes: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
      timeZone: BRASILIA_TIME_ZONE,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.create',
      resourceType: 'calendar_meeting',
      resourceId: meeting.id,
      metadata: { title: dto.title, externalEventId },
    });
    void this.webhooks.emit(tenantId, 'meeting.created', {
      meetingId: meeting.id,
      title: meeting.title,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      conversationId: meeting.conversationId ?? null,
    });

    return meeting;
  }

  /**
   * Trava a linha da reunião até o fim da transação: reagendar e cancelar ao mesmo
   * tempo não podem deixar o provedor com um horário e a plataforma com outro.
   * `scope` restringe quais reuniões quem chama pode alterar; fora dele a resposta é
   * a mesma de uma reunião que não existe.
   */
  private async lockMeeting(tx: Pick<DrizzleDB, 'select'>, tenantId: string, meetingId: string, scope?: SQL): Promise<CalendarMeeting> {
    const [meeting] = await tx
      .select()
      .from(calendarMeetings)
      .where(and(eq(calendarMeetings.id, meetingId), eq(calendarMeetings.tenantId, tenantId), isNull(calendarMeetings.deletedAt), scope))
      .limit(1)
      .for('update');
    if (!meeting) throw new NotFoundException('Reunião não encontrada.');
    return meeting;
  }

  async rescheduleMeeting(
    tenantId: string,
    meetingId: string,
    userId: string,
    dto: RescheduleMeetingDto,
    scope?: SQL,
  ): Promise<CalendarMeeting> {
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
    const startAt = parseDateTime(dto.startAt);
    const endAt = parseDateTime(dto.endAt);
    assertValidRange(startAt, endAt);

    let undo: (() => Promise<void>) | null = null;
    let newMeeting: CalendarMeeting;
    try {
      newMeeting = await this.db.transaction(async (tx) => {
        const meeting = await this.lockMeeting(tx, tenantId, meetingId, scope);
        if (!ACTIVE_MEETING_STATUSES.includes(meeting.status)) {
          throw new ConflictException('Esta reunião já foi cancelada ou reagendada.');
        }

        await this.assertNoConflict(tenantId, meeting.connectionId, startAt, endAt, meetingId);

        /* Primeiro o provedor: se ele não aceitar, nada muda na plataforma */
        let connectionId = meeting.connectionId;
        const eventId = meeting.externalEventId;
        if (eventId) {
          const conn = await this.requireConnection(tenantId, meeting.connectionId ?? '');
          connectionId = conn.id;
          await this.moveProviderEvent(conn, eventId, startAt, endAt);
          undo = () => this.moveProviderEvent(conn, eventId, meeting.startAt, meeting.endAt);
        }

        await tx
          .update(calendarMeetings)
          .set({ status: 'rescheduled', updatedAt: new Date() })
          .where(and(eq(calendarMeetings.id, meetingId), eq(calendarMeetings.tenantId, tenantId)));
        const [row] = await tx
          .insert(calendarMeetings)
          .values({
            tenantId,
            connectionId,
            agentId: meeting.agentId,
            conversationId: meeting.conversationId,
            contactId: meeting.contactId,
            externalEventId: eventId,
            externalMeetUrl: meeting.externalMeetUrl,
            title: meeting.title,
            description: meeting.description,
            contactName: meeting.contactName,
            contactEmail: meeting.contactEmail,
            attendees: meeting.attendees,
            status: eventId ? 'confirmed' : 'pending',
            platform: meeting.platform,
            origin: meeting.origin,
            startAt,
            endAt,
            durationMinutes: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
            timeZone: meeting.timeZone,
            rescheduledFromId: meetingId,
          })
          .returning();
        if (!row) throw new Error('Insert returned no rows');
        return row;
      });
    } catch (err) {
      // O evento foi movido, mas a plataforma não salvou: volta ao horário antigo.
      const revert = undo as (() => Promise<void>) | null;
      await revert?.().catch(() => {
        this.logger.error(`Reunião ${meetingId}: o evento foi movido no provedor, mas a plataforma não salvou a mudança`);
      });
      throw err;
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.reschedule',
      resourceType: 'calendar_meeting',
      resourceId: newMeeting.id,
      metadata: { originalMeetingId: meetingId, reason: dto.reason },
    });

    return newMeeting;
  }

  async cancelMeeting(
    tenantId: string,
    meetingId: string,
    userId: string,
    reason?: string,
    scope?: SQL,
  ): Promise<void> {
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars' });
    const changed = await this.db.transaction(async (tx) => {
      const meeting = await this.lockMeeting(tx, tenantId, meetingId, scope);
      if (meeting.status === 'cancelled') return false;
      if (meeting.status === 'rescheduled') {
        throw new ConflictException('Esta reunião foi reagendada. Cancele a reunião mais recente.');
      }

      /* Primeiro o provedor: se a exclusão falhar, a reunião continua ativa */
      if (meeting.externalEventId) {
        const conn = await this.requireConnection(tenantId, meeting.connectionId ?? '');
        await this.deleteProviderEvent(conn, meeting.externalEventId);
      }
      await tx
        .update(calendarMeetings)
        .set({ status: 'cancelled', cancellationReason: reason ?? null, updatedAt: new Date() })
        .where(and(eq(calendarMeetings.id, meetingId), eq(calendarMeetings.tenantId, tenantId)));
      return true;
    });
    if (!changed) return;

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.cancel',
      resourceType: 'calendar_meeting',
      resourceId: meetingId,
      metadata: { reason },
    });
    void this.webhooks.emit(tenantId, 'meeting.canceled', { meetingId, reason: reason ?? null });
  }

  /** Recusa horário já ocupado na plataforma ou na agenda conectada. */
  private async assertNoConflict(tenantId: string, connectionId: string | null, startAt: Date, endAt: Date, ignoreMeetingId?: string): Promise<void> {
    const busy = await this.getBusyBlocks(tenantId, { connectionId, from: startAt, to: endAt, ignoreMeetingId });
    if (!this.availabilityService.isSlotFree(startAt, endAt, busy)) {
      throw new ConflictException({ error: 'CALENDAR_SLOT_BUSY', message: 'Esse horário está ocupado. Escolha outro.' });
    }
  }

  async listMeetings(tenantId: string, from?: Date, to?: Date): Promise<CalendarMeeting[]> {
    const conditions = [
      eq(calendarMeetings.tenantId, tenantId),
      isNull(calendarMeetings.deletedAt),
    ];
    if (from) conditions.push(gte(calendarMeetings.startAt, from));
    if (to) conditions.push(lte(calendarMeetings.endAt, to));

    return this.db
      .select()
      .from(calendarMeetings)
      .where(and(...conditions))
      .orderBy(calendarMeetings.startAt);
  }

  /* ── Agent scheduling settings ── */

  async getAgentSettings(tenantId: string, agentId: string) {
    const [settings] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(and(eq(agentCalendarSettings.tenantId, tenantId), eq(agentCalendarSettings.agentId, agentId)))
      .limit(1);
    if (!settings?.connectionId) return settings ?? null;
    // Conta desconectada e reconectada: mostra a conexão atual, que é a que o agente usa.
    const active = await this.findActiveConnection(tenantId, settings.connectionId);
    return { ...settings, connectionId: active?.id ?? settings.connectionId };
  }

  async upsertAgentSettings(
    tenantId: string,
    agentId: string,
    userId: string,
    dto: UpdateAgentCalendarSettingsDto,
  ) {
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent) throw new NotFoundException('Agente não encontrado.');

    const existing = await this.getAgentSettings(tenantId, agentId);
    if (dto.connectionId) await this.requireOwnConnection(tenantId, dto.connectionId);
    if (dto.availableHours) assertAvailableHours(dto.availableHours);

    // Agendar sem agenda não funciona: o agente nunca conseguiria confirmar.
    const canSchedule = dto.canSchedule ?? existing?.canSchedule ?? false;
    const connectionId = dto.connectionId === undefined ? existing?.connectionId ?? null : dto.connectionId;
    if (canSchedule) {
      if (!connectionId) throw new BadRequestException('Escolha uma agenda conectada para o agente poder agendar.');
      await this.requireOwnConnection(tenantId, connectionId);
    }

    const fields = {
      canSchedule,
      connectionId,
      defaultDurationMinutes: dto.defaultDurationMinutes,
      bufferMinutes: dto.bufferMinutes,
      maxMeetingsPerDay: dto.maxMeetingsPerDay,
      minLeadTimeMinutes: dto.minLeadTimeMinutes,
      defaultPlatform: dto.defaultPlatform,
      availableHours: dto.availableHours,
      timeZone: BRASILIA_TIME_ZONE,
    };
    const [saved] = await this.db
      .insert(agentCalendarSettings)
      .values({ tenantId, agentId, ...fields })
      .onConflictDoUpdate({
        target: agentCalendarSettings.agentId,
        set: { ...fields, updatedAt: new Date() },
        setWhere: eq(agentCalendarSettings.tenantId, tenantId),
      })
      .returning();
    if (!saved) throw new NotFoundException('Agente não encontrado.');

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.agent_settings.upsert',
      resourceType: 'agent_calendar_settings',
      resourceId: agentId,
      previousState: existing ? { canSchedule: existing.canSchedule, connectionId: existing.connectionId } : undefined,
      newState: { canSchedule: saved.canSchedule, connectionId: saved.connectionId },
    });

    return saved;
  }

  private async requireOwnConnection(tenantId: string, connectionId: string): Promise<void> {
    if (!(await this.findActiveConnection(tenantId, connectionId))) {
      throw new BadRequestException('A agenda escolhida não está conectada nesta organização.');
    }
  }

  /* ── Eventos no provedor ── */

  /** Cria o evento para o agente (só agendas dentro do limite do plano falam com o provedor). */
  async createExternalEvent(tenantId: string, connectionId: string, params: ExternalEventInput): Promise<{ id: string; meetUrl?: string }> {
    const conn = await this.requireConnection(tenantId, connectionId);
    await this.planLimits.assertUsable(tenantId, { feature: 'calendars', item: { resource: 'calendars', id: conn.id } });
    return this.createProviderEvent(conn, params);
  }

  /**
   * Salva a reunião. Se o banco falhar depois de o evento existir no provedor,
   * desfaz o evento para não deixar compromisso órfão na agenda do cliente.
   */
  async saveMeetingOrUndo(
    tenantId: string,
    connectionId: string | null,
    externalEventId: string | undefined,
    values: NewCalendarMeeting,
  ): Promise<CalendarMeeting> {
    try {
      const [meeting] = await this.db.insert(calendarMeetings).values(values).returning();
      if (!meeting) throw new Error('Insert returned no rows');
      return meeting;
    } catch (err) {
      if (connectionId && externalEventId) {
        try {
          await this.deleteProviderEvent(await this.requireConnection(tenantId, connectionId), externalEventId);
        } catch {
          this.logger.error(`Evento órfão na agenda (conexão ${connectionId}): a reunião não foi salva e a exclusão falhou`);
        }
      }
      throw err;
    }
  }

  private async createProviderEvent(conn: CalendarConnection, params: ExternalEventInput): Promise<{ id: string; meetUrl?: string }> {
    // O Google aceita ID nosso: se a resposta se perder, dá para apagar o que foi criado.
    const googleEventId = crypto.randomUUID().replace(/-/g, '');
    try {
      const created = await this.withToken(conn, async (token) => {
        if (conn.provider === 'google') {
          const ev = await this.googleService.createEvent(token, {
            id: googleEventId,
            summary: params.summary,
            description: params.description,
            start: params.start,
            end: params.end,
            timeZone: BRASILIA_TIME_ZONE,
            attendeeEmails: params.attendeeEmails ?? [],
            addMeet: params.addMeet ?? false,
          });
          return { id: ev.id, meetUrl: ev.hangoutLink ?? ev.htmlLink };
        }
        const ev = await this.microsoftService.createEvent(token, {
          subject: params.summary,
          body: params.description,
          start: params.start,
          end: params.end,
          attendeeEmails: params.attendeeEmails ?? [],
          addTeams: params.addTeams ?? false,
        });
        return { id: ev.id, meetUrl: ev.onlineMeeting?.joinUrl ?? ev.webLink };
      });
      if (!created.id) throw new CalendarProviderError('unavailable', `${conn.provider}.createEvent`, undefined, 'no_event_id');
      return created;
    } catch (err) {
      if (conn.provider === 'google' && err instanceof CalendarProviderError && err.kind === 'unavailable') {
        await this.deleteProviderEvent(conn, googleEventId).catch(() => undefined);
      }
      throw this.toHttpError(err);
    }
  }

  private async moveProviderEvent(conn: CalendarConnection, eventId: string, start: Date, end: Date): Promise<void> {
    try {
      await this.withToken<unknown>(conn, (token) => conn.provider === 'google'
        ? this.googleService.updateEventTime(token, eventId, { start: start.toISOString(), end: end.toISOString(), timeZone: BRASILIA_TIME_ZONE })
        : this.microsoftService.updateEventTime(token, eventId, { start, end }));
    } catch (err) {
      throw this.toHttpError(err);
    }
  }

  private async deleteProviderEvent(conn: CalendarConnection, eventId: string): Promise<void> {
    try {
      await this.withToken(conn, (token) => conn.provider === 'google'
        ? this.googleService.deleteEvent(token, eventId)
        : this.microsoftService.deleteEvent(token, eventId));
    } catch (err) {
      throw this.toHttpError(err);
    }
  }
}

export function clampDays(days: number): number {
  return Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days), 1), MAX_AVAILABILITY_DAYS) : 7;
}

function assertValidRange(startAt: Date, endAt: Date): void {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new BadRequestException('Data ou horário inválido.');
  }
  if (endAt <= startAt) throw new BadRequestException('O término da reunião deve ser depois do início.');
}

const DAY_KEYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Dias conhecidos e, nos habilitados, início antes do fim em HH:mm. */
function assertAvailableHours(hours: NonNullable<UpdateAgentCalendarSettingsDto['availableHours']>): void {
  for (const [day, window] of Object.entries(hours)) {
    if (!DAY_KEYS.has(day) || typeof window !== 'object' || window === null || typeof window.enabled !== 'boolean') {
      throw new BadRequestException('Expediente inválido.');
    }
    if (!window.enabled) continue;
    const { start, end } = window;
    if (typeof start !== 'string' || typeof end !== 'string' || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end) {
      throw new BadRequestException('No expediente, o início de cada dia deve ser antes do fim (HH:mm).');
    }
  }
}
