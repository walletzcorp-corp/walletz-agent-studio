import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../../database/database.module';
import { whatsappAccounts } from '../../database/schema/whatsapp';

export interface OutboundAccount {
  id: string;
  status: string;
}

/**
 * The number a tenant-initiated message (inbox reply, campaign) goes out through.
 * Always scoped to the tenant, and deterministic when a tenant owns several numbers:
 * a connected one wins, then the oldest. Never "whichever row Postgres returns first".
 */
export async function pickOutboundAccount(
  db: DrizzleDB,
  tenantId: string,
): Promise<OutboundAccount | null> {
  const [account] = await db
    .select({ id: whatsappAccounts.id, status: whatsappAccounts.status })
    .from(whatsappAccounts)
    .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)))
    .orderBy(
      asc(sql`(${whatsappAccounts.status} <> 'connected')`),
      asc(whatsappAccounts.createdAt),
      asc(whatsappAccounts.id),
    )
    .limit(1);
  return account ?? null;
}
