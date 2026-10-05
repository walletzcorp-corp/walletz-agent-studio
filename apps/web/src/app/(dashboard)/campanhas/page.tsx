'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { api } from '../../../lib/api';
import { Button, Card, CardContent, Badge } from '@walletz/ui';
import {
  Megaphone, Plus, Play, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock, XCircle, Users, ChevronRight,
} from 'lucide-react';

interface Agent { id: string; name: string }
interface Segment { id: string; name: string; contactCount: number }
interface Campaign {
  id: string;
  name: string;
  status: string;
  agentId: string | null;
  segmentId: string | null;
  templateName: string | null;
  totalTargeted: number;
  totalEligible: number;
  totalBlocked: number;
  totalSent: number;
  scheduledAt: string | null;
  createdAt: string;
}

interface EligibilityResult {
  eligible: number;
  blocked: number;
  reasons: Record<string, number>;
  sampleBlocked: Array<{ phone: string; reason: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'text-gray-500', icon: Clock },
  scheduled: { label: 'Agendada', color: 'text-blue-600', icon: Clock },
  running: { label: 'Em execução', color: 'text-green-600', icon: Play },
  paused: { label: 'Pausada', color: 'text-yellow-600', icon: AlertTriangle },
  completed: { label: 'Concluída', color: 'text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'text-gray-400', icon: XCircle },
  failed: { label: 'Erro', color: 'text-red-600', icon: AlertTriangle },
};

export default function CampanhasPage() {
  const { tenantId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewSegment, setShowNewSegment] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [campaignName, setCampaignName] = useState('');
  const [campaignAgent, setCampaignAgent] = useState('');
  const [campaignSegment, setCampaignSegment] = useState('');
  const [campaignTemplate, setCampaignTemplate] = useState('');
  const [segmentName, setSegmentName] = useState('');

  const load = async () => {
    if (!tenantId) return;
    const [c, s, a] = await Promise.allSettled([
      api.get<Campaign[]>(`/tenants/${tenantId}/campaigns`),
      api.get<Segment[]>(`/tenants/${tenantId}/segments`),
      api.get<Agent[]>(`/tenants/${tenantId}/agents`),
    ]);
    if (c.status === 'fulfilled') setCampaigns(c.value.data);
    if (s.status === 'fulfilled') setSegments(s.value.data);
    if (a.status === 'fulfilled') setAgents(a.value.data);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [tenantId]);

  const handleCreateCampaign = async () => {
    if (!tenantId || !campaignName.trim()) return;
    setError(null);
    try {
      await api.post(`/tenants/${tenantId}/campaigns`, {
        name: campaignName,
        agentId: campaignAgent || undefined,
        segmentId: campaignSegment || undefined,
        templateName: campaignTemplate || undefined,
      });
      setCampaignName(''); setCampaignAgent(''); setCampaignSegment(''); setCampaignTemplate('');
      setShowNewCampaign(false);
      await load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao criar campanha');
    }
  };

  const handleCreateSegment = async () => {
    if (!tenantId || !segmentName.trim()) return;
    try {
      await api.post(`/tenants/${tenantId}/segments`, { name: segmentName });
      setSegmentName('');
      setShowNewSegment(false);
      await load();
    } catch { /* silent */ }
  };

  const handleCheckEligibility = async (campaignId: string) => {
    if (!tenantId) return;
    setCheckingEligibility(true);
    setEligibility(null);
    setError(null);
    try {
      const { data } = await api.get<EligibilityResult>(
        `/tenants/${tenantId}/campaigns/${campaignId}/eligibility`,
      );
      setEligibility(data);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao verificar elegibilidade');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleLaunch = async (campaignId: string) => {
    if (!tenantId) return;
    setLaunching(true);
    setError(null);
    try {
      await api.post(`/tenants/${tenantId}/campaigns/${campaignId}/launch`);
      await load();
      setSelectedCampaign(null);
      setEligibility(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao lançar campanha');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Campanhas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e envie campanhas WhatsApp com consentimento verificado
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewSegment(true)}>
            <Users className="h-4 w-4" />
            Novo segmento
          </Button>
          <Button onClick={() => setShowNewCampaign(true)}>
            <Plus className="h-4 w-4" />
            Nova campanha
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* New Segment Form */}
      {showNewSegment && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-medium text-sm">Novo segmento</p>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Nome do segmento"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewSegment(false)}>Cancelar</Button>
              <Button onClick={() => void handleCreateSegment()} disabled={!segmentName.trim()}>
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segments */}
      {segments.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Segmentos</p>
          <div className="flex gap-2 flex-wrap">
            {segments.map((seg) => (
              <div key={seg.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{seg.name}</span>
                <span className="text-muted-foreground">{seg.contactCount} contatos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Campaign Form */}
      {showNewCampaign && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="font-medium">Nova campanha</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Promoção de Outubro"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Agente</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={campaignAgent}
                  onChange={(e) => setCampaignAgent(e.target.value)}
                >
                  <option value="">Selecionar agente</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Segmento</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={campaignSegment}
                  onChange={(e) => setCampaignSegment(e.target.value)}
                >
                  <option value="">Todos os contatos</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Template WhatsApp</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nome do template aprovado pela Meta"
                  value={campaignTemplate}
                  onChange={(e) => setCampaignTemplate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewCampaign(false)}>Cancelar</Button>
              <Button onClick={() => void handleCreateCampaign()} disabled={!campaignName.trim()}>
                Criar campanha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-semibold">Nenhuma campanha criada</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Crie uma campanha para enviar mensagens via WhatsApp para seus contatos.
              Apenas contatos com consentimento válido serão contactados.
            </p>
            <Button onClick={() => setShowNewCampaign(true)}>
              <Plus className="h-4 w-4" />
              Nova campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => {
            const cfg = STATUS_CONFIG[camp.status] ?? STATUS_CONFIG.draft!;
            const StatusIcon = cfg.icon;
            const isSelected = selectedCampaign?.id === camp.id;

            return (
              <Card key={camp.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{camp.name}</p>
                        <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span>{camp.totalTargeted} alvo(s)</span>
                        <span className="text-green-600">{camp.totalEligible} elegíveis</span>
                        {camp.totalBlocked > 0 && <span className="text-red-500">{camp.totalBlocked} bloqueados</span>}
                        {camp.templateName && <span>Template: {camp.templateName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {camp.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCampaign(camp);
                            void handleCheckEligibility(camp.id);
                          }}
                          disabled={checkingEligibility}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Verificar
                        </Button>
                      )}
                      <button onClick={() => setSelectedCampaign(isSelected ? null : camp)}>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Eligibility panel */}
                  {isSelected && (
                    <div className="mt-4 border-t border-border pt-4 space-y-3">
                      {checkingEligibility && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 animate-spin" />
                          Verificando Send Policy Gateway…
                        </p>
                      )}
                      {eligibility && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              {eligibility.eligible} elegíveis
                            </div>
                            {eligibility.blocked > 0 && (
                              <div className="flex items-center gap-1.5 text-sm text-red-600">
                                <XCircle className="h-4 w-4" />
                                {eligibility.blocked} bloqueados
                              </div>
                            )}
                          </div>
                          {Object.entries(eligibility.reasons).length > 0 && (
                            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                              <p className="font-medium text-muted-foreground">Motivos de bloqueio:</p>
                              {Object.entries(eligibility.reasons).map(([reason, count]) => (
                                <p key={reason}>{reason}: {count}</p>
                              ))}
                            </div>
                          )}
                          {eligibility.eligible > 0 && (
                            <Button
                              onClick={() => void handleLaunch(camp.id)}
                              disabled={launching}
                              className="w-full"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {launching ? 'Lançando…' : `Lançar campanha para ${eligibility.eligible} destinatários`}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
