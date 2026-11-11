import { api } from './api';

export type KnowledgeItemType = 'fact' | 'guidance' | 'procedure' | 'permission' | 'example';

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  agentId: string | null;
  type: KnowledgeItemType;
  content: string;
  context: string | null;
  confidence: number;
  tags: string[];
  validUntil: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const teachApi = {
  list: (tenantId: string, params?: { type?: string; agentId?: string; approved?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.agentId) qs.set('agentId', params.agentId);
    if (params?.approved !== undefined) qs.set('approved', String(params.approved));
    const q = qs.toString();
    return api.get<KnowledgeItem[]>(`/tenants/${tenantId}/teach${q ? `?${q}` : ''}`);
  },

  get: (tenantId: string, itemId: string) =>
    api.get<KnowledgeItem>(`/tenants/${tenantId}/teach/${itemId}`),

  create: (tenantId: string, data: {
    type: KnowledgeItemType;
    content: string;
    context?: string | undefined;
    agentId?: string | undefined;
    confidence?: number | undefined;
    tags?: string[] | undefined;
    validUntil?: string | undefined;
  }) => api.post<KnowledgeItem>(`/tenants/${tenantId}/teach`, data),

  update: (tenantId: string, itemId: string, data: {
    content?: string | undefined;
    context?: string | undefined;
    confidence?: number | undefined;
    tags?: string[] | undefined;
  }) => api.patch<KnowledgeItem>(`/tenants/${tenantId}/teach/${itemId}`, data),

  approve: (tenantId: string, itemId: string) =>
    api.post<KnowledgeItem>(`/tenants/${tenantId}/teach/${itemId}/approve`),

  revokeApproval: (tenantId: string, itemId: string) =>
    api.post<KnowledgeItem>(`/tenants/${tenantId}/teach/${itemId}/revoke-approval`),

  remove: (tenantId: string, itemId: string) =>
    api.delete(`/tenants/${tenantId}/teach/${itemId}`),
};
