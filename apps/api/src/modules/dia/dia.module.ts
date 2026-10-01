import { Module } from '@nestjs/common';
import { DiaService } from './services/dia.service';
import { DiaController } from './dia.controller';

@Module({ providers: [DiaService], controllers: [DiaController] })
export class DiaModule {}
