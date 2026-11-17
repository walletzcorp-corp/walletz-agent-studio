'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { labApi, type LabConversationView, type LabConversationSummary, type LabMessageView } from '../../../lib/lab-api';
import { Button, Card, CardContent, Badge, Skeleton } from '@walletz/ui';
import {
  Bot, Send, User, FlaskConical, Plus, Trash2, ChevronDown, Info,
  History, AlertCircle, MessageSquare, X,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { withBasePath } from '../../../lib/paths';

interface Agent {
  id: string;
  name: string;
  status: string;
  objective: string | null;
}

type ConvLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'empty';

function groupByDate(summaries: LabConversationSummary[]): Record<string, LabConversationSummary[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86400_000);

  const groups: Record<string, LabConversationSummary[]> = {
    Hoje: [],
    Ontem: [],
    'Últimos 7 dias': [],
    Anteriores: [],
  };

  for (const s of summaries) {
    const d = s.lastMessageAt ? new Date(s.lastMessageAt) : new Date(s.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups['Hoje']!.push(s);
    else if (day >= yesterday) groups['Ontem']!.push(s);
    else if (day >= weekAgo) groups['Últimos 7 dias']!.push(s);
    else groups['Anteriores']!.push(s);
  }

  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}

export default function LaboratorioPage() {
  const { tenantId } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [conversation, setConversation] = useState<LabConversationView | null>(null);
  const [convState, setConvState] = useState<ConvLoadState>('idle');

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSources, setShowSources] = useState<Set<string>>(new Set());

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<LabConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Carrega agentes ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!tenantId) return;
    api
      .get<Agent[]>(`/tenants/${tenantId}/agents`)
      .then(({ data }) => {
        setAgents(data);
        if (data.length > 0 && data[0]) setSelectedAgentId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [tenantId]);

  /* ── Carrega conversa mais recente quando agente muda ─────────────────────── */
  const loadLatestConversation = useCallback(
    async (agentId: string) => {
      if (!tenantId || !agentId) return;
      setConvState('loading');
      setConversation(null);
      try {
        const { data } = await labApi.getLatestConversation(tenantId, agentId);
        if (data) {
          setConversation(data);
          setConvState('loaded');
        } else {
          setConvState('empty');
        }
      } catch {
        setConvState('error');
      }
    },
    [tenantId],
  );

  useEffect(() => {
    if (selectedAgentId) void loadLatestConversation(selectedAgentId);
  }, [selectedAgentId, loadLatestConversation]);

  /* ── Scroll automático ────────────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, sending]);

  /* ── Histórico ────────────────────────────────────────────────────────────── */
  const openHistory = async () => {
    if (!tenantId || !selectedAgentId) return;
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const { data } = await labApi.listConversations(tenantId, selectedAgentId, 50);
      setHistoryList(data);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectConversation = async (id: string) => {
    if (!tenantId) return;
    setHistoryOpen(false);
    setConvState('loading');
    setConversation(null);
    try {
      const { data } = await labApi.getConversation(tenantId, id);
      setConversation(data);
      setConvState('loaded');
    } catch {
      setConvState('error');
    }
  };

  /* ── Nova conversa ────────────────────────────────────────────────────────── */
  const startNewConversation = async () => {
    if (!tenantId || !selectedAgentId) return;
    setConvState('loading');
    setConversation(null);
    try {
      const { data } = await labApi.createConversation(tenantId, selectedAgentId);
      setConversation(data);
      setConvState('loaded');
    } catch {
      setConvState('error');
    }
  };

  /* ── Deletar conversa ─────────────────────────────────────────────────────── */
  const confirmDelete = async (id: string) => {
    if (!tenantId) return;
    try {
      await labApi.deleteConversation(tenantId, id);
      if (conversation?.id === id) {
        setConversation(null);
        setConvState('empty');
      }
      setHistoryList((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* silently ignore — user stays on current state */
    } finally {
      setDeleteConfirmId(null);
    }
  };

  /* ── Enviar mensagem ──────────────────────────────────────────────────────── */
  const handleSend = async () => {
    if (!tenantId || !selectedAgentId || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    /* Adiciona mensagem do usuário no estado local imediatamente */
    const tempUserMsg: LabMessageView = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      provider: null,
      model: null,
      inputTokens: null,
      outputTokens: null,
      traceId: null,
      retrievedChunks: null,
      toolCallsExecuted: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    };

    setConversation((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, tempUserMsg] };
    });

    try {
      const { data } = await labApi.chat(
        tenantId,
        selectedAgentId,
        text,
        conversation?.id,
      );

      /* Recarrega conversa do servidor para garantir consistência */
      const { data: updated } = await labApi.getConversation(tenantId, data.labConversationId);
      setConversation(updated);
      setConvState('loaded');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao processar mensagem. Tente novamente.';

      /* Mantém mensagem do usuário, adiciona erro inline */
      const errorMsg: LabMessageView = {
        id: `temp-err-${Date.now()}`,
        role: 'error',
        content: '',
        provider: null,
        model: null,
        inputTokens: null,
        outputTokens: null,
        traceId: null,
        retrievedChunks: null,
        toolCallsExecuted: null,
        errorMessage: msg,
        createdAt: new Date().toISOString(),
      };
      setConversation((prev) => {
        if (!prev) return prev;
        /* Remove a mensagem temporária do usuário se for a última (pode ser duplicada pelo reload) */
        const msgs = prev.messages.filter((m) => m.id !== tempUserMsg.id);
        return { ...prev, messages: [...msgs, tempUserMsg, errorMsg] };
      });
    } finally {
      setSending(false);
    }
  };

  const toggleSources = (msgId: string) => {
    setShowSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      return next;
    });
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const messages = conversation?.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* History drawer */}
      {historyOpen && (
        <div className="w-72 shrink-0 border-r border-border bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Histórico</span>
            <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingHistory ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma conversa anterior
              </div>
            ) : (
              Object.entries(groupByDate(historyList)).map(([label, items]) => (
                <div key={label} className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">{label}</p>
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted text-sm ${conversation?.id === s.id ? 'bg-muted' : ''}`}
                    >
                      <button
                        className="flex-1 text-left min-w-0 mr-2"
                        onClick={() => void selectConversation(s.id)}
                      >
                        <p className="truncate font-medium">{s.title}</p>
                        {s.lastMessage && (
                          <p className="truncate text-[11px] text-muted-foreground">{s.lastMessage}</p>
                        )}
                      </button>
                      {deleteConfirmId === s.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => void confirmDelete(s.id)}
                            className="text-[10px] text-destructive hover:underline"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-muted-foreground hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(s.id); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col p-6 gap-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Laboratório
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Teste seus agentes antes de publicar</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openHistory()}
              disabled={!selectedAgentId}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              Histórico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void startNewConversation()}
              disabled={!selectedAgentId || convState === 'loading'}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nova conversa
            </Button>
          </div>
        </div>

        {/* Agent selector */}
        <Card className="shrink-0">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Agente:
              </label>
              {loadingAgents ? (
                <Skeleton className="h-8 w-48" />
              ) : agents.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Nenhum agente criado.{' '}
                  <a href={withBasePath('/agentes/novo')} className="text-primary underline">
                    Criar agente
                  </a>
                </span>
              ) : (
                <select
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.status === 'draft' ? ' (rascunho)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedAgent && (
                <Badge variant="outline" className="text-xs">{selectedAgent.status}</Badge>
              )}
              {conversation && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={conversation.title}>
                  — {conversation.title}
                </span>
              )}
            </div>
            {selectedAgent?.objective && (
              <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                {selectedAgent.objective}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4 min-h-0">

          {/* Loading state */}
          {convState === 'loading' && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  {i % 2 !== 0 && <Skeleton className="h-7 w-7 rounded-full shrink-0" />}
                  <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
                  {i % 2 === 0 && <Skeleton className="h-7 w-7 rounded-full shrink-0" />}
                </div>
              ))}
            </div>
          )}

          {/* Error loading state */}
          {convState === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-destructive opacity-60" />
              <div>
                <p className="font-medium text-destructive">Falha ao carregar conversa</p>
                <p className="text-xs mt-1">Verifique sua conexão e tente novamente.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedAgentId ? void loadLatestConversation(selectedAgentId) : undefined}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Empty state — no conversations yet */}
          {convState === 'empty' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <div>
                <p className="font-medium">Nenhuma conversa ainda</p>
                <p className="text-xs mt-1">Digite uma mensagem para iniciar sua primeira conversa com este agente.</p>
              </div>
            </div>
          )}

          {/* Messages */}
          {(convState === 'loaded' || (convState === 'idle' && messages.length > 0)) && messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}

              <div className={`max-w-[75%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : msg.role === 'error' || msg.errorMessage
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                      : 'bg-muted rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'error' || msg.errorMessage ? (
                    <span>{msg.errorMessage ?? 'Erro desconhecido'}</span>
                  ) : (
                    <span className="whitespace-pre-line">{msg.content}</span>
                  )}
                </div>

                {msg.role === 'assistant' && !msg.errorMessage && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(msg.inputTokens !== null || msg.outputTokens !== null) && (
                      <span className="text-[10px] text-muted-foreground">
                        {(msg.inputTokens ?? 0) + (msg.outputTokens ?? 0)} tokens
                      </span>
                    )}
                    {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                      >
                        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showSources.has(msg.id) ? 'rotate-180' : ''}`} />
                        {msg.retrievedChunks.length} fonte(s)
                      </button>
                    )}
                    {msg.traceId && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {msg.traceId.slice(-8)}
                      </span>
                    )}
                  </div>
                )}

                {showSources.has(msg.id) && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2 text-xs max-w-full">
                    {msg.retrievedChunks.map((chunk, j) => (
                      <div key={j}>
                        <p className="font-medium text-muted-foreground mb-1">📄 {chunk.source}</p>
                        <p className="text-foreground/80 line-clamp-3">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary mt-1">
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 flex gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[52px] max-h-32"
            placeholder={
              convState === 'loading'
                ? 'Carregando…'
                : !selectedAgentId
                ? 'Selecione um agente'
                : 'Digite sua mensagem…'
            }
            value={input}
            disabled={!selectedAgentId || sending || convState === 'loading' || convState === 'error'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || !selectedAgentId || sending || convState === 'loading' || convState === 'error'}
            className="self-end h-[52px] w-[52px] rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
