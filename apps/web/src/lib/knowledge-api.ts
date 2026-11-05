import { api } from './api';

export type KnowledgeSourceType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'csv'
  | 'txt'
  | 'html'
  | 'url'
  | 'faq'
  | 'typed';
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'outdated';

export interface KnowledgeSource {
  id: string;
  tenantId: string;
  agentId: string | null;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  storageKey: string | null;
  url: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  tags: string[];
  language: string | null;
  priority: number;
  processingError: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const knowledgeApi = {
  list: (tenantId: string, agentId?: string) => {
    const params = agentId ? `?agentId=${agentId}` : '';
    return api.get<KnowledgeSource[]>(`/tenants/${tenantId}/knowledge${params}`);
  },

  get: (tenantId: string, sourceId: string) =>
    api.get<KnowledgeSource>(`/tenants/${tenantId}/knowledge/${sourceId}`),

  upload: (
    tenantId: string,
    file: File,
    opts?: { name?: string; agentId?: string; tags?: string[] },
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (opts?.name) form.append('name', opts.name);
    if (opts?.agentId) form.append('agentId', opts.agentId);
    if (opts?.tags?.length) opts.tags.forEach((t) => form.append('tags[]', t));
    return api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createTyped: (tenantId: string, data: { name: string; content: string; agentId?: string }) =>
    api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/typed`, data),

  retry: (tenantId: string, sourceId: string) =>
    api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/${sourceId}/retry`),

  remove: (tenantId: string, sourceId: string) =>
    api.delete(`/tenants/${tenantId}/knowledge/${sourceId}`),
};
