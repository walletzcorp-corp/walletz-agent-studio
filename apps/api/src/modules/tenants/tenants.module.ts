import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { FeatureFlagsService } from './feature-flags.service';
import { QuotaService } from './quota.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { RbacModule } from '../../shared/rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [TenantsController],
  providers: [TenantsService, FeatureFlagsService, QuotaService, TenantContextMiddleware],
  exports: [TenantsService, FeatureFlagsService, QuotaService],
})
export class TenantsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes({ path: 'v1/*', method: RequestMethod.ALL });
  }
}
