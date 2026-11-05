import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { eq, count, and, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { memberships } from '../../database/schema/users';
import { agents } from '../../database/schema/agents';

export interface PlanLimits {
  maxAgents: number;
  maxMembers: number;
  maxKnowledgeSources: number;
  maxMessagesPerMonth: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: { maxAgents: 1, maxMembers: 3, maxKnowledgeSources: 10, maxMessagesPerMonth: 1_000 },
  growth: { maxAgents: 5, maxMembers: 10, maxKnowledgeSources: 50, maxMessagesPerMonth: 10_000 },
  professional: {
    maxAgents: 20,
    maxMembers: 30,
    maxKnowledgeSources: 200,
    maxMessagesPerMonth: 50_000,
  },
  enterprise: { maxAgents: -1, maxMembers: -1, maxKnowledgeSources: -1, maxMessagesPerMonth: -1 },
};

@Injectable()
export class QuotaService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  getLimits(planId: string): PlanLimits {
    return PLAN_LIMITS[planId] ?? PLAN_LIMITS.starter!;
  }

  async assertCanCreateAgent(tenantId: string, planId: string): Promise<void> {
    const limits = this.getLimits(planId);
    if (limits.maxAgents === -1) return;

    const rows = await this.db
      .select({ value: count() })
      .from(agents)
      .where(and(eq(agents.tenantId, tenantId), isNull(agents.deletedAt)));
    const value = rows[0]?.value ?? 0;

    if (value >= limits.maxAgents) {
      throw new ForbiddenException(`Limite de ${limits.maxAgents} agentes atingido no plano atual`);
    }
  }

  async assertCanInviteMember(tenantId: string, planId: string): Promise<void> {
    const limits = this.getLimits(planId);
    if (limits.maxMembers === -1) return;

    const memberRows = await this.db
      .select({ value: count() })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.status, 'active')));
    const value = memberRows[0]?.value ?? 0;

    if (value >= limits.maxMembers) {
      throw new ForbiddenException(
        `Limite de ${limits.maxMembers} membros atingido no plano atual`,
      );
    }
  }
}
