import { Global, Module } from '@nestjs/common';
import { LlmUsageService } from './llm-usage.service';

@Global()
@Module({
  providers: [LlmUsageService],
  exports: [LlmUsageService],
})
export class LlmUsageModule {}
