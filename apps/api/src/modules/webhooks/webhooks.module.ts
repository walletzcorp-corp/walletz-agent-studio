import { Global, Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

/** Global: qualquer módulo pode emitir eventos (WebhooksService.emit). */
@Global()
@Module({
  imports: [RbacModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
