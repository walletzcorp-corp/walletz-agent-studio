import { Module } from '@nestjs/common';
import { TelService } from './services/tel.service';
import { TelController } from './tel.controller';
import { TelPublicController } from './tel-public.controller';

@Module({ providers: [TelService], controllers: [TelController, TelPublicController] })
export class TelModule {}
