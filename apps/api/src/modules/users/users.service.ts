import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { users, type User, type NewUser } from '../../database/schema/users';
import { hashOneTimeToken } from '../../shared/crypto/one-time-token';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findProfileById(id: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        mfaEnabledAt: users.mfaEnabledAt,
        emailVerifiedAt: users.emailVerifiedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, hashOneTimeToken(token)))
      .limit(1);
    return user ?? null;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, hashOneTimeToken(token)))
      .limit(1);
    return user ?? null;
  }

  async create(
    data: Pick<NewUser, 'email' | 'passwordHash' | 'firstName' | 'lastName'> & {
      emailVerificationToken?: string;
      emailVerificationExpiresAt?: Date;
    },
  ): Promise<User> {
    const { emailVerificationToken, ...rest } = data;
    const [user] = await this.db
      .insert(users)
      .values({
        ...rest,
        email: data.email.toLowerCase(),
        // Raw token goes out by e-mail; only its hash is persisted.
        ...(emailVerificationToken
          ? { emailVerificationToken: hashOneTimeToken(emailVerificationToken) }
          : {}),
      })
      .returning();
    return user!;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordResetToken: hashOneTimeToken(token),
        passwordResetExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async setMfaSecret(userId: string, secret: string): Promise<void> {
    await this.db
      .update(users)
      .set({ mfaSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async enableMfa(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ mfaEnabledAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async disableMfa(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ mfaEnabledAt: null, mfaSecret: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; locale?: string; timezone?: string },
  ): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user!;
  }
}
