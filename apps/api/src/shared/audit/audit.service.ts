import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { auditLogs, type NewAuditLog } from '../../database/schema/audit';

export interface AuditLogParams {
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  /** Awaited variant for security events: the row exists before the caller responds. */
  async logSync(params: AuditLogParams): Promise<void> {
    try {
      await this.db.insert(auditLogs).values(this.toEntry(params));
    } catch (err) {
      process.stderr.write(`[AuditService] Failed to write audit log: ${String(err)}\n`);
    }
  }

  async log(params: AuditLogParams): Promise<void> {
    const entry = this.toEntry(params);

    // Fire-and-forget: audit log failure must NOT break the main flow
    this.db
      .insert(auditLogs)
      .values(entry)
      .catch((err: unknown) => {
        // Log to stderr only — never throw
        process.stderr.write(`[AuditService] Failed to write audit log: ${String(err)}\n`);
      });
  }

  private toEntry(params: AuditLogParams): NewAuditLog {
    return {
      tenantId: params.tenantId ?? null,
      userId: params.userId ?? null,
      sessionId: params.sessionId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      previousState: params.previousState ?? null,
      newState: params.newState ?? null,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      traceId: params.traceId ?? null,
    };
  }
}
