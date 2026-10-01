import { Module } from '@nestjs/common';
import { SalService } from './services/sal.service';
import { SalController } from './sal.controller';

@Module({
  providers: [SalService],
  controllers: [SalController],
  exports: [SalService],
})
export class SalModule {}
