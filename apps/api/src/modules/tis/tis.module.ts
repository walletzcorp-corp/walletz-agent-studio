import { Module } from '@nestjs/common';
import { TisService } from './services/tis.service';
import { TisController } from './tis.controller';

@Module({
  providers: [TisService],
  controllers: [TisController],
  exports: [TisService],
})
export class TisModule {}
