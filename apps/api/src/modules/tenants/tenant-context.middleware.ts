import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { TenantsService } from './tenants.service';

declare module 'express' {
  interface Request {
    tenantId?: string;
    tenant?: { id: string; slug: string; name: string };
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = req.headers['x-tenant-slug'] as string | undefined;
    if (slug) {
      const tenant = await this.tenantsService.findBySlug(slug);
      if (tenant) {
        req.tenantId = tenant.id;
        req.tenant = { id: tenant.id, slug: tenant.slug, name: tenant.name };
      }
    }
    next();
  }
}
