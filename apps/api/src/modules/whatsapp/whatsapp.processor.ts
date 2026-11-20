import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WhatsappService } from './whatsapp.service';
import { WHATSAPP_INBOUND_QUEUE, type WhatsappInboundJobData } from './whatsapp.queue';

/** Eventos HTTP são confirmados após persistência na fila; este worker executa a IA e registra falhas. */
@Processor(WHATSAPP_INBOUND_QUEUE)
export class WhatsappInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappInboundProcessor.name);

  constructor(private readonly whatsapp: WhatsappService) { super(); }

  async process(job: Job<WhatsappInboundJobData>): Promise<void> {
    try {
      await this.whatsapp.processQueuedInbound(job.data);
      this.logger.log(`Concluído job WhatsApp=${job.id} tentativa=${job.attemptsMade + 1}`);
    } catch (err) {
      const safeMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha job WhatsApp=${job.id} tentativa=${job.attemptsMade + 1}: ${safeMessage}`);
      throw err;
    }
  }
}
