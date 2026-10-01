import { Module } from '@nestjs/common';
import { FinanceiroService } from './services/financeiro.service';
import { FinanceiroController } from './financeiro.controller';

@Module({
  providers: [FinanceiroService],
  controllers: [FinanceiroController],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
