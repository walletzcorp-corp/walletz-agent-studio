import { Module } from '@nestjs/common';
import { CrmService } from './services/crm.service';
import { CrmController } from './crm.controller';

@Module({
  providers: [CrmService],
  controllers: [CrmController],
  exports: [CrmService],
})
export class CrmModule {}
