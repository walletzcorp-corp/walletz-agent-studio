import { api } from './api';

export type KnowledgeSourceType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'html' | 'url' | 'faq' | 'typed';
/** uploaded → processing → indexing → ready | failed (UPLOADING existe só durante o envio). */
export type KnowledgeSourceStatus = 'uploaded' | 'processing' | 'indexing' | 'ready' | 'failed' | 'outdated';
export type KnowledgeIndexStatus = 'pending' | 'indexed' | 'awaiting_ai' | 'failed';

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
  extension: string | null;
  fileSizeBytes: number | null;
  tags: string[];
  language: string | null;
  priority: number;
  processingError: string | null;
  processedAt: string | null;
  indexStatus: KnowledgeIndexStatus;
  indexError: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** true quando o mesmo arquivo (SHA-256) já existia nesta organização. */
  duplicate?: boolean;
}

export interface KnowledgeSourceDetails extends KnowledgeSource {
  chunks: number;
  embeddedChunks: number;
  extractedCharacters: number;
  preview: Array<{ chunkIndex: number; content: string }>;
}

export interface KnowledgeFormats {
  formats: Array<{ extension: string; label: string }>;
  maxFileBytes: number;
}

export const knowledgeApi = {
  formats: (tenantId: string) => api.get<KnowledgeFormats>(`/tenants/${tenantId}/knowledge/formats`),

  list: (tenantId: string, agentId?: string) =>
    api.get<KnowledgeSource[]>(`/tenants/${tenantId}/knowledge`, { params: agentId ? { agentId } : {} }),

  get: (tenantId: string, sourceId: string) =>
    api.get<KnowledgeSourceDetails>(`/tenants/${tenantId}/knowledge/${sourceId}`),

  upload: (
    tenantId: string,
    file: File,
    opts: { agentId?: string | null; onProgress?: (percent: number) => void } = {},
  ) => {
    const form = new FormData();
    form.append('file', file);
    if (opts.agentId) form.append('agentId', opts.agentId);
    return api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (opts.onProgress && e.total) opts.onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },

  createTyped: (tenantId: string, data: { name: string; content: string; agentId?: string; context?: string }) =>
    api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/typed`, data),

  setAgent: (tenantId: string, sourceId: string, agentId: string | null) =>
    api.patch<KnowledgeSource>(`/tenants/${tenantId}/knowledge/${sourceId}/agent`, { agentId }),

  retry: (tenantId: string, sourceId: string) =>
    api.post<KnowledgeSource>(`/tenants/${tenantId}/knowledge/${sourceId}/retry`),

  remove: (tenantId: string, sourceId: string) => api.delete(`/tenants/${tenantId}/knowledge/${sourceId}`),

  /** Baixa o original (com o token de login) e dispara o download no navegador. */
  download: async (tenantId: string, source: Pick<KnowledgeSource, 'id' | 'name' | 'extension'>) => {
    const res = await api.get<Blob>(`/tenants/${tenantId}/knowledge/${source.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    const ext = source.extension ? `.${source.extension}` : '';
    a.href = url;
    a.download = source.name.toLowerCase().endsWith(ext) ? source.name : `${source.name}${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
