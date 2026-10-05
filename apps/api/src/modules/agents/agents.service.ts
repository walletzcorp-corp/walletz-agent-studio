import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  agents,
  agentReleases,
  agentToolPermissions,
  type Agent,
  type AgentRelease,
  type AgentToolPermission,
} from '../../database/schema/agents';
import { createId } from '../../database/utils/id';
import type { CreateAgentDto } from './dto/create-agent.dto';
import type { UpdateAgentDto } from './dto/update-agent.dto';
import type { SetToolPermissionDto } from './dto/tool-permission.dto';
import { AGENT_TEMPLATE_DEFAULTS, AVAILABLE_TOOLS } from './agent-templates';
import { AuditService } from '../../shared/audit/audit.service';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  async findAllByTenant(tenantId: string): Promise<Agent[]> {
    return this.db
      .select()
      .from(agents)
      .where(and(eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .orderBy(desc(agents.updatedAt));
  }

  async findById(id: string, tenantId: string): Promise<Agent> {
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async create(dto: CreateAgentDto, tenantId: string, userId: string): Promise<Agent> {
    const template = dto.template ?? 'custom';
    const defaults = AGENT_TEMPLATE_DEFAULTS[template]!;

    const [agent] = await this.db
      .insert(agents)
      .values({
        id: createId(),
        tenantId,
        name: dto.name,
        title: dto.title ?? defaults.title,
        template,
        objective: dto.objective ?? defaults.objective,
        persona: dto.persona ?? defaults.persona,
        tone: dto.tone ?? defaults.tone,
        language: dto.language ?? 'pt-BR',
        channels: dto.channels ?? [],
        workingHours: dto.workingHours ?? {},
        handoffCriteria: defaults.handoffCriteria,
        createdByUserId: userId,
        status: 'draft',
      })
      .returning();

    await this.auditService.log({
      userId,
      tenantId,
      action: 'agent.created',
      resourceType: 'agent',
      resourceId: agent!.id,
      newState: { name: dto.name, template },
    });

    return agent!;
  }

  async update(id: string, dto: UpdateAgentDto, tenantId: string, userId: string): Promise<Agent> {
    const existing = await this.findById(id, tenantId);

    if (existing.status === 'published') {
      throw new BadRequestException('Cannot edit a published agent. Create a new release instead.');
    }

    const [updated] = await this.db
      .update(agents)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
      .returning();

    await this.auditService.log({
      userId,
      tenantId,
      action: 'agent.updated',
      resourceType: 'agent',
      resourceId: id,
      previousState: { name: existing.name },
      newState: { ...dto },
    });

    return updated!;
  }

  async publish(id: string, tenantId: string, userId: string): Promise<AgentRelease> {
    const agent = await this.findById(id, tenantId);

    if (agent.status === 'archived') {
      throw new BadRequestException('Cannot publish an archived agent');
    }

    // Get next version number
    const [lastRelease] = await this.db
      .select({ version: agentReleases.version })
      .from(agentReleases)
      .where(eq(agentReleases.agentId, id))
      .orderBy(desc(agentReleases.version))
      .limit(1);

    const nextVersion = (lastRelease?.version ?? 0) + 1;

    const config = {
      name: agent.name,
      title: agent.title,
      objective: agent.objective,
      persona: agent.persona,
      tone: agent.tone,
      language: agent.language,
      channels: agent.channels,
      workingHours: agent.workingHours,
      handoffCriteria: agent.handoffCriteria,
      template: agent.template,
    };

    const [release] = await this.db
      .insert(agentReleases)
      .values({
        id: createId(),
        agentId: id,
        tenantId,
        version: nextVersion,
        config,
        publishedByUserId: userId,
        publishedAt: new Date(),
      })
      .returning();

    await this.db
      .update(agents)
      .set({ status: 'published', currentReleaseId: release!.id, updatedAt: new Date() })
      .where(eq(agents.id, id));

    await this.auditService.log({
      userId,
      tenantId,
      action: 'agent.published',
      resourceType: 'agent',
      resourceId: id,
      newState: { version: nextVersion, releaseId: release!.id },
    });

    return release!;
  }

  async pause(id: string, tenantId: string, userId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.db
      .update(agents)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));

    await this.auditService.log({
      userId, tenantId, action: 'agent.paused', resourceType: 'agent', resourceId: id,
    });
  }

  async resume(id: string, tenantId: string, userId: string): Promise<void> {
    const agent = await this.findById(id, tenantId);
    if (!agent.currentReleaseId) {
      throw new BadRequestException('Agent has no published release. Publish first.');
    }
    await this.db
      .update(agents)
      .set({ status: 'published', updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));

    await this.auditService.log({
      userId, tenantId, action: 'agent.resumed', resourceType: 'agent', resourceId: id,
    });
  }

  async softDelete(id: string, tenantId: string, userId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.db
      .update(agents)
      .set({ deletedAt: new Date(), status: 'archived', updatedAt: new Date() })
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)));

    await this.auditService.log({
      userId, tenantId, action: 'agent.deleted', resourceType: 'agent', resourceId: id,
    });
  }

  async getReleases(agentId: string, tenantId: string): Promise<AgentRelease[]> {
    await this.findById(agentId, tenantId);
    return this.db
      .select()
      .from(agentReleases)
      .where(and(eq(agentReleases.agentId, agentId), eq(agentReleases.tenantId, tenantId)))
      .orderBy(desc(agentReleases.version));
  }

  async rollbackToRelease(agentId: string, releaseId: string, tenantId: string, userId: string): Promise<void> {
    const agent = await this.findById(agentId, tenantId);

    const [release] = await this.db
      .select()
      .from(agentReleases)
      .where(and(eq(agentReleases.id, releaseId), eq(agentReleases.agentId, agentId)))
      .limit(1);

    if (!release) throw new NotFoundException('Release not found');

    const config = release.config as Record<string, unknown>;

    await this.db.update(agents).set({
      ...config,
      currentReleaseId: releaseId,
      status: 'published',
      updatedAt: new Date(),
    }).where(eq(agents.id, agentId));

    // Mark current release as rolled back
    if (agent.currentReleaseId && agent.currentReleaseId !== releaseId) {
      await this.db
        .update(agentReleases)
        .set({ rolledBackAt: new Date() })
        .where(eq(agentReleases.id, agent.currentReleaseId));
    }

    await this.auditService.log({
      userId, tenantId, action: 'agent.rolled_back',
      resourceType: 'agent', resourceId: agentId,
      newState: { targetReleaseId: releaseId, targetVersion: release.version },
    });
  }

  async getToolPermissions(agentId: string, tenantId: string): Promise<AgentToolPermission[]> {
    await this.findById(agentId, tenantId);
    return this.db
      .select()
      .from(agentToolPermissions)
      .where(and(eq(agentToolPermissions.agentId, agentId), eq(agentToolPermissions.tenantId, tenantId)));
  }

  async setToolPermission(
    agentId: string,
    dto: SetToolPermissionDto,
    tenantId: string,
    userId: string,
  ): Promise<AgentToolPermission> {
    await this.findById(agentId, tenantId);

    const [existing] = await this.db
      .select()
      .from(agentToolPermissions)
      .where(and(
        eq(agentToolPermissions.agentId, agentId),
        eq(agentToolPermissions.toolName, dto.toolName),
      ))
      .limit(1);

    let permission: AgentToolPermission;

    if (existing) {
      const [updated] = await this.db
        .update(agentToolPermissions)
        .set({ allowed: dto.allowed, constraints: dto.constraints ?? {}, updatedAt: new Date() })
        .where(eq(agentToolPermissions.id, existing.id))
        .returning();
      permission = updated!;
    } else {
      const [created] = await this.db
        .insert(agentToolPermissions)
        .values({
          id: createId(),
          agentId,
          tenantId,
          toolName: dto.toolName,
          allowed: dto.allowed,
          constraints: dto.constraints ?? {},
        })
        .returning();
      permission = created!;
    }

    await this.auditService.log({
      userId, tenantId, action: 'agent.tool_permission_updated',
      resourceType: 'agent', resourceId: agentId,
      newState: { tool: dto.toolName, allowed: dto.allowed },
    });

    return permission;
  }

  getAvailableTools() {
    return AVAILABLE_TOOLS;
  }

  getTemplates() {
    return Object.entries(AGENT_TEMPLATE_DEFAULTS).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  }
}
