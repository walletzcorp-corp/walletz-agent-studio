import { Module } from '@nestjs/common';
import { EngService } from './services/eng.service';
import { EngController } from './eng.controller';

@Module({ providers: [EngService], controllers: [EngController] })
export class EngModule {}
