import { Module } from '@nestjs/common';
import { RbacGuard } from './rbac.guard';
import { PermissionsService } from './permissions.service';

@Module({
  providers: [RbacGuard, PermissionsService],
  exports: [RbacGuard, PermissionsService],
})
export class RbacModule {}
