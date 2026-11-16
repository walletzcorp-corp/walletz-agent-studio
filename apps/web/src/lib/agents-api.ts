import { api } from './api';

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  title: string | null;
  status: 'draft' | 'testing' | 'published' | 'paused' | 'archived';
  template: string;
  objective: string | null;
  persona: { description?: string; backstory?: string; traits?: string[] };
  tone: string;
  language: string;
  channels: string[];
  currentReleaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRelease {
  id: string;
  agentId: string;
  version: number;
  config: Record<string, unknown>;
  publishedAt: string | null;
  rolledBackAt: string | null;
}

export interface ToolPermission {
  id: string;
  toolName: string;
  allowed: boolean;
  constraints: Record<string, unknown>;
}

export const agentsApi = {
  list: (tenantId: string) => api.get<Agent[]>(`/tenants/${tenantId}/agents`),

  templates: (tenantId: string) =>
    api.get<Record<string, unknown>[]>(`/tenants/${tenantId}/agents/templates`),

  tools: (tenantId: string) =>
    api.get<{ name: string; label: string; category: string }[]>(
      `/tenants/${tenantId}/agents/tools`,
    ),

  get: (tenantId: string, agentId: string) =>
    api.get<Agent>(`/tenants/${tenantId}/agents/${agentId}`),

  create: (tenantId: string, data: Partial<Agent>) =>
    api.post<Agent>(`/tenants/${tenantId}/agents`, data),

  update: (tenantId: string, agentId: string, data: Partial<Agent>) =>
    api.patch<Agent>(`/tenants/${tenantId}/agents/${agentId}`, data),

  publish: (tenantId: string, agentId: string) =>
    api.post<AgentRelease>(`/tenants/${tenantId}/agents/${agentId}/publish`),

  pause: (tenantId: string, agentId: string) =>
    api.post(`/tenants/${tenantId}/agents/${agentId}/pause`),

  resume: (tenantId: string, agentId: string) =>
    api.post(`/tenants/${tenantId}/agents/${agentId}/resume`),

  delete: (tenantId: string, agentId: string) =>
    api.delete(`/tenants/${tenantId}/agents/${agentId}`),

  releases: (tenantId: string, agentId: string) =>
    api.get<AgentRelease[]>(`/tenants/${tenantId}/agents/${agentId}/releases`),

  toolPermissions: (tenantId: string, agentId: string) =>
    api.get<ToolPermission[]>(`/tenants/${tenantId}/agents/${agentId}/tool-permissions`),

  setToolPermission: (
    tenantId: string,
    agentId: string,
    data: { toolName: string; allowed: boolean; constraints?: Record<string, unknown> },
  ) => api.post<ToolPermission>(`/tenants/${tenantId}/agents/${agentId}/tool-permissions`, data),
};
