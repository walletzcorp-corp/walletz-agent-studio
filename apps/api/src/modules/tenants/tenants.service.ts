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
import * as bcrypt from 'bcryptjs';
import { generateOneTimeToken, hashOneTimeToken } from '../../shared/crypto/one-time-token';
import { AuditService } from '../../shared/audit/audit.service';
import type { AcceptInviteDto } from './dto/accept-invite.dto';
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
    private readonly audit: AuditService,
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
  ): Promise<Omit<Membership, 'inviteToken'>> {
    // Same rule as updateMemberRole: admin is a privileged seat only an owner can hand out.
    if (dto.role === 'admin' && (await this.roleOf(tenantId, invitedByUserId)) !== 'owner') {
      throw new ForbiddenException('Only owners can invite admins');
    }

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

    const inviteToken = generateOneTimeToken();
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
        // Only the hash is stored; the raw token travels by e-mail and is never persisted.
        inviteToken: hashOneTimeToken(inviteToken),
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

    await this.audit.log({
      tenantId,
      userId: invitedByUserId,
      action: 'tenant.member_invited',
      resourceType: 'membership',
      resourceId: membership!.id,
      newState: { role: dto.role, email: dto.email.toLowerCase() },
    });

    const safe: Partial<Membership> = { ...membership! };
    delete safe.inviteToken;
    return safe as Omit<Membership, 'inviteToken'>;
  }

  /**
   * Public, token-authenticated. The token is looked up by hash, must be unexpired and the
   * membership still `invited`; the activation is a single conditional UPDATE so a token can
   * only ever be redeemed once, even under concurrent requests.
   */
  async acceptInvite(
    dto: AcceptInviteDto,
    ipAddress?: string,
  ): Promise<{ tenantId: string; email: string; role: Membership['role'] }> {
    const invalid = () => new BadRequestException('Invalid or expired invite');

    const [row] = await this.db
      .select({
        membership: memberships,
        user: users,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.inviteToken, hashOneTimeToken(dto.token)),
          eq(memberships.status, 'invited'),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!row || !row.membership.inviteExpiresAt || row.membership.inviteExpiresAt < new Date()) {
      throw invalid();
    }
    const { membership, user } = row;

    let passwordHash: string | undefined;
    if (!user.passwordHash) {
      if (!dto.password) {
        throw new BadRequestException('Password is required to create your account');
      }
      const rounds = Number(this.config.get('BCRYPT_ROUNDS', 12));
      passwordHash = await bcrypt.hash(dto.password, rounds);
    }

    const [activated] = await this.db
      .update(memberships)
      .set({ status: 'active', inviteToken: null, inviteExpiresAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.id, membership.id),
          eq(memberships.tenantId, membership.tenantId),
          eq(memberships.status, 'invited'),
          eq(memberships.inviteToken, membership.inviteToken!),
        ),
      )
      .returning({ id: memberships.id });
    if (!activated) throw invalid();

    // Redeeming the e-mailed token proves control of the mailbox. The password of an existing
    // account is never replaced here — only a placeholder account (no password) gets one.
    await this.db
      .update(users)
      .set({
        ...(passwordHash
          ? {
              passwordHash,
              firstName: dto.firstName ?? user.firstName,
              lastName: dto.lastName ?? user.lastName,
            }
          : {}),
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await this.audit.logSync({
      tenantId: membership.tenantId,
      userId: user.id,
      action: 'tenant.invite_accepted',
      resourceType: 'membership',
      resourceId: membership.id,
      newState: { role: membership.role },
      ipAddress,
    });

    return { tenantId: membership.tenantId, email: user.email, role: membership.role };
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
    if (target.role === 'admin' && (await this.roleOf(tenantId, requestingUserId)) !== 'owner') {
      throw new ForbiddenException("Only owners can change an admin's role");
    }

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
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .returning();

    await this.audit.log({
      tenantId,
      userId: requestingUserId,
      action: 'tenant.member_role_changed',
      resourceType: 'membership',
      resourceId: membershipId,
      previousState: { role: target.role },
      newState: { role },
    });

    return updated!;
  }

  private async roleOf(tenantId: string, userId: string): Promise<Membership['role'] | null> {
    const [row] = await this.db
      .select({ role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.userId, userId),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1);
    return row?.role ?? null;
  }

  async removeMember(
    tenantId: string,
    membershipId: string,
    requestingUserId: string,
  ): Promise<void> {
    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === 'owner') throw new ConflictException('Cannot remove the owner');
    if (
      membership.role === 'admin' &&
      (await this.roleOf(tenantId, requestingUserId)) !== 'owner'
    ) {
      throw new ForbiddenException('Only owners can remove an admin');
    }

    await this.db
      .update(memberships)
      .set({ status: 'suspended', inviteToken: null, inviteExpiresAt: null, updatedAt: new Date() })
      .where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)));

    await this.audit.log({
      tenantId,
      userId: requestingUserId,
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
