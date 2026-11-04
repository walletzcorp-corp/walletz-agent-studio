import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxService } from './outbox.service';
import { OutboxRelayService, OUTBOX_QUEUE } from './outbox-relay.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: OUTBOX_QUEUE })],
  providers: [OutboxService, OutboxRelayService],
  exports: [OutboxService],
})
export class OutboxModule {}
