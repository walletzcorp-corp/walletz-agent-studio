import { z } from 'zod';

export const AgentTemplateEnum = z.enum([
  'sdr',
  'commercial',
  'reception_scheduling',
  'customer_service',
  'post_sale',
  'collection',
  'faq',
  'custom',
]);

export const AgentStatusEnum = z.enum(['draft', 'testing', 'published', 'paused', 'archived']);

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  template: AgentTemplateEnum.default('custom'),
  objective: z.string().max(500).optional(),
  language: z.string().default('pt-BR'),
  tone: z.string().default('professional'),
});

export type AgentTemplate = z.infer<typeof AgentTemplateEnum>;
export type AgentStatus = z.infer<typeof AgentStatusEnum>;
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
