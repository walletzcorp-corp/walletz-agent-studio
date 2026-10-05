import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants, type Tenant, type NewTenant } from '../../database/schema/tenants';

@Injectable()
export class TenantsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return tenant ?? null;
  }

  async create(data: Pick<NewTenant, 'name' | 'slug'>): Promise<Tenant> {
    const [tenant] = await this.db.insert(tenants).values(data).returning();
    return tenant!;
  }
}
