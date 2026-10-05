'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../lib/agents-api';
import {
  Button, Card, CardContent, Badge, Skeleton,
} from '@walletz/ui';
import { Plus, Bot, Settings, Play, Pause, ChevronRight } from 'lucide-react';

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'; label: string }> = {
  draft: { variant: 'secondary', label: 'Rascunho' },
  testing: { variant: 'warning', label: 'Em teste' },
  published: { variant: 'success', label: 'Ativo' },
  paused: { variant: 'outline', label: 'Pausado' },
  archived: { variant: 'destructive', label: 'Arquivado' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  sdr: 'SDR',
  commercial: 'Comercial',
  reception_scheduling: 'Recepção/Agendamento',
  customer_service: 'Atendimento',
  post_sale: 'Pós-venda',
  collection: 'Cobrança',
  faq: 'FAQ',
  custom: 'Personalizado',
};

export default function AgentsPage() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!tenantId) return;
    try {
      const { data } = await agentsApi.list(tenantId);
      setAgents(data);
    } catch {
      setError('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const handleToggle = async (agent: Agent) => {
    if (!tenantId) return;
    try {
      if (agent.status === 'published') {
        await agentsApi.pause(tenantId, agent.id);
      } else if (agent.status === 'paused') {
        await agentsApi.resume(tenantId, agent.id);
      }
      await load();
    } catch { /* show error */ }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Agentes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie e gerencie seus agentes de IA
          </p>
        </div>
        <Link href="/agentes/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Agente
          </Button>
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Nenhum agente criado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro agente de IA em poucos minutos
              </p>
            </div>
            <Link href="/agentes/novo">
              <Button>
                <Plus className="h-4 w-4" />
                Criar meu primeiro agente
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const statusInfo = STATUS_BADGE[agent.status] ?? STATUS_BADGE.draft!;
            return (
              <Card key={agent.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{agent.name}</p>
                        {agent.title && (
                          <p className="text-xs text-muted-foreground truncate">{agent.title}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {TEMPLATE_LABELS[agent.template] ?? agent.template}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{agent.language}</span>
                  </div>

                  {agent.objective && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                      {agent.objective}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                    <Link href={`/agentes/${agent.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </Link>
                    {(agent.status === 'published' || agent.status === 'paused') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(agent)}
                        title={agent.status === 'published' ? 'Pausar' : 'Ativar'}
                      >
                        {agent.status === 'published' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Link href={`/agentes/${agent.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
