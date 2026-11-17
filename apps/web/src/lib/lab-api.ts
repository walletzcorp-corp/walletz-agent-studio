import { api } from './api';

export interface LabConversationSummary {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
  lastMessage: string | null;
}

export interface LabMessageView {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  traceId: string | null;
  retrievedChunks: Array<{ content: string; source: string }> | null;
  toolCallsExecuted: string[] | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface LabConversationView {
  id: string;
  agentId: string;
  agentName: string;
  agentVersion: string | null;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
  messages: LabMessageView[];
}

export interface LabChatResponse {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  retrievedChunks: Array<{ content: string; source: string }>;
  toolCallsExecuted?: string[];
  labConversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export const labApi = {
  createConversation: (tenantId: string, agentId: string, title?: string) =>
    api.post<LabConversationView>(`/tenants/${tenantId}/lab/conversations`, { agentId, title }),

  listConversations: (tenantId: string, agentId?: string, limit = 20) =>
    api.get<LabConversationSummary[]>(`/tenants/${tenantId}/lab/conversations`, {
      params: { agentId, limit },
    }),

  getLatestConversation: (tenantId: string, agentId: string) =>
    api.get<LabConversationView | null>(`/tenants/${tenantId}/lab/conversations/latest`, {
      params: { agentId },
    }),

  getConversation: (tenantId: string, conversationId: string) =>
    api.get<LabConversationView>(`/tenants/${tenantId}/lab/conversations/${conversationId}`),

  updateConversation: (tenantId: string, conversationId: string, title: string) =>
    api.patch<LabConversationView>(`/tenants/${tenantId}/lab/conversations/${conversationId}`, { title }),

  deleteConversation: (tenantId: string, conversationId: string) =>
    api.delete(`/tenants/${tenantId}/lab/conversations/${conversationId}`),

  chat: (
    tenantId: string,
    agentId: string,
    message: string,
    labConversationId?: string,
  ) =>
    api.post<LabChatResponse>(`/tenants/${tenantId}/lab/chat`, {
      agentId,
      message,
      labConversationId,
    }),
};
