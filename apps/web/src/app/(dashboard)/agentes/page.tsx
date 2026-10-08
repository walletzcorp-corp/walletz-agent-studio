'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../lib/agents-api';
import { Button, Badge, Skeleton } from '@walletz/ui';
import {
  Plus, Bot, Settings, Play, Pause, ChevronRight,
  Radar, PhoneIncoming, PhoneOutgoing, Filter, Briefcase,
  RefreshCw, UserCheck, Calendar, Heart, Star,
} from 'lucide-react';

// ── Category config ───────────────────────────────────────────────────────────

interface Category {
  id: string;
  label: string;
  templates: string[];
  color: string;
  bgColor: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'INTELIGÊNCIA',
    label: 'Inteligência',
    templates: ['radar_editais'],
    color: 'text-[#8B5CF6]',
    bgColor: 'bg-[#8B5CF6]/10',
  },
  {
    id: 'COMERCIAL',
    label: 'Comercial',
    templates: ['sdr', 'sdr_inbound', 'sdr_outbound', 'pre_qualifier', 'commercial', 'commercial_consultant', 'followup_commercial'],
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/10',
  },
  {
    id: 'ATENDIMENTO',
    label: 'Atendimento',
    templates: ['reception', 'reception_scheduling', 'customer_service', 'customer_success_cs', 'faq', 'collection'],
    color: 'text-[#10B981]',
    bgColor: 'bg-[#10B981]/10',
  },
  {
    id: 'PRODUTIVIDADE',
    label: 'Produtividade',
    templates: ['executive_assistant', 'agenda_ai', 'post_sale'],
    color: 'text-[#3B82F6]',
    bgColor: 'bg-[#3B82F6]/10',
  },
  {
    id: 'OUTROS',
    label: 'Outros',
    templates: ['custom'],
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
];

// ── Template icons + labels ───────────────────────────────────────────────────

const TEMPLATE_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  radar_editais:        { label: 'Radar Editais',       Icon: Radar },
  reception:            { label: 'Recepção',             Icon: PhoneIncoming },
  reception_scheduling: { label: 'Recepção/Agenda',      Icon: PhoneIncoming },
  sdr:                  { label: 'SDR',                  Icon: Star },
  sdr_inbound:          { label: 'SDR Inbound',          Icon: PhoneIncoming },
  sdr_outbound:         { label: 'SDR Outbound',         Icon: PhoneOutgoing },
  pre_qualifier:        { label: 'Pré-Qualificador',     Icon: Filter },
  commercial:           { label: 'Comercial',            Icon: Briefcase },
  commercial_consultant:{ label: 'Consultor Comercial',  Icon: Briefcase },
  followup_commercial:  { label: 'Follow-up',            Icon: RefreshCw },
  customer_service:     { label: 'Atendimento',          Icon: UserCheck },
  customer_success_cs:  { label: 'Customer Success',     Icon: Heart },
  executive_assistant:  { label: 'Assistente Executivo', Icon: Bot },
  agenda_ai:            { label: 'Agenda AI',            Icon: Calendar },
  post_sale:            { label: 'Pós-venda',            Icon: Star },
  faq:                  { label: 'FAQ',                  Icon: Bot },
  collection:           { label: 'Cobrança',             Icon: Bot },
  custom:               { label: 'Personalizado',        Icon: Bot },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Rascunho',  className: 'bg-muted text-muted-foreground' },
  testing:   { label: 'Em teste',  className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Ativo',     className: 'bg-green-100 text-green-700' },
  paused:    { label: 'Pausado',   className: 'bg-gray-100 text-gray-600' },
  archived:  { label: 'Arquivado', className: 'bg-red-100 text-red-700' },
};

function getCategoryForTemplate(template: string): Category {
  return CATEGORIES.find(c => c.templates.includes(template)) ?? CATEGORIES[CATEGORIES.length - 1]!;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await agentsApi.list(tenantId);
      setAgents(data);
    } catch {
      setError('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const handleToggle = async (agent: Agent) => {
    if (!tenantId) return;
    try {
      if (agent.status === 'published') {
        await agentsApi.pause(tenantId, agent.id);
      } else if (agent.status === 'paused') {
        await agentsApi.resume(tenantId, agent.id);
      }
      await load();
    } catch { /* silent */ }
  };

  // Group agents by category
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    agents: agents.filter(a => cat.templates.includes(a.template)),
  })).filter(g => g.agents.length > 0);

  // Stats
  const totalActive = agents.filter(a => a.status === 'published').length;
  const totalTesting = agents.filter(a => a.status === 'testing').length;

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Meus Agentes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '…' : `${agents.length} agentes • ${totalActive} ativos • ${totalTesting} em teste`}
          </p>
        </div>
        <Link href="/agentes/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Agente
          </Button>
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-44" />)}
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="neural-card flex flex-col items-center gap-4 py-16 text-center">
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
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ category, agents: catAgents }) => (
            <section key={category.id}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-2 w-2 rounded-full ${category.bgColor.replace('/10', '')}`} />
                <h2 className={`text-xs font-bold uppercase tracking-widest ${category.color}`}>
                  {category.label}
                </h2>
                <span className="text-xs text-muted-foreground ml-1">({catAgents.length})</span>
              </div>

              {/* Agent cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    category={category}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  category,
  onToggle,
}: {
  agent: Agent;
  category: Category;
  onToggle: (a: Agent) => void;
}) {
  const meta = TEMPLATE_META[agent.template] ?? TEMPLATE_META.custom!;
  const Icon = meta.Icon;
  const statusInfo = STATUS_BADGE[agent.status] ?? STATUS_BADGE.draft!;

  return (
    <div className="neural-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-all group">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.bgColor}`}>
            <Icon className={`h-5 w-5 ${category.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{agent.name}</p>
            {agent.title && (
              <p className="text-xs text-muted-foreground truncate">{agent.title}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Template badge */}
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border border-border ${category.color}`}>
          {meta.label}
        </span>
        <span className="text-[10px] text-muted-foreground">{agent.language ?? 'pt-BR'}</span>
      </div>

      {/* Objective */}
      {agent.objective && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {agent.objective}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border/50 pt-3 mt-auto">
        <Link href={`/agentes/${agent.id}`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
            <Settings className="h-3 w-3" />
            Configurar
          </button>
        </Link>
        {(agent.status === 'published' || agent.status === 'paused') && (
          <button
            onClick={() => onToggle(agent)}
            title={agent.status === 'published' ? 'Pausar' : 'Ativar'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            {agent.status === 'published' ? (
              <Pause className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Play className="h-3.5 w-3.5 text-primary" />
            )}
          </button>
        )}
        <Link href={`/agentes/${agent.id}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </Link>
      </div>
    </div>
  );
}
