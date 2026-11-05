import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants, type Tenant } from '../../database/schema/tenants';
import { memberships, users, type Membership } from '../../database/schema/users';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import { createId } from '../../database/utils/id';
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
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
      })
      .returning();

    await this.db.insert(memberships).values({
      id: createId(),
      tenantId: tenant!.id,
      userId: ownerUserId,
      role: 'owner',
      status: 'active',
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
      .where(eq(memberships.tenantId, tenantId));
  }

  async inviteMember(
    tenantId: string,
    dto: InviteMemberDto,
    invitedByUserId: string,
  ): Promise<Membership> {
    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    const userId = existingUser[0]?.id;

    if (userId) {
      const existing = await this.db
        .select()
        .from(memberships)
        .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
        .limit(1);

      if (existing[0]) throw new ConflictException('User already a member');
    }

    const inviteToken = randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const targetUserId = userId ?? createId(); // placeholder if user doesn't exist yet

    if (!userId) {
      await this.db.insert(users).values({
        id: targetUserId,
        email: dto.email.toLowerCase(),
      });
    }

    const [membership] = await this.db
      .insert(memberships)
      .values({
        id: createId(),
        tenantId,
        userId: targetUserId,
        role: dto.role,
        status: 'invited',
        invitedByUserId,
        inviteToken,
        inviteExpiresAt,
      })
      .returning();

    // Send invite email (best-effort — don't fail the invite if mail fails)
    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    this.mailService
      .sendInvite(dto.email.toLowerCase(), tenant?.name ?? 'Walletz', inviteToken, appUrl)
      .catch((err: unknown) =>
        this.logger.error(`Failed to send invite email to ${dto.email}: ${String(err)}`),
      );

    return membership!;
  }

  async updateMemberRole(
    tenantId: string,
    membershipId: string,
    role: string,
    requestingUserId: string,
  ): Promise<Membership> {
    const validRoles: Membership['role'][] = [
      'viewer',
      'analyst',
      'agent_operator',
      'manager',
      'admin',
    ];
    if (!validRoles.includes(role as Membership['role'])) {
      throw new BadRequestException(`Invalid role. Allowed: ${validRoles.join(', ')}`);
    }

    const [target] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (!target) throw new NotFoundException('Membership not found');
    if (target.role === 'owner') throw new ForbiddenException("Cannot change the owner's role");

    const [requester] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, requestingUserId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (target.userId === requestingUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }
    if (requester?.role !== 'owner' && role === 'admin') {
      // Only owners can assign admin; admins can assign up to manager
      throw new ForbiddenException('Only owners can assign the admin role');
    }

    const [updated] = await this.db
      .update(memberships)
      .set({ role: role as Membership['role'], updatedAt: new Date() })
      .where(eq(memberships.id, membershipId))
      .returning();

    return updated!;
  }

  async removeMember(tenantId: string, membershipId: string): Promise<void> {
    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === 'owner') throw new ConflictException('Cannot remove the owner');

    await this.db
      .update(memberships)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(memberships.id, membershipId));
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
