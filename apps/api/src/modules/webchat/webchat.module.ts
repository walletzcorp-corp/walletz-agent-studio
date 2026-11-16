import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { LabModule } from '../lab/lab.module';
import { WebchatAdminController, WebchatPublicController } from './webchat.controller';
import { WebchatService } from './webchat.service';

@Module({
  imports: [RbacModule, LabModule],
  controllers: [WebchatAdminController, WebchatPublicController],
  providers: [WebchatService],
})
export class WebchatModule {}
