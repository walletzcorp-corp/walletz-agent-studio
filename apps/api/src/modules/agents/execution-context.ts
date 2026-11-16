export type ExecutionChannel = 'lab' | 'whatsapp';

/**
 * internal_user    - an authenticated member of the tenant (e.g. testing in the lab)
 * external_contact - an unauthenticated third party writing through a channel (WhatsApp)
 */
export type ExecutionSource = 'internal_user' | 'external_contact';

/**
 * Immutable, server-built context for every agent run and tool call.
 * Neither the LLM nor any tool input can modify it: tools receive this object and never
 * accept tenant / contact / conversation identifiers as arguments.
 */
export interface AgentExecutionContext {
  readonly tenantId: string;
  readonly agentId: string;
  readonly channel: ExecutionChannel;
  readonly source: ExecutionSource;
  readonly userId?: string;
  readonly conversationId?: string;
  readonly contactId?: string;
}

export function createExecutionContext(input: {
  tenantId: string;
  agentId: string;
  channel: ExecutionChannel;
  source: ExecutionSource;
  userId?: string;
  conversationId?: string;
  contactId?: string;
}): AgentExecutionContext {
  if (!input.tenantId || !input.agentId) {
    throw new Error('Execution context requires tenantId and agentId');
  }
  if (input.source === 'external_contact' && (!input.contactId || !input.conversationId)) {
    throw new Error('External contact executions require contactId and conversationId');
  }
  if (input.source === 'internal_user' && !input.userId) {
    throw new Error('Internal user executions require userId');
  }
  return Object.freeze({ ...input });
}
