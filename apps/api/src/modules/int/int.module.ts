import { Module } from '@nestjs/common';
import { IntService } from './services/int.service';
import { IntController } from './int.controller';

@Module({
  providers: [IntService],
  controllers: [IntController],
  exports: [IntService],
})
export class IntModule {}
