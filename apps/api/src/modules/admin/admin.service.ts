import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants, type Tenant } from '../../database/schema/tenants';
import { AuditService } from '../../shared/audit/audit.service';
import {
  LlmUsageService,
  startOfCurrentMonthUtc,
  type RateLimitSnapshot,
} from '../../shared/llm-usage/llm-usage.service';
import type {
  ListActivityQueryDto,
  ListAgentsQueryDto,
  ListTenantsQueryDto,
} from './dto/admin.dto';

/** Quem executa a ação administrativa (vai para a auditoria). */
export interface AdminActor {
  userId: string;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  traceId?: string | undefined;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

type Row = Record<string, unknown>;

/** Converte valores numéricos do pg (bigint/numeric chegam como string). */
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

const LLM_METRIC_LIKE = 'llm.%';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly audit: AuditService,
    private readonly llmUsage: LlmUsageService,
    private readonly config: ConfigService,
  ) {}

  private async rows<T extends Row = Row>(query: SQL): Promise<T[]> {
    const result = await this.db.execute(query);
    return result.rows as T[];
  }

  // ── Visão geral ───────────────────────────────────────────────

  async overview() {
    const monthStart = startOfCurrentMonthUtc();

    const [
      tenantsByStatus,
      userStats,
      agentsByStatus,
      agentsByTemplate,
      conversationStats,
      knowledgeStats,
      tokenStats,
      daily,
      agentsPerTenant,
      topTokenTenants,
      recentActivity,
      rateLimits,
    ] = await Promise.all([
      this.rows(sql`
        SELECT status::text AS status, count(*)::int AS n
        FROM tenants WHERE deleted_at IS NULL GROUP BY status`),
      this.rows(sql`
        SELECT count(*)::int AS total,
               count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new_30d,
               count(*) FILTER (WHERE last_login_at >= now() - interval '7 days')::int AS active_7d
        FROM users WHERE deleted_at IS NULL AND NOT is_platform_admin`),
      this.rows(sql`
        SELECT status::text AS status, count(*)::int AS n
        FROM agents WHERE deleted_at IS NULL GROUP BY status`),
      this.rows(sql`
        SELECT template::text AS template, count(*)::int AS agents,
               count(DISTINCT tenant_id)::int AS tenants
        FROM agents WHERE deleted_at IS NULL
        GROUP BY template ORDER BY agents DESC`),
      this.rows(sql`
        SELECT (SELECT count(*)::int FROM conversations) AS conversations,
               (SELECT count(*)::int FROM conversations WHERE created_at >= now() - interval '30 days') AS conversations_30d,
               (SELECT count(*)::int FROM messages WHERE created_at >= now() - interval '30 days') AS messages_30d,
               (SELECT count(*)::int FROM contacts WHERE deleted_at IS NULL) AS contacts`),
      this.rows(sql`
        SELECT (SELECT count(*)::int FROM knowledge_sources WHERE deleted_at IS NULL) AS sources,
               (SELECT count(*)::int FROM knowledge_items WHERE deleted_at IS NULL) AS items`),
      this.rows(sql`
        SELECT
          coalesce(sum(quantity) FILTER (WHERE metric = 'llm.input_tokens' AND recorded_at >= ${monthStart}), 0)::float8 AS input_month,
          coalesce(sum(quantity) FILTER (WHERE metric = 'llm.output_tokens' AND recorded_at >= ${monthStart}), 0)::float8 AS output_month,
          coalesce(sum(quantity) FILTER (WHERE recorded_at >= date_trunc('day', now())), 0)::float8 AS total_today,
          count(*) FILTER (WHERE metric = 'llm.input_tokens' AND recorded_at >= ${monthStart})::int AS calls_month
        FROM usage_events WHERE metric LIKE ${LLM_METRIC_LIKE}`),
      this.rows(sql`
        WITH days AS (
          SELECT generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS d
        )
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM tenants t WHERE t.deleted_at IS NULL AND date_trunc('day', t.created_at) = d) AS tenants,
          (SELECT count(*)::int FROM agents a WHERE a.deleted_at IS NULL AND date_trunc('day', a.created_at) = d) AS agents,
          (SELECT coalesce(sum(u.quantity), 0)::float8 FROM usage_events u
             WHERE u.metric LIKE ${LLM_METRIC_LIKE} AND date_trunc('day', u.recorded_at) = d) AS tokens
        FROM days ORDER BY d`),
      this.rows(sql`
        SELECT t.id, t.name, t.status::text AS status,
               coalesce(sum(x.n), 0)::int AS agents,
               coalesce(jsonb_object_agg(x.template, x.n) FILTER (WHERE x.template IS NOT NULL), '{}'::jsonb) AS by_template
        FROM tenants t
        LEFT JOIN (
          SELECT tenant_id, template::text AS template, count(*)::int AS n
          FROM agents WHERE deleted_at IS NULL GROUP BY tenant_id, template
        ) x ON x.tenant_id = t.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY agents DESC, t.created_at DESC
        LIMIT 50`),
      this.rows(sql`
        SELECT t.id, t.name, t.llm_monthly_token_limit AS token_limit,
               coalesce(sum(u.quantity), 0)::float8 AS tokens
        FROM tenants t
        JOIN usage_events u ON u.tenant_id = t.id
        WHERE t.deleted_at IS NULL AND u.metric LIKE ${LLM_METRIC_LIKE} AND u.recorded_at >= ${monthStart}
        GROUP BY t.id
        ORDER BY tokens DESC
        LIMIT 10`),
      this.activityRows({ limit: 15, offset: 0 }),
      this.llmUsage.getRateLimits(),
    ]);

    const statusCount = (list: Row[]) =>
      Object.fromEntries(list.map((r) => [String(r['status']), num(r['n'])]));

    const tenantStatus = statusCount(tenantsByStatus);
    const agentStatus = statusCount(agentsByStatus);
    const u = userStats[0] ?? {};
    const c = conversationStats[0] ?? {};
    const k = knowledgeStats[0] ?? {};
    const tk = tokenStats[0] ?? {};

    return {
      generatedAt: new Date().toISOString(),
      tenants: {
        total: Object.values(tenantStatus).reduce((a, b) => a + b, 0),
        byStatus: tenantStatus,
      },
      users: { total: num(u['total']), new30d: num(u['new_30d']), active7d: num(u['active_7d']) },
      agents: {
        total: Object.values(agentStatus).reduce((a, b) => a + b, 0),
        byStatus: agentStatus,
        byTemplate: agentsByTemplate.map((r) => ({
          template: String(r['template']),
          agents: num(r['agents']),
          tenants: num(r['tenants']),
        })),
      },
      conversations: {
        total: num(c['conversations']),
        last30d: num(c['conversations_30d']),
        messages30d: num(c['messages_30d']),
        contacts: num(c['contacts']),
      },
      knowledge: { sources: num(k['sources']), items: num(k['items']) },
      llm: {
        model: this.config.get<string>('ANTHROPIC_DEFAULT_MODEL') ?? 'claude-sonnet-4-6',
        monthStart: monthStart.toISOString(),
        inputTokensMonth: num(tk['input_month']),
        outputTokensMonth: num(tk['output_month']),
        tokensToday: num(tk['total_today']),
        callsMonth: num(tk['calls_month']),
        rateLimits,
        topTenants: topTokenTenants.map((r) => ({
          id: String(r['id']),
          name: String(r['name']),
          tokens: num(r['tokens']),
          limit: r['token_limit'] === null ? null : num(r['token_limit']),
        })),
      },
      daily: daily.map((r) => ({
        day: String(r['day']),
        tenants: num(r['tenants']),
        agents: num(r['agents']),
        tokens: num(r['tokens']),
      })),
      agentsPerTenant: agentsPerTenant.map((r) => ({
        id: String(r['id']),
        name: String(r['name']),
        status: String(r['status']),
        agents: num(r['agents']),
        byTemplate: (r['by_template'] ?? {}) as Record<string, number>,
      })),
      recentActivity,
    };
  }

  // ── Clientes (tenants) ────────────────────────────────────────

  async listTenants(query: ListTenantsQueryDto): Promise<Paginated<ReturnType<typeof mapTenantRow>>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const monthStart = startOfCurrentMonthUtc();

    const conds: SQL[] = [sql`t.deleted_at IS NULL`];
    if (query.status) conds.push(sql`t.status::text = ${query.status}`);
    if (query.search) {
      const like = `%${query.search.trim()}%`;
      conds.push(sql`(t.name ILIKE ${like} OR t.slug ILIKE ${like} OR EXISTS (
        SELECT 1 FROM memberships m JOIN users us ON us.id = m.user_id
        WHERE m.tenant_id = t.id AND us.email ILIKE ${like}))`);
    }
    const where = sql.join(conds, sql` AND `);

    const [items, totalRows] = await Promise.all([
      this.rows(sql`
        SELECT t.id, t.name, t.slug, t.status::text AS status, t.plan_id, t.trial_ends_at,
               t.created_at, t.llm_monthly_token_limit AS token_limit,
               (SELECT us.email FROM memberships m JOIN users us ON us.id = m.user_id
                 WHERE m.tenant_id = t.id AND m.role = 'owner' ORDER BY m.created_at LIMIT 1) AS owner_email,
               (SELECT count(*)::int FROM memberships m WHERE m.tenant_id = t.id AND m.status = 'active') AS members,
               (SELECT count(*)::int FROM agents a WHERE a.tenant_id = t.id AND a.deleted_at IS NULL) AS agents,
               (SELECT count(*)::int FROM conversations cv WHERE cv.tenant_id = t.id) AS conversations,
               (SELECT coalesce(sum(u.quantity), 0)::float8 FROM usage_events u
                 WHERE u.tenant_id = t.id AND u.metric LIKE ${LLM_METRIC_LIKE} AND u.recorded_at >= ${monthStart}) AS tokens_month,
               (SELECT a.template::text FROM agents a WHERE a.tenant_id = t.id AND a.deleted_at IS NULL
                 GROUP BY a.template ORDER BY count(*) DESC, a.template LIMIT 1) AS top_template,
               GREATEST(
                 (SELECT max(al.created_at) FROM audit_logs al WHERE al.tenant_id = t.id),
                 (SELECT max(u.recorded_at) FROM usage_events u WHERE u.tenant_id = t.id),
                 (SELECT max(us.last_login_at) FROM memberships m JOIN users us ON us.id = m.user_id WHERE m.tenant_id = t.id)
               ) AS last_activity_at
        FROM tenants t
        WHERE ${where}
        ORDER BY t.created_at DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
      this.rows(sql`SELECT count(*)::int AS n FROM tenants t WHERE ${where}`),
    ]);

    return { items: items.map(mapTenantRow), total: num(totalRows[0]?.['n']), page, pageSize };
  }

  async tenantDetail(tenantId: string) {
    const tenant = await this.findTenantOrThrow(tenantId);
    const monthStart = startOfCurrentMonthUtc();

    const [members, agentRows, counts, usageDaily, monthTokens, activity] = await Promise.all([
      this.rows(sql`
        SELECT us.id AS user_id, us.email, us.first_name, us.last_name, us.last_login_at,
               m.role::text AS role, m.status::text AS status, m.created_at
        FROM memberships m JOIN users us ON us.id = m.user_id
        WHERE m.tenant_id = ${tenantId} AND us.deleted_at IS NULL
        ORDER BY m.created_at`),
      this.rows(sql`
        SELECT a.id, a.name, a.title, a.template::text AS template, a.status::text AS status,
               a.created_at, a.updated_at,
               (SELECT coalesce(sum(u.quantity), 0)::float8 FROM usage_events u
                 WHERE u.tenant_id = a.tenant_id AND u.resource_id = a.id
                   AND u.metric LIKE ${LLM_METRIC_LIKE} AND u.recorded_at >= ${monthStart}) AS tokens_month
        FROM agents a
        WHERE a.tenant_id = ${tenantId} AND a.deleted_at IS NULL
        ORDER BY a.created_at DESC`),
      this.rows(sql`
        SELECT
          (SELECT count(*)::int FROM conversations WHERE tenant_id = ${tenantId}) AS conversations,
          (SELECT count(*)::int FROM messages WHERE tenant_id = ${tenantId}) AS messages,
          (SELECT count(*)::int FROM contacts WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS contacts,
          (SELECT count(*)::int FROM knowledge_sources WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS knowledge_sources,
          (SELECT count(*)::int FROM knowledge_items WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS knowledge_items,
          (SELECT count(*)::int FROM whatsapp_accounts WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS whatsapp_accounts,
          (SELECT count(*)::int FROM calendar_connections WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS calendar_connections`),
      this.rows(sql`
        WITH days AS (
          SELECT generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS d
        )
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
          coalesce((SELECT sum(u.quantity) FROM usage_events u WHERE u.tenant_id = ${tenantId}
             AND u.metric = 'llm.input_tokens' AND date_trunc('day', u.recorded_at) = d), 0)::float8 AS input,
          coalesce((SELECT sum(u.quantity) FROM usage_events u WHERE u.tenant_id = ${tenantId}
             AND u.metric = 'llm.output_tokens' AND date_trunc('day', u.recorded_at) = d), 0)::float8 AS output
        FROM days ORDER BY d`),
      this.llmUsage.getMonthTokens(tenantId),
      this.activityRows({ tenantId, limit: 50, offset: 0 }),
    ]);

    const byTemplate: Record<string, number> = {};
    for (const a of agentRows) {
      const tpl = String(a['template']);
      byTemplate[tpl] = (byTemplate[tpl] ?? 0) + 1;
    }
    const c = counts[0] ?? {};

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        planId: tenant.planId,
        trialEndsAt: tenant.trialEndsAt,
        timezone: tenant.timezone,
        locale: tenant.locale,
        country: tenant.country,
        currency: tenant.currency,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      llm: {
        monthStart: monthStart.toISOString(),
        tokensMonth: monthTokens,
        limit: tenant.llmMonthlyTokenLimit,
        daily: usageDaily.map((r) => ({
          day: String(r['day']),
          input: num(r['input']),
          output: num(r['output']),
        })),
      },
      counts: {
        conversations: num(c['conversations']),
        messages: num(c['messages']),
        contacts: num(c['contacts']),
        knowledgeSources: num(c['knowledge_sources']),
        knowledgeItems: num(c['knowledge_items']),
        whatsappAccounts: num(c['whatsapp_accounts']),
        calendarConnections: num(c['calendar_connections']),
      },
      members: members.map((m) => ({
        userId: String(m['user_id']),
        email: String(m['email']),
        name: [m['first_name'], m['last_name']].filter(Boolean).join(' ') || null,
        role: String(m['role']),
        status: String(m['status']),
        lastLoginAt: m['last_login_at'] ?? null,
        joinedAt: m['created_at'],
      })),
      agents: agentRows.map((a) => ({
        id: String(a['id']),
        name: String(a['name']),
        title: a['title'] ?? null,
        template: String(a['template']),
        status: String(a['status']),
        tokensMonth: num(a['tokens_month']),
        createdAt: a['created_at'],
        updatedAt: a['updated_at'],
      })),
      agentsByTemplate: byTemplate,
      activity,
    };
  }

  // ── Agentes e usuários (todas as organizações) ───────────────

  async listAgents(query: ListAgentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const monthStart = startOfCurrentMonthUtc();

    const conds: SQL[] = [sql`a.deleted_at IS NULL`, sql`t.deleted_at IS NULL`];
    if (query.tenantId) conds.push(sql`a.tenant_id = ${query.tenantId}`);
    if (query.template) conds.push(sql`a.template::text = ${query.template}`);
    const where = sql.join(conds, sql` AND `);

    const [items, totalRows] = await Promise.all([
      this.rows(sql`
        SELECT a.id, a.name, a.template::text AS template, a.status::text AS status, a.created_at,
               t.id AS tenant_id, t.name AS tenant_name,
               (SELECT us.email FROM users us WHERE us.id = a.created_by_user_id) AS created_by,
               (SELECT coalesce(sum(u.quantity), 0)::float8 FROM usage_events u
                 WHERE u.tenant_id = a.tenant_id AND u.resource_id = a.id
                   AND u.metric LIKE ${LLM_METRIC_LIKE} AND u.recorded_at >= ${monthStart}) AS tokens_month
        FROM agents a JOIN tenants t ON t.id = a.tenant_id
        WHERE ${where}
        ORDER BY a.created_at DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
      this.rows(sql`SELECT count(*)::int AS n FROM agents a JOIN tenants t ON t.id = a.tenant_id WHERE ${where}`),
    ]);

    return {
      items: items.map((r) => ({
        id: String(r['id']),
        name: String(r['name']),
        template: String(r['template']),
        status: String(r['status']),
        createdAt: r['created_at'],
        createdBy: r['created_by'] ?? null,
        tenantId: String(r['tenant_id']),
        tenantName: String(r['tenant_name']),
        tokensMonth: num(r['tokens_month']),
      })),
      total: num(totalRows[0]?.['n']),
      page,
      pageSize,
    };
  }

  async listUsers(page = 1, pageSize = 50) {
    const [items, totalRows] = await Promise.all([
      this.rows(sql`
        SELECT us.id, us.email, us.first_name, us.last_name, us.is_platform_admin,
               us.email_verified_at, us.last_login_at, us.created_at,
               coalesce(jsonb_agg(jsonb_build_object('tenantId', t.id, 'tenantName', t.name, 'role', m.role))
                 FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS memberships
        FROM users us
        LEFT JOIN memberships m ON m.user_id = us.id
        LEFT JOIN tenants t ON t.id = m.tenant_id AND t.deleted_at IS NULL
        WHERE us.deleted_at IS NULL
        GROUP BY us.id
        ORDER BY us.created_at DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
      this.rows(sql`SELECT count(*)::int AS n FROM users WHERE deleted_at IS NULL`),
    ]);
    return {
      items: items.map((r) => ({
        id: String(r['id']),
        email: String(r['email']),
        name: [r['first_name'], r['last_name']].filter(Boolean).join(' ') || null,
        isPlatformAdmin: r['is_platform_admin'] === true,
        emailVerified: r['email_verified_at'] !== null,
        lastLoginAt: r['last_login_at'] ?? null,
        createdAt: r['created_at'],
        memberships: r['memberships'] as Array<{ tenantId: string; tenantName: string; role: string }>,
      })),
      total: num(totalRows[0]?.['n']),
      page,
      pageSize,
    };
  }

  // ── Atividade (audit log de toda a plataforma) ────────────────

  async listActivity(query: ListActivityQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const filter = { tenantId: query.tenantId, action: query.action };
    const [items, total] = await Promise.all([
      this.activityRows({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }),
      this.activityCount(filter),
    ]);
    return { items, total, page, pageSize };
  }

  private activityWhere(f: { tenantId?: string | undefined; action?: string | undefined }): SQL {
    const conds: SQL[] = [sql`TRUE`];
    if (f.tenantId) conds.push(sql`al.tenant_id = ${f.tenantId}`);
    if (f.action) conds.push(sql`al.action LIKE ${`${f.action}%`}`);
    return sql.join(conds, sql` AND `);
  }

  private async activityCount(f: { tenantId?: string | undefined; action?: string | undefined }) {
    const r = await this.rows(sql`SELECT count(*)::int AS n FROM audit_logs al WHERE ${this.activityWhere(f)}`);
    return num(r[0]?.['n']);
  }

  private async activityRows(f: {
    tenantId?: string | undefined;
    action?: string | undefined;
    limit: number;
    offset: number;
  }) {
    const rows = await this.rows(sql`
      SELECT al.id, al.action, al.resource_type, al.resource_id, al.metadata, al.ip_address,
             al.created_at, al.tenant_id, t.name AS tenant_name, al.user_id, us.email AS user_email
      FROM audit_logs al
      LEFT JOIN tenants t ON t.id = al.tenant_id
      LEFT JOIN users us ON us.id = al.user_id
      WHERE ${this.activityWhere(f)}
      ORDER BY al.created_at DESC
      LIMIT ${f.limit} OFFSET ${f.offset}`);
    return rows.map((r) => ({
      id: String(r['id']),
      action: String(r['action']),
      resourceType: String(r['resource_type']),
      resourceId: r['resource_id'] ?? null,
      metadata: (r['metadata'] ?? {}) as Record<string, unknown>,
      ipAddress: r['ip_address'] ?? null,
      createdAt: r['created_at'],
      tenantId: r['tenant_id'] ?? null,
      tenantName: r['tenant_name'] ?? null,
      userId: r['user_id'] ?? null,
      userEmail: r['user_email'] ?? null,
    }));
  }

  async llmStatus(): Promise<{ model: string; rateLimits: RateLimitSnapshot | null }> {
    return {
      model: this.config.get<string>('ANTHROPIC_DEFAULT_MODEL') ?? 'claude-sonnet-4-6',
      rateLimits: await this.llmUsage.getRateLimits(),
    };
  }

  // ── Ações sobre clientes (todas auditadas) ────────────────────

  async suspendTenant(tenantId: string, reason: string, actor: AdminActor) {
    const tenant = await this.findTenantOrThrow(tenantId);
    if (tenant.status === 'suspended') {
      throw new BadRequestException('Organização já está suspensa');
    }
    if (tenant.status === 'cancelled') {
      throw new BadRequestException('Organização cancelada não pode ser suspensa');
    }
    const updated = await this.updateTenant(tenantId, { status: 'suspended' });
    this.logAction(actor, tenantId, 'admin.tenant.suspended', { status: tenant.status }, { status: 'suspended' }, { reason });
    return updated;
  }

  async reactivateTenant(tenantId: string, actor: AdminActor) {
    const tenant = await this.findTenantOrThrow(tenantId);
    if (tenant.status !== 'suspended') {
      throw new BadRequestException('Só organizações suspensas podem ser reativadas');
    }
    // Volta ao status de antes da suspensão (registrado na auditoria).
    const prev = await this.rows(sql`
      SELECT previous_state->>'status' AS status FROM audit_logs
      WHERE tenant_id = ${tenantId} AND action = 'admin.tenant.suspended'
      ORDER BY created_at DESC LIMIT 1`);
    const prevStatus = prev[0]?.['status'];
    const restored: Tenant['status'] =
      prevStatus === 'trial' || prevStatus === 'active'
        ? prevStatus
        : tenant.trialEndsAt && tenant.trialEndsAt > new Date()
          ? 'trial'
          : 'active';

    const updated = await this.updateTenant(tenantId, { status: restored });
    this.logAction(actor, tenantId, 'admin.tenant.reactivated', { status: 'suspended' }, { status: restored });
    return updated;
  }

  async extendTrial(tenantId: string, days: number, actor: AdminActor) {
    const tenant = await this.findTenantOrThrow(tenantId);
    const base = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const updated = await this.updateTenant(tenantId, { trialEndsAt });
    this.logAction(
      actor,
      tenantId,
      'admin.tenant.trial_extended',
      { trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null },
      { trialEndsAt: trialEndsAt.toISOString() },
      { days },
    );
    return updated;
  }

  async setTokenLimit(tenantId: string, limit: number | null, actor: AdminActor) {
    const tenant = await this.findTenantOrThrow(tenantId);
    const updated = await this.updateTenant(tenantId, { llmMonthlyTokenLimit: limit });
    this.logAction(
      actor,
      tenantId,
      'admin.tenant.token_limit_set',
      { llmMonthlyTokenLimit: tenant.llmMonthlyTokenLimit },
      { llmMonthlyTokenLimit: limit },
    );
    return updated;
  }

  // ── helpers ───────────────────────────────────────────────────

  private async findTenantOrThrow(tenantId: string): Promise<Tenant> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!tenant) throw new NotFoundException('Organização não encontrada');
    return tenant;
  }

  private async updateTenant(
    tenantId: string,
    patch: Partial<Pick<Tenant, 'status' | 'trialEndsAt' | 'llmMonthlyTokenLimit'>>,
  ) {
    const [updated] = await this.db
      .update(tenants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning({
        id: tenants.id,
        status: tenants.status,
        trialEndsAt: tenants.trialEndsAt,
        llmMonthlyTokenLimit: tenants.llmMonthlyTokenLimit,
        updatedAt: tenants.updatedAt,
      });
    return updated!;
  }

  private logAction(
    actor: AdminActor,
    tenantId: string,
    action: string,
    previousState: Record<string, unknown>,
    newState: Record<string, unknown>,
    metadata: Record<string, unknown> = {},
  ) {
    void this.audit.log({
      tenantId,
      userId: actor.userId,
      sessionId: actor.sessionId,
      action,
      resourceType: 'tenant',
      resourceId: tenantId,
      previousState,
      newState,
      metadata: { ...metadata, platformAdmin: true },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      traceId: actor.traceId,
    });
  }
}

function mapTenantRow(r: Row) {
  return {
    id: String(r['id']),
    name: String(r['name']),
    slug: String(r['slug']),
    status: String(r['status']),
    planId: (r['plan_id'] as string | null) ?? null,
    trialEndsAt: r['trial_ends_at'] ?? null,
    createdAt: r['created_at'],
    ownerEmail: (r['owner_email'] as string | null) ?? null,
    members: num(r['members']),
    agents: num(r['agents']),
    conversations: num(r['conversations']),
    tokensMonth: num(r['tokens_month']),
    tokenLimit: r['token_limit'] === null || r['token_limit'] === undefined ? null : num(r['token_limit']),
    topTemplate: (r['top_template'] as string | null) ?? null,
    lastActivityAt: r['last_activity_at'] ?? null,
  };
}
