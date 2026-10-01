import { Module } from '@nestjs/common';
import { IaService } from './services/ia.service';
import { IaController } from './ia.controller';

@Module({
  providers: [IaService],
  controllers: [IaController],
  exports: [IaService],
})
export class IaModule {}
