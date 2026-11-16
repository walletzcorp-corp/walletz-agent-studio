import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LabChatResponse {
  conversationId: string;
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  retrievedChunks: Array<{ content: string; source: string }>;
}

export interface LabConversationSummary {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface LabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: {
    traceId?: string;
    inputTokens?: number;
    outputTokens?: number;
    retrievedChunks?: Array<{ content: string; source: string }>;
    error?: string;
  };
  createdAt: string;
}

export interface LabConversationDetail extends LabConversationSummary {
  messages: LabMessage[];
}

export const labApi = {
  listConversations: (tenantId: string) =>
    api.get<LabConversationSummary[]>(`/tenants/${tenantId}/lab/conversations`),

  getConversation: (tenantId: string, conversationId: string) =>
    api.get<LabConversationDetail>(`/tenants/${tenantId}/lab/conversations/${conversationId}`),

  createConversation: (tenantId: string, agentId: string) =>
    api.post<{ id: string }>(`/tenants/${tenantId}/lab/conversations`, { agentId }),

  renameConversation: (tenantId: string, conversationId: string, title: string) =>
    api.patch(`/tenants/${tenantId}/lab/conversations/${conversationId}/title`, { title }),

  deleteConversation: (tenantId: string, conversationId: string) =>
    api.delete(`/tenants/${tenantId}/lab/conversations/${conversationId}`),

  chat: (
    tenantId: string,
    agentId: string,
    message: string,
    conversationId?: string,
  ) =>
    api.post<LabChatResponse>(`/tenants/${tenantId}/lab/chat`, {
      agentId,
      message,
      conversationId,
    }),
};
