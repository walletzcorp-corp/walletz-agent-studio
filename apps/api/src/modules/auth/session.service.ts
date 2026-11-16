import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { createHash } from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { sessions, type Session } from '../../database/schema/users';
import { createId } from '../../database/utils/id';

@Injectable()
export class SessionService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async create(params: {
    userId: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [session] = await this.db
      .insert(sessions)
      .values({
        id: createId(),
        userId: params.userId,
        tenantId: params.tenantId ?? null,
        refreshTokenHash: 'pending',
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        expiresAt,
      })
      .returning();

    return session!;
  }

  async findById(id: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return session ?? null;
  }

  async updateRefreshTokenHash(sessionId: string, refreshToken: string): Promise<void> {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.db
      .update(sessions)
      .set({ refreshTokenHash: hash, lastSeenAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async verifyRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session) return false;
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    return hash === session.refreshTokenHash;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId)));
  }
}
