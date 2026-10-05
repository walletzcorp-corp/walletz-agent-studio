import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { TeachController } from './teach.controller';
import { TeachService } from './teach.service';
import { TeachRepository } from './teach.repository';

@Module({
  imports: [RbacModule],
  controllers: [TeachController],
  providers: [TeachService, TeachRepository],
  exports: [TeachService],
})
export class TeachModule {}
