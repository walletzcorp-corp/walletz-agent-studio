import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { AiProvidersController } from './ai-providers.controller';
import { AiProvidersService } from './ai-providers.service';

@Module({
  imports: [RbacModule],
  controllers: [AiProvidersController],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
