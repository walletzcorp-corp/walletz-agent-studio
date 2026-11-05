import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { FeatureFlagsService } from './feature-flags.service';
import { QuotaService } from './quota.service';
import { RbacModule } from '../../shared/rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [TenantsController],
  providers: [TenantsService, FeatureFlagsService, QuotaService],
  exports: [TenantsService, FeatureFlagsService, QuotaService],
})
export class TenantsModule {}
