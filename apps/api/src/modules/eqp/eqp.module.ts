import { Module } from '@nestjs/common';
import { EqpService } from './services/eqp.service';
import { EqpController } from './eqp.controller';

@Module({
  providers: [EqpService],
  controllers: [EqpController],
  exports: [EqpService],
})
export class EqpModule {}
