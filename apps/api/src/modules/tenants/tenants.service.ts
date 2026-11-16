import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants, type Tenant, type NewTenant } from '../../database/schema/tenants';
import { memberships, users, type Membership } from '../../database/schema/users';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { AddMemberDto, AssignableRole } from './dto/invite-member.dto';
import * as bcrypt from 'bcryptjs';
import { createId } from '../../database/utils/id';
import { DEFAULT_PLAN } from '../../shared/plans/plan-catalog';
import { AuditService } from '../../shared/audit/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .limit(1);
    return tenant ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1);
    return tenant ?? null;
  }

  async create(dto: CreateTenantDto, ownerUserId: string): Promise<Tenant> {
    const existing = await this.findBySlug(dto.slug);
    if (existing) throw new ConflictException('Slug already taken');

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const [tenant] = await this.db
      .insert(tenants)
      .values({
        id: createId(),
        name: dto.name,
        slug: dto.slug,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
        locale: dto.locale ?? 'pt-BR',
        status: 'trial',
        trialEndsAt,
        planId: DEFAULT_PLAN,
      })
      .returning();

    await this.db.insert(memberships).values({
      id: createId(),
      tenantId: tenant!.id,
      userId: ownerUserId,
      role: 'owner',
      status: 'active',
    });

    await this.auditService.log({
      tenantId: tenant!.id,
      userId: ownerUserId,
      action: 'tenant.created',
      resourceType: 'tenant',
      resourceId: tenant!.id,
      newState: { name: tenant!.name, slug: tenant!.slug, status: tenant!.status },
    });

    return tenant!;
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto): Promise<Tenant> {
    const [tenant] = await this.db
      .update(tenants)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return tenant!;
  }

  async getMembers(tenantId: string) {
    return this.db
      .select({
        id: memberships.id,
        role: memberships.role,
        status: memberships.status,
        createdAt: memberships.createdAt,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.tenantId, tenantId), ne(memberships.status, 'suspended')));
  }

  /**
   * Adiciona um usuário à organização com login NOVO (cadastro fechado, organizações isoladas):
   * um e-mail que já tem conta em qualquer organização é recusado.
   */
  async addMember(tenantId: string, dto: AddMemberDto, actorUserId: string) {
    const email = dto.email.trim().toLowerCase();
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      throw new ConflictException('Este e-mail já tem conta na plataforma. Use outro e-mail: cada organização tem os próprios usuários.');
    }
    const passwordHash = await bcrypt.hash(dto.password, Number(process.env['BCRYPT_ROUNDS'] ?? 12));
    const result = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id, email: users.email });
      const [membership] = await tx
        .insert(memberships)
        .values({ tenantId, userId: user!.id, role: dto.role, status: 'active', invitedByUserId: actorUserId })
        .returning();
      return { user: user!, membership: membership! };
    });
    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'tenant.member_added',
      resourceType: 'membership',
      resourceId: result.membership.id,
      newState: { email, role: dto.role },
    });
    return { membershipId: result.membership.id, userId: result.user.id, email, role: result.membership.role };
  }

  async updateMemberRole(tenantId: string, membershipId: string, role: AssignableRole, actorUserId: string): Promise<Membership> {
    const [current] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .limit(1);
    if (!current) throw new NotFoundException('Usuário não encontrado nesta organização');
    if (current.role === 'owner') throw new ConflictException('O papel do dono não pode ser alterado.');
    const [membership] = await this.db
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .returning();
    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'tenant.member_role_changed',
      resourceType: 'membership',
      resourceId: membershipId,
      previousState: { role: current.role },
      newState: { role },
    });
    return membership!;
  }

  async removeMember(tenantId: string, membershipId: string, actorUserId: string): Promise<void> {
    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (!membership) throw new NotFoundException('Usuário não encontrado nesta organização');
    if (membership.role === 'owner') throw new ConflictException('O dono da organização não pode ser removido.');
    if (membership.userId === actorUserId) throw new ConflictException('Você não pode remover o seu próprio acesso.');

    await this.db
      .update(memberships)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(memberships.id, membershipId));
    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'tenant.member_removed',
      resourceType: 'membership',
      resourceId: membershipId,
      previousState: { role: membership.role, status: membership.status },
    });
  }

  async getUserTenants(userId: string) {
    return this.db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')));
  }
}
