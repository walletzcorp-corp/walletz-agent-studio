'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../../hooks/use-auth';
import { agentsApi, type Agent, type AgentRelease, type ToolPermission } from '../../../../lib/agents-api';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge, Skeleton,
} from '@walletz/ui';
import {
  ChevronLeft, Bot, Play, Pause, RotateCcw, Save, Tag,
  Clock, Wrench, AlertTriangle,
} from 'lucide-react';

const STATUS_BADGE = {
  draft: { variant: 'secondary' as const, label: 'Rascunho' },
  testing: { variant: 'warning' as const, label: 'Em teste' },
  published: { variant: 'success' as const, label: 'Ativo' },
  paused: { variant: 'outline' as const, label: 'Pausado' },
  archived: { variant: 'destructive' as const, label: 'Arquivado' },
};

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'empathetic', label: 'Empático' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
];

const AVAILABLE_TOOLS = [
  { name: 'schedule_appointment', label: 'Agendar compromissos', category: 'Calendário' },
  { name: 'cancel_appointment', label: 'Cancelar compromissos', category: 'Calendário' },
  { name: 'check_availability', label: 'Verificar disponibilidade', category: 'Calendário' },
  { name: 'send_message', label: 'Enviar mensagem proativa', category: 'Mensagens' },
  { name: 'lookup_contact', label: 'Consultar dados do contato', category: 'CRM' },
  { name: 'update_contact', label: 'Atualizar dados do contato', category: 'CRM' },
  { name: 'search_knowledge', label: 'Buscar na base de conhecimento', category: 'Conhecimento' },
  { name: 'create_ticket', label: 'Abrir ticket de suporte', category: 'Suporte' },
  { name: 'check_order_status', label: 'Consultar status de pedido', category: 'Pedidos' },
  { name: 'generate_quote', label: 'Gerar proposta/orçamento', category: 'Vendas' },
  { name: 'transfer_to_human', label: 'Transferir para humano', category: 'Handoff' },
];

const editSchema = z.object({
  name: z.string().min(2).max(80),
  title: z.string().max(120).optional(),
  objective: z.string().max(500).optional(),
  tone: z.string(),
  language: z.string(),
  personaDescription: z.string().max(500).optional(),
});
type EditForm = z.infer<typeof editSchema>;

type Tab = 'overview' | 'releases' | 'tools';

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { tenantId } = useAuth();
  const router = useRouter();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [releases, setReleases] = useState<AgentRelease[]>([]);
  const [toolPerms, setToolPerms] = useState<ToolPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const load = async () => {
    if (!tenantId || !agentId) return;
    try {
      const [agentRes, releasesRes, toolsRes] = await Promise.all([
        agentsApi.get(tenantId, agentId),
        agentsApi.releases(tenantId, agentId),
        agentsApi.toolPermissions(tenantId, agentId),
      ]);
      setAgent(agentRes.data);
      setReleases(releasesRes.data);
      setToolPerms(toolsRes.data);

      const a = agentRes.data;
      form.reset({
        name: a.name,
        title: a.title ?? '',
        objective: a.objective ?? '',
        tone: a.tone,
        language: a.language,
        personaDescription: (a.persona as { description?: string })?.description ?? '',
      });
    } catch {
      setActionError('Erro ao carregar agente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tenantId, agentId]);

  const handleSave = async (values: EditForm) => {
    if (!tenantId || !agentId) return;
    setSaving(true);
    setActionError(null);
    try {
      await agentsApi.update(tenantId, agentId, {
        name: values.name,
        title: values.title || undefined,
        objective: values.objective || undefined,
        tone: values.tone,
        language: values.language,
        persona: values.personaDescription ? { description: values.personaDescription } : undefined,
      } as Partial<Agent>);
      await load();
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionError(msg ?? 'Erro ao salvar agente');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!tenantId || !agentId) return;
    setPublishing(true);
    setActionError(null);
    try {
      await agentsApi.publish(tenantId, agentId);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionError(msg ?? 'Erro ao publicar agente');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggle = async () => {
    if (!tenantId || !agentId || !agent) return;
    try {
      if (agent.status === 'published') {
        await agentsApi.pause(tenantId, agentId);
      } else if (agent.status === 'paused') {
        await agentsApi.resume(tenantId, agentId);
      }
      await load();
    } catch { /* ignored */ }
  };

  const handleToolToggle = async (toolName: string, currentAllowed: boolean) => {
    if (!tenantId || !agentId) return;
    try {
      await agentsApi.setToolPermission(tenantId, agentId, {
        toolName,
        allowed: !currentAllowed,
      });
      const { data } = await agentsApi.toolPermissions(tenantId, agentId);
      setToolPerms(data);
    } catch { /* ignored */ }
  };

  const handleRollback = async (releaseId: string) => {
    if (!tenantId || !agentId) return;
    try {
      await agentsApi.releases(tenantId, agentId); // verify access
      await agentsApi.publish(tenantId, agentId); // noop — real rollback goes here
      // In production the API has POST /releases/:releaseId/rollback
      // For now trigger via direct fetch since the SDK method isn't typed for it
      const { api } = await import('../../../../lib/api');
      await api.post(`/tenants/${tenantId}/agents/${agentId}/releases/${releaseId}/rollback`);
      await load();
    } catch { /* ignored */ }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Agente não encontrado.</p>
        <Button variant="ghost" onClick={() => router.push('/agentes')} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[agent.status] ?? STATUS_BADGE.draft;
  const isPublished = agent.status === 'published';
  const isPaused = agent.status === 'paused';
  const isDraft = agent.status === 'draft' || agent.status === 'testing';
  const isArchived = agent.status === 'archived';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push('/agentes')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Meus Agentes
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{agent.name}</h1>
              {agent.title && <p className="text-sm text-muted-foreground">{agent.title}</p>}
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>

        {!isArchived && (
          <div className="flex items-center gap-2 shrink-0">
            {isDraft && (
              <Button onClick={handlePublish} disabled={publishing} size="sm">
                {publishing ? 'Publicando...' : 'Publicar'}
              </Button>
            )}
            {(isPublished || isPaused) && (
              <Button variant="outline" size="sm" onClick={handleToggle}>
                {isPublished ? (
                  <><Pause className="h-3.5 w-3.5" />Pausar</>
                ) : (
                  <><Play className="h-3.5 w-3.5" />Ativar</>
                )}
              </Button>
            )}
            {!isPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {isPublished && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 text-sm text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-amber-700 dark:text-amber-400">
            Agente publicado não pode ser editado diretamente. Pause primeiro ou crie uma nova release.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { id: 'overview', label: 'Visão Geral', icon: Bot },
          { id: 'releases', label: `Releases (${releases.length})`, icon: Tag },
          { id: 'tools', label: 'Ferramentas', icon: Wrench },
        ] as { id: Tab; label: string; icon: React.FC<{ className?: string }> }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Overview / Edit */}
      {tab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Nome interno <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Título exibido</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      {...form.register('title')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Objetivo</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    {...form.register('objective')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tom</label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      {...form.register('tone')}
                    >
                      {TONES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Idioma</label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      {...form.register('language')}
                    >
                      <option value="pt-BR">Português (BR)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Persona</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    {...form.register('personaDescription')}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</dt>
                    <dd className="mt-1 text-sm">{agent.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título</dt>
                    <dd className="mt-1 text-sm">{agent.title ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tom</dt>
                    <dd className="mt-1 text-sm">{TONES.find((t) => t.value === agent.tone)?.label ?? agent.tone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Idioma</dt>
                    <dd className="mt-1 text-sm">{agent.language}</dd>
                  </div>
                </div>
                {agent.objective && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objetivo</dt>
                    <dd className="mt-1 text-sm">{agent.objective}</dd>
                  </div>
                )}
                {(agent.persona as { description?: string })?.description && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Persona</dt>
                    <dd className="mt-1 text-sm">{(agent.persona as { description?: string }).description}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Releases */}
      {tab === 'releases' && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Releases</CardTitle>
          </CardHeader>
          <CardContent>
            {releases.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma release publicada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {releases.map((release) => {
                  const isCurrent = release.id === agent.currentReleaseId;
                  return (
                    <div
                      key={release.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                        isCurrent ? 'border-primary/50 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          v{release.version}
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            Versão {release.version}
                            {isCurrent && <Badge variant="success" className="text-xs">Atual</Badge>}
                            {release.rolledBackAt && <Badge variant="secondary" className="text-xs">Revertida</Badge>}
                          </p>
                          {release.publishedAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {new Date(release.publishedAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      {!isCurrent && !release.rolledBackAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(release.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reverter
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Tools */}
      {tab === 'tools' && (
        <Card>
          <CardHeader>
            <CardTitle>Permissões de Ferramentas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Controle quais ferramentas este agente pode executar.
            </p>
            <div className="space-y-2">
              {Object.entries(
                AVAILABLE_TOOLS.reduce<Record<string, typeof AVAILABLE_TOOLS>>((acc, tool) => {
                  (acc[tool.category] = acc[tool.category] ?? []).push(tool);
                  return acc;
                }, {}),
              ).map(([category, tools]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {category}
                  </p>
                  <div className="space-y-1">
                    {tools.map((tool) => {
                      const perm = toolPerms.find((p) => p.toolName === tool.name);
                      const allowed = perm?.allowed ?? false;
                      return (
                        <label
                          key={tool.name}
                          className="flex items-center justify-between rounded-lg border border-border px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors"
                        >
                          <span className="text-sm">{tool.label}</span>
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={() => handleToolToggle(tool.name, allowed)}
                            className="h-4 w-4 rounded border-input accent-primary"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
