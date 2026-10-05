import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';

@Module({
  imports: [RbacModule],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
