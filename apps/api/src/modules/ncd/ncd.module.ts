import { Module } from '@nestjs/common';
import { NcdService } from './services/ncd.service';
import { NcdController } from './ncd.controller';

@Module({ providers: [NcdService], controllers: [NcdController] })
export class NcdModule {}
