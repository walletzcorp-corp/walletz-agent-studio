import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [RbacModule, AuditModule],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
