import { Module } from '@nestjs/common';
import { TelService } from './services/tel.service';
import { TelController } from './tel.controller';

@Module({ providers: [TelService], controllers: [TelController] })
export class TelModule {}
