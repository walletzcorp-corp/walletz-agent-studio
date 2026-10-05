import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LabChatResponse {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  retrievedChunks: Array<{ content: string; source: string }>;
}

export const labApi = {
  chat: (
    tenantId: string,
    agentId: string,
    message: string,
    history?: ChatMessage[],
  ) =>
    api.post<LabChatResponse>(`/tenants/${tenantId}/lab/chat`, {
      agentId,
      message,
      history,
    }),
};
