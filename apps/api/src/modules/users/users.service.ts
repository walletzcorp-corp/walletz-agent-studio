import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { users, type User, type NewUser } from '../../database/schema/users';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async create(data: Pick<NewUser, 'email' | 'passwordHash' | 'firstName' | 'lastName'>): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return user!;
  }
}
