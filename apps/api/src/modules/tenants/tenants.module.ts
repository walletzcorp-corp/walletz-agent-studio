import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { RbacModule } from '../../shared/rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantContextMiddleware],
  exports: [TenantsService],
})
export class TenantsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes({ path: 'v1/*', method: RequestMethod.ALL });
  }
}
