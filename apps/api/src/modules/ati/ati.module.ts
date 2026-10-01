import { Module } from '@nestjs/common';
import { AtiService } from './services/ati.service';
import { AtiController } from './ati.controller';

@Module({
  providers: [AtiService],
  controllers: [AtiController],
  exports: [AtiService],
})
export class AtiModule {}
