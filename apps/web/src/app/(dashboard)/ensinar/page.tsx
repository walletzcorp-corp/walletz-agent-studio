'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { teachApi, type KnowledgeItem, type KnowledgeItemType } from '../../../lib/teach-api';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Skeleton,
} from '@walletz/ui';
import {
  Plus, CheckCircle2, Clock, Pencil, Trash2, ShieldCheck, ShieldX, ChevronDown, ChevronUp,
} from 'lucide-react';

const TYPE_CONFIG: Record<KnowledgeItemType, { label: string; color: string; description: string }> = {
  fact: { label: 'Fato', color: 'bg-blue-100 text-blue-700', description: 'Informação objetiva sobre a empresa/produto' },
  guidance: { label: 'Diretriz', color: 'bg-purple-100 text-purple-700', description: 'Como o agente deve se comportar' },
  procedure: { label: 'Procedimento', color: 'bg-orange-100 text-orange-700', description: 'Passo a passo para tarefas específicas' },
  permission: { label: 'Permissão', color: 'bg-green-100 text-green-700', description: 'O que o agente pode ou não pode fazer' },
  example: { label: 'Exemplo', color: 'bg-gray-100 text-gray-700', description: 'Exemplos de respostas corretas' },
};

const TYPES: KnowledgeItemType[] = ['fact', 'guidance', 'procedure', 'permission', 'example'];

type FilterType = KnowledgeItemType | 'all';

export default function TeachPage() {
  const { tenantId, role } = useAuth();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Form state
  const [formType, setFormType] = useState<KnowledgeItemType>('fact');
  const [formContent, setFormContent] = useState('');
  const [formContext, setFormContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = role === 'admin' || role === 'owner';

  const load = async () => {
    if (!tenantId) return;
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const { data } = await teachApi.list(tenantId, params);
      setItems(data);
    } catch {
      setError('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tenantId, filter]);

  const resetForm = () => {
    setFormType('fact');
    setFormContent('');
    setFormContext('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!tenantId || !formContent.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await teachApi.update(tenantId, editingId, {
          content: formContent,
          context: formContext || undefined,
        });
      } else {
        await teachApi.create(tenantId, {
          type: formType,
          content: formContent,
          context: formContext || undefined,
        });
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setFormType(item.type);
    setFormContent(item.content);
    setFormContext(item.context ?? '');
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApprove = async (itemId: string) => {
    if (!tenantId) return;
    try {
      await teachApi.approve(tenantId, itemId);
      await load();
    } catch { /* silent */ }
  };

  const handleRevoke = async (itemId: string) => {
    if (!tenantId) return;
    try {
      await teachApi.revokeApproval(tenantId, itemId);
      await load();
    } catch { /* silent */ }
  };

  const handleDelete = async (itemId: string) => {
    if (!tenantId || !confirm('Remover este item?')) return;
    try {
      await teachApi.remove(tenantId, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch { /* silent */ }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCount = items.filter((i) => !i.approvedAt).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ensinar IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ensine fatos, diretrizes e procedimentos aos seus agentes
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus className="h-4 w-4" />
          Ensinar novo
        </Button>
      </div>

      {pendingCount > 0 && isAdmin && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>{pendingCount}</strong> {pendingCount === 1 ? 'item aguarda' : 'itens aguardam'} aprovação para entrar em produção.
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {/* New/Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Editar item' : 'Ensinar novo conhecimento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editingId && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TYPES.map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        formType === t ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <p className="mt-1.5 text-xs text-muted-foreground">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            <textarea
              className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder={
                formType === 'fact' ? 'Ex: Nosso horário de funcionamento é de segunda a sábado, das 8h às 18h.' :
                formType === 'guidance' ? 'Ex: Sempre cumprimente o cliente pelo nome quando disponível.' :
                formType === 'procedure' ? 'Ex: Para cancelamento: 1) Verifique o pedido, 2) Confirme dados, 3) Processe o estorno.' :
                formType === 'permission' ? 'Ex: O agente NÃO pode oferecer descontos acima de 10% sem aprovação do gerente.' :
                'Ex: Cliente: "Posso parcelar?" Agente: "Sim! Parcelamos em até 12x no cartão sem juros."'
              }
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
            />

            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Contexto (opcional) — ex: Aplica-se apenas a clientes premium"
              value={formContext}
              onChange={(e) => setFormContext(e.target.value)}
            />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting || !formContent.trim()}>
                {submitting ? 'Salvando…' : editingId ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['all', ...TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {t === 'all' ? 'Todos' : TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="font-semibold">Nenhum item de conhecimento ainda</p>
            <p className="text-sm text-muted-foreground">
              Comece ensinando fatos sobre sua empresa, diretrizes de comportamento ou procedimentos
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Ensinar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            const isExpanded = expanded.has(item.id);
            const contentShort = item.content.length > 120 ? item.content.slice(0, 120) + '…' : item.content;
            const needsTruncation = item.content.length > 120;

            return (
              <Card key={item.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {item.approvedAt ? (
                          <span className="flex items-center gap-0.5 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Aprovado
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                            <Clock className="h-3 w-3" />
                            Aguardando aprovação
                          </span>
                        )}
                        {item.context && (
                          <span className="text-xs text-muted-foreground italic">· {item.context}</span>
                        )}
                      </div>

                      <p className="text-sm text-foreground whitespace-pre-line">
                        {isExpanded ? item.content : contentShort}
                      </p>

                      {needsTruncation && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {isExpanded ? <><ChevronUp className="h-3 w-3" /> Ver menos</> : <><ChevronDown className="h-3 w-3" /> Ver mais</>}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && !item.approvedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Aprovar"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApprove(item.id)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && item.approvedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Revogar aprovação"
                          className="text-yellow-600 hover:text-yellow-700"
                          onClick={() => handleRevoke(item.id)}
                        >
                          <ShieldX className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remover"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
