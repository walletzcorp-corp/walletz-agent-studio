import { Module } from '@nestjs/common';
import { MedService } from './services/med.service';
import { MedController } from './med.controller';

@Module({
  providers: [MedService],
  controllers: [MedController],
  exports: [MedService],
})
export class MedModule {}
