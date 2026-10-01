import { Module } from '@nestjs/common';
import { MigService } from './services/mig.service';
import { MigController } from './mig.controller';

@Module({ providers: [MigService], controllers: [MigController] })
export class MigModule {}
