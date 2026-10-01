import { Module } from '@nestjs/common';
import { QuaService } from './services/qua.service';
import { QuaController } from './qua.controller';

@Module({
  providers: [QuaService],
  controllers: [QuaController],
  exports: [QuaService],
})
export class QuaModule {}
