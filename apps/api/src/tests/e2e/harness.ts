/**
 * Shared harness for the security / isolation E2E suites.
 *
 * - boots the REAL AppModule against a real PostgreSQL + Redis (never mocked data layer)
 * - replaces only the two outbound edges: the LLM provider (scripted, deterministic) and the
 *   Meta Graph HTTP client (records what would be sent to WhatsApp)
 * - seeds two completely separate tenants (A and B) with the same shape and distinctive,
 *   greppable secrets, plus an owner / admin / operator / viewer in each
 */
import { createHash, createHmac, randomBytes } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { of } from 'rxjs';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  agentCalendarSettings,
  agentReleases,
  agents,
  calendarConnections,
  calendarMeetings,
  campaigns,
  consents,
  contactIdentities,
  contacts,
  conversations,
  knowledgeItems,
  knowledgeSources,
  memberships,
  messages,
  pcCommands,
  pcDevices,
  segments,
  tenants,
  users,
  whatsappAccounts,
  whatsappTemplates,
} from '../../database/schema';
import { createId } from '../../database/utils/id';
import { HttpExceptionFilter } from '../../shared/filters/http-exception.filter';
import {
  LLM_PROVIDER,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type LlmToolCall,
} from '../../modules/lab/llm/llm-provider';

export const ROLE_KEYS = ['owner', 'admin', 'operator', 'viewer'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const DB_ROLE: Record<RoleKey, 'owner' | 'admin' | 'agent_operator' | 'viewer'> = {
  owner: 'owner',
  admin: 'admin',
  operator: 'agent_operator',
  viewer: 'viewer',
};

export const META_APP_SECRET = 'e2e-meta-app-secret';

// ─── Scripted LLM ────────────────────────────────────────────────────────────

export type LlmScript = (request: LlmRequest, toolRounds: number) => LlmResponse;

export const usage = { inputTokens: 1, outputTokens: 1 };

export function say(text: string): LlmResponse {
  return { text, toolCalls: [], stopReason: 'end_turn', usage };
}

export function callTools(...calls: Array<Omit<LlmToolCall, 'id'>>): LlmResponse {
  return {
    text: '',
    toolCalls: calls.map((c, i) => ({ id: `call_${i}`, ...c })),
    stopReason: 'tool_use',
    usage,
  };
}

/**
 * Worst-case model: first asks for the given tool calls, then repeats EVERYTHING it received
 * from them verbatim to the user. If any tool returned data it should not have, it leaks here.
 */
export function leakyModel(...calls: Array<Omit<LlmToolCall, 'id'>>): LlmScript {
  return (request, toolRounds) => {
    if (toolRounds === 0) return callTools(...calls);
    const last = request.messages[request.messages.length - 1];
    const dump = last && last.role === 'tool' ? last.results.map((r) => r.content).join(' | ') : '';
    return say(`Aqui está tudo que encontrei: ${dump}`);
  };
}

export class ScriptedLlm implements LlmProvider {
  readonly name = 'scripted';
  readonly requests: LlmRequest[] = [];
  script: LlmScript = () => say('ok');

  isConfigured(): boolean {
    return true;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    const toolRounds = request.messages.filter((m) => m.role === 'tool').length;
    return this.script(request, toolRounds);
  }

  reset(): void {
    this.requests.length = 0;
    this.script = () => say('ok');
  }
}

// ─── Fake Meta Graph client ──────────────────────────────────────────────────

interface RecordedPost {
  url: string;
  body: Record<string, unknown>;
}

export class FakeHttpService {
  readonly posts: RecordedPost[] = [];
  private counter = 0;

  post(url: string, body: Record<string, unknown>) {
    this.posts.push({ url, body });
    return of({ data: { messages: [{ id: `wamid.E2E.${++this.counter}` }] }, status: 200 });
  }

  get(_url: string) {
    return of({ data: {}, status: 200 });
  }

  /** Text messages that would have been delivered to a WhatsApp user. */
  outboundTexts(): Array<{ phoneNumberId: string; to: string; text: string }> {
    return this.posts
      .filter((p) => p.url.endsWith('/messages') && p.body['type'] === 'text')
      .map((p) => ({
        phoneNumberId: p.url.split('/').slice(-2)[0] ?? '',
        to: String(p.body['to']),
        text: String((p.body['text'] as { body?: string } | undefined)?.body ?? ''),
      }));
  }

  reset(): void {
    this.posts.length = 0;
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

export interface UserFixture {
  id: string;
  email: string;
  password: string;
  membershipId: string;
  token: string;
}

export interface TenantFixture {
  key: 'A' | 'B';
  id: string;
  slug: string;
  users: Record<RoleKey, UserFixture>;
  agentId: string;
  publishedAgentId: string;
  releaseId: string;
  contactId: string;
  otherContactId: string;
  contactPhone: string;
  otherContactPhone: string;
  conversationId: string;
  messageId: string;
  segmentId: string;
  campaignId: string;
  knowledgeSourceId: string;
  knowledgeItemId: string;
  calendarConnectionId: string;
  meetingId: string;
  otherMeetingId: string;
  whatsappAccountId: string;
  phoneNumberId: string;
  templateId: string;
  deviceId: string;
  deviceSecret: string;
  commandId: string;
  /** Strings that must NEVER show up in another tenant's responses. */
  secrets: string[];
}

export interface E2EContext {
  app: INestApplication;
  db: DrizzleDB;
  llm: ScriptedLlm;
  http: FakeHttpService;
  A: TenantFixture;
  B: TenantFixture;
  runId: string;
  close(): Promise<void>;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

async function seedTenant(
  db: DrizzleDB,
  key: 'A' | 'B',
  runId: string,
  phoneBase: string,
): Promise<Omit<TenantFixture, 'users'> & { users: Record<RoleKey, Omit<UserFixture, 'token'>> }> {
  const lower = key.toLowerCase();
  const tenantId = createId();
  const slug = `e2e-${lower}-${runId}`;

  await db
    .insert(tenants)
    .values({ id: tenantId, slug, name: `Tenant ${key}`, status: 'active', planId: 'enterprise' });

  // ── users + memberships ──
  const userFixtures = {} as Record<RoleKey, Omit<UserFixture, 'token'>>;
  for (const role of ROLE_KEYS) {
    const userId = createId();
    const membershipId = createId();
    const email = `${role}.${lower}.${runId}@e2e.test`;
    const password = `E2e-${randomBytes(6).toString('hex')}-9!`;
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: await bcrypt.hash(password, 4),
      emailVerifiedAt: new Date(),
      firstName: `${role}-${key}`,
    });
    await db.insert(memberships).values({
      id: membershipId,
      tenantId,
      userId,
      role: DB_ROLE[role],
      status: 'active',
    });
    userFixtures[role] = { id: userId, email, password, membershipId };
  }

  // ── agents ──
  const agentId = createId();
  const publishedAgentId = createId();
  const releaseId = createId();
  await db.insert(agents).values({ id: agentId, tenantId, name: `${key}_AGENT_DRAFT` });
  await db.insert(agents).values({
    id: publishedAgentId,
    tenantId,
    name: `${key}_AGENT_PUBLISHED`,
    status: 'published',
    currentReleaseId: releaseId,
    objective: `Atender clientes da empresa ${key}`,
  });
  await db.insert(agentReleases).values({
    id: releaseId,
    agentId: publishedAgentId,
    tenantId,
    version: 1,
    config: { name: `${key}_AGENT_PUBLISHED` },
    publishedAt: new Date(),
  });
  await db
    .insert(agentCalendarSettings)
    .values({ id: createId(), tenantId, agentId: publishedAgentId, canSchedule: true });

  // ── contacts / conversation / messages ──
  const contactId = createId();
  const otherContactId = createId();
  const contactPhone = `+${phoneBase}0001`;
  const otherContactPhone = `+${phoneBase}0002`;
  await db.insert(contacts).values([
    { id: contactId, tenantId, firstName: `${key}_CONTACT_ONE`, lastName: 'Silva' },
    { id: otherContactId, tenantId, firstName: `${key}_CONTACT_TWO`, lastName: 'Souza' },
  ]);
  await db.insert(contactIdentities).values([
    {
      id: createId(),
      contactId,
      tenantId,
      channel: 'whatsapp',
      value: contactPhone,
      normalizedValue: contactPhone,
    },
    {
      id: createId(),
      contactId: otherContactId,
      tenantId,
      channel: 'whatsapp',
      value: otherContactPhone,
      normalizedValue: otherContactPhone,
    },
  ]);
  await db.insert(consents).values({
    id: createId(),
    contactId,
    tenantId,
    channel: 'whatsapp',
    purpose: 'marketing',
    status: 'granted',
  });

  const conversationId = createId();
  const messageId = createId();
  await db
    .insert(conversations)
    .values({ id: conversationId, tenantId, contactId, channel: 'whatsapp' });
  await db.insert(messages).values({
    id: messageId,
    conversationId,
    tenantId,
    direction: 'inbound',
    content: { text: `${key}_MESSAGE_SECRET` },
  });

  // ── campaigns ──
  const segmentId = createId();
  const campaignId = createId();
  await db.insert(segments).values({ id: segmentId, tenantId, name: `${key}_SEGMENT` });
  await db
    .insert(campaigns)
    .values({ id: campaignId, tenantId, name: `${key}_CAMPAIGN`, segmentId });

  // ── knowledge ──
  const knowledgeSourceId = createId();
  const knowledgeItemId = createId();
  await db.insert(knowledgeSources).values({
    id: knowledgeSourceId,
    tenantId,
    name: `${key}_SOURCE`,
    type: 'typed',
    status: 'processed',
  });
  await db.insert(knowledgeItems).values({
    id: knowledgeItemId,
    tenantId,
    type: 'fact',
    content: `${key}_FACT_SECRET`,
    approvedAt: new Date(),
  });

  // ── calendar ──
  const calendarConnectionId = createId();
  const meetingId = createId();
  const otherMeetingId = createId();
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  start.setUTCHours(17, 0, 0, 0);
  const later = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  await db.insert(calendarConnections).values({
    id: calendarConnectionId,
    tenantId,
    provider: 'google',
    email: `calendar-${lower}@tenant-${lower}.test`,
    encryptedAccessToken: `enc-${lower}`,
    syncStatus: 'synced',
  });
  await db.insert(calendarMeetings).values([
    {
      id: meetingId,
      tenantId,
      agentId: publishedAgentId,
      connectionId: calendarConnectionId,
      contactId,
      title: `${key}_SECRETA reunião confidencial`,
      description: `${key}_MEETING_DESCRIPTION_SECRET`,
      contactName: `${key} Contato Um`,
      contactEmail: `secret-${lower}@tenant-${lower}.test`,
      externalEventId: `ext-${lower}-1`,
      status: 'confirmed',
      startAt: start,
      endAt: new Date(start.getTime() + 30 * 60 * 1000),
    },
    {
      id: otherMeetingId,
      tenantId,
      agentId: publishedAgentId,
      connectionId: calendarConnectionId,
      contactId: otherContactId,
      title: `${key}_OTHER_CONTACT_MEETING`,
      description: `${key}_OTHER_DESCRIPTION_SECRET`,
      contactName: `${key} Contato Dois`,
      contactEmail: `other-${lower}@tenant-${lower}.test`,
      externalEventId: `ext-${lower}-2`,
      status: 'confirmed',
      startAt: later,
      endAt: new Date(later.getTime() + 30 * 60 * 1000),
    },
  ]);

  // ── WhatsApp ──
  const whatsappAccountId = createId();
  const phoneNumberId = `PNID${key}${runId}`;
  const templateId = createId();
  await db.insert(whatsappAccounts).values({
    id: whatsappAccountId,
    tenantId,
    phoneNumberId,
    wabaId: `WABA${key}${runId}`,
    accessToken: `EAA_E2E_${key}`,
    verifyToken: `verify-${lower}`,
    status: 'connected',
    agentId: publishedAgentId,
    displayName: `${key}_WHATSAPP`,
  });
  await db.insert(whatsappTemplates).values({
    id: templateId,
    tenantId,
    accountId: whatsappAccountId,
    templateId: `tpl-${lower}`,
    name: `${key}_TEMPLATE`,
    category: 'MARKETING',
    status: 'APPROVED',
  });

  // ── PC connector ──
  const deviceId = createId();
  const deviceSecret = randomBytes(16).toString('hex');
  const commandId = createId();
  await db.insert(pcDevices).values({
    id: deviceId,
    tenantId,
    deviceName: `${key}_DEVICE`,
    pairedAt: new Date(),
    lastSeenAt: new Date(),
    deviceSecretHash: sha256(deviceSecret),
    authorizedPaths: [`C:/${key}`] as never,
    capabilities: { files: { read: true, create: true } } as never,
  });
  await db.insert(pcCommands).values({
    id: commandId,
    deviceId,
    tenantId,
    toolName: 'pc.listFiles',
    params: { path: `C:/${key}` } as never,
    status: 'pending',
  });

  return {
    key,
    id: tenantId,
    slug,
    users: userFixtures,
    agentId,
    publishedAgentId,
    releaseId,
    contactId,
    otherContactId,
    contactPhone,
    otherContactPhone,
    conversationId,
    messageId,
    segmentId,
    campaignId,
    knowledgeSourceId,
    knowledgeItemId,
    calendarConnectionId,
    meetingId,
    otherMeetingId,
    whatsappAccountId,
    phoneNumberId,
    templateId,
    deviceId,
    deviceSecret,
    commandId,
    secrets: [
      `${key}_SECRETA`,
      `${key}_MESSAGE_SECRET`,
      `${key}_FACT_SECRET`,
      `${key}_MEETING_DESCRIPTION_SECRET`,
      `${key}_OTHER_CONTACT_MEETING`,
      `${key}_OTHER_DESCRIPTION_SECRET`,
      `secret-${lower}@tenant-${lower}.test`,
      `other-${lower}@tenant-${lower}.test`,
      `calendar-${lower}@tenant-${lower}.test`,
      `${key}_CONTACT_ONE`,
      `${key}_CONTACT_TWO`,
      `${key}_AGENT_DRAFT`,
      `${key}_AGENT_PUBLISHED`,
      `${key}_SEGMENT`,
      `${key}_CAMPAIGN`,
      `${key}_SOURCE`,
      `${key}_TEMPLATE`,
      `${key}_DEVICE`,
      `${key}_WHATSAPP`,
      contactPhone,
      otherContactPhone,
    ],
  };
}

export async function bootstrapE2E(): Promise<E2EContext> {
  const llm = new ScriptedLlm();
  const http = new FakeHttpService();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LLM_PROVIDER)
    .useValue(llm)
    .overrideProvider(HttpService)
    .useValue(http)
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  // Lets the harness give every login its own client IP so the per-route login throttle
  // (a production feature we keep enabled) does not throttle the fixture setup.
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  await app.init();

  const db = app.get<DrizzleDB>(DRIZZLE_TOKEN);
  const runId = randomBytes(4).toString('hex');

  const [seedA, seedB] = [
    await seedTenant(db, 'A', runId, '55119111'),
    await seedTenant(db, 'B', runId, '55219222'),
  ];

  let loginCounter = 0;
  const withTokens = async (
    seed: Awaited<ReturnType<typeof seedTenant>>,
  ): Promise<TenantFixture> => {
    const usersWithTokens = {} as Record<RoleKey, UserFixture>;
    for (const role of ROLE_KEYS) {
      const u = seed.users[role];
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `10.20.${Math.floor(++loginCounter / 250)}.${loginCounter % 250}`)
        .send({ email: u.email, password: u.password });
      if (res.status !== 200) {
        throw new Error(`Login failed for ${u.email}: ${res.status} ${JSON.stringify(res.body)}`);
      }
      usersWithTokens[role] = { ...u, token: (res.body as { accessToken: string }).accessToken };
    }
    return { ...seed, users: usersWithTokens };
  };

  const A = await withTokens(seedA);
  const B = await withTokens(seedB);

  return {
    app,
    db,
    llm,
    http,
    A,
    B,
    runId,
    close: async () => {
      // Let any in-flight AI turn finish before the DB pool goes away.
      await app.close();
    },
  };
}

// ─── Helpers used by several suites ──────────────────────────────────────────

/** Signed Meta webhook delivery for a single inbound text message. */
export function whatsappWebhook(input: {
  phoneNumberId: string;
  from: string;
  text: string;
  messageId: string;
  name?: string;
}): { body: string; signature: string } {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WABA',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '5500000000',
                phone_number_id: input.phoneNumberId,
              },
              contacts: [{ profile: { name: input.name ?? 'Desconhecido' }, wa_id: input.from }],
              messages: [
                {
                  id: input.messageId,
                  from: input.from.replace('+', ''),
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: input.text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const body = JSON.stringify(payload);
  return { body, signature: signBody(body) };
}

export function signBody(body: string, secret = META_APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export async function postWebhook(
  app: INestApplication,
  delivery: { body: string; signature: string },
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/api/v1/webhook/whatsapp')
    .set('Content-Type', 'application/json')
    .set('x-hub-signature-256', delivery.signature)
    .send(delivery.body);
}

/** md5 of every row of every tenant-owned table for one tenant: detects ANY foreign change. */
export async function snapshotTenant(
  db: DrizzleDB,
  tenantId: string,
): Promise<Record<string, string>> {
  const tables = await db.execute<{ table_name: string }>(sql`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id'
      AND table_name NOT IN ('audit_logs', 'outbox_events', 'webhook_receipts', 'sessions')
    ORDER BY table_name
  `);

  const result: Record<string, string> = {};
  for (const { table_name } of tables.rows) {
    const rows = await db.execute<{ digest: string }>(
      sql.raw(
        `SELECT md5(coalesce(string_agg(t::text, '' ORDER BY t.id), '')) || ':' || count(*) AS digest ` +
          `FROM "${table_name}" t WHERE t.tenant_id = '${tenantId.replace(/'/g, '')}'`,
      ),
    );
    result[table_name] = rows.rows[0]?.digest ?? '';
  }
  return result;
}

export function leaks(haystack: unknown, secrets: string[]): string[] {
  const text = typeof haystack === 'string' ? haystack : JSON.stringify(haystack ?? '');
  return secrets.filter((s) => text.includes(s));
}
