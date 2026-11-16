import { Module } from '@nestjs/common';
import { PcConnectorService } from './pc-connector.service';
import {
  PcConnectorTenantController,
  PcConnectorPublicController,
} from './pc-connector.controller';
import { DatabaseModule } from '../../database/database.module';
import { RbacModule } from '../../shared/rbac/rbac.module';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [PcConnectorTenantController, PcConnectorPublicController],
  providers: [PcConnectorService],
  exports: [PcConnectorService],
})
export class PcConnectorModule {}
