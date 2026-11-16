'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import {
  labApi,
  type LabConversationSummary,
  type LabMessage,
} from '../../../lib/lab-api';
import { Button, Card, CardContent, Badge, Skeleton } from '@walletz/ui';
import {
  Bot,
  Send,
  User,
  FlaskConical,
  Plus,
  ChevronDown,
  Clock,
  Trash2,
  PenLine,
  Info,
  History,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../../lib/api';

interface Agent {
  id: string;
  name: string;
  status: string;
  objective: string | null;
}

interface DisplayMessage extends LabMessage {
  optimistic?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Hoje';
  if (diff < 172800000) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function LaboratorioPage() {
  const { tenantId } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [conversations, setConversations] = useState<LabConversationSummary[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Load agents ── */
  useEffect(() => {
    if (!tenantId) return;
    api
      .get<Agent[]>(`/tenants/${tenantId}/agents`)
      .then(({ data }) => {
        setAgents(data);
        if (data.length > 0 && !selectedAgentId) setSelectedAgentId(data[0]!.id);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [tenantId]);

  /* ── Load conversation list ── */
  const loadConversations = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await labApi.listConversations(tenantId);
      setConversations(data);
      return data;
    } catch {
      return [];
    }
  }, [tenantId]);

  /* ── On mount: load conversations, open most recent ── */
  useEffect(() => {
    if (!tenantId) return;
    loadConversations().then((list) => {
      if (list && list.length > 0 && !currentConvId) {
        void openConversation(list[0]!.id, list[0]!.agentId);
      }
    });
  }, [tenantId]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Open existing conversation ── */
  const openConversation = async (id: string, agentId: string) => {
    setCurrentConvId(id);
    setSelectedAgentId(agentId);
    setLoadingConv(true);
    setShowHistory(false);
    setSendError(null);
    try {
      if (!tenantId) return;
      const { data } = await labApi.getConversation(tenantId, id);
      setMessages(data.messages);
    } catch {
      setMessages([]);
    } finally {
      setLoadingConv(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /* ── New conversation ── */
  const handleNewConversation = async () => {
    if (!tenantId || !selectedAgentId) return;
    try {
      const { data } = await labApi.createConversation(tenantId, selectedAgentId);
      setCurrentConvId(data.id);
      setMessages([]);
      setSendError(null);
      setShowHistory(false);
      await loadConversations();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      /* ignore */
    }
  };

  /* ── Change agent: create new conversation for new agent ── */
  const handleAgentChange = async (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentConvId(null);
    setMessages([]);
    setSendError(null);
    // Load any existing conversation for this agent
    const list = await loadConversations();
    const existing = list?.find((c) => c.agentId === agentId);
    if (existing) {
      void openConversation(existing.id, agentId);
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    if (!tenantId || !selectedAgentId || !input.trim() || sending) return;
    const text = input.trim();
    setSendError(null);

    let convId = currentConvId;

    // Create conversation if none exists
    if (!convId) {
      try {
        const { data } = await labApi.createConversation(tenantId, selectedAgentId);
        convId = data.id;
        setCurrentConvId(convId);
        await loadConversations();
      } catch {
        setSendError('Não foi possível criar a conversa. Tente novamente.');
        return;
      }
    }

    // Optimistic UI
    const optimisticUser: DisplayMessage = {
      id: `opt-user-${Date.now()}`,
      role: 'user',
      content: text,
      metadata: {},
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput('');
    setSending(true);

    try {
      const { data } = await labApi.chat(tenantId, selectedAgentId, text, convId);

      // Replace optimistic with real + add assistant
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticUser.id);
        const userMsg: DisplayMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        const assistantMsg: DisplayMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          metadata: {
            traceId: data.traceId,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            retrievedChunks: data.retrievedChunks,
          },
          createdAt: new Date().toISOString(),
        };
        return [...withoutOptimistic, userMsg, assistantMsg];
      });

      // Update conversation id if newly created
      if (data.conversationId && !currentConvId) {
        setCurrentConvId(data.conversationId);
      }

      await loadConversations();
    } catch (err: unknown) {
      // Remove optimistic message; keep input text recoverable
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(text);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível obter resposta do agente.';
      setSendError(msg);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  /* ── Rename ── */
  const handleRename = async (id: string) => {
    if (!tenantId || !renameValue.trim()) return;
    try {
      await labApi.renameConversation(tenantId, id, renameValue.trim());
      await loadConversations();
    } catch {
      /* ignore */
    } finally {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    try {
      await labApi.deleteConversation(tenantId, id);
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
      const list = await loadConversations();
      setDeleteConfirmId(null);
      // Open next conversation if any
      if (currentConvId === id && list && list.length > 0) {
        void openConversation(list[0]!.id, list[0]!.agentId);
      }
    } catch {
      /* ignore */
    }
  };

  const toggleSources = (msgId: string) => {
    setShowSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const currentConvTitle = conversations.find((c) => c.id === currentConvId)?.title;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* ── History sidebar ── */}
      {showHistory && (
        <div className="w-72 shrink-0 border-r border-border flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <History className="h-4 w-4" /> Histórico
            </span>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-3">Nenhuma conversa ainda.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${conv.id === currentConvId ? 'bg-muted' : ''}`}
                  onClick={() => void openConversation(conv.id, conv.agentId)}
                >
                  {renamingId === conv.id ? (
                    <input
                      autoFocus
                      className="w-full text-sm border border-input rounded px-1.5 py-0.5 bg-background"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleRename(conv.id);
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                      }}
                      onBlur={() => void handleRename(conv.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate pr-14">{conv.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {conv.agentName} · {formatDate(conv.lastMessageAt ?? conv.createdAt)}
                      </p>
                    </>
                  )}

                  {/* Actions */}
                  {renamingId !== conv.id && (
                    <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                      <button
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(conv.id);
                          setRenameValue(conv.title);
                        }}
                        title="Renomear"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(conv.id);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {deleteConfirmId === conv.id && (
                    <div
                      className="absolute inset-x-0 bottom-0 bg-background border border-destructive/30 rounded shadow-lg p-3 z-10 mx-2 mb-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-foreground mb-2">Excluir esta conversa?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => void handleDelete(conv.id)}
                        >
                          Excluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col p-6 gap-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Laboratório
              {currentConvTitle && (
                <span className="text-base font-normal text-muted-foreground">· {currentConvTitle}</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Teste seus agentes antes de publicar
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory((v) => !v)}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              Histórico
              {conversations.length > 0 && (
                <Badge className="ml-1.5 h-4 px-1 text-[10px]">{conversations.length}</Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleNewConversation()}
              disabled={!selectedAgentId}
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
                  <a href="/agentes/novo" className="text-primary underline">
                    Criar agente
                  </a>
                </span>
              ) : (
                <select
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedAgentId}
                  onChange={(e) => void handleAgentChange(e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.status === 'draft' ? ' (rascunho)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedAgent && (
                <Badge variant="outline" className="text-xs">
                  {selectedAgent.status === 'published' ? 'Versão publicada' : 'Rascunho'}
                </Badge>
              )}
              {currentConvId && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Conversa salva
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

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4 min-h-0">
          {loadingConv ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className={`h-10 ${i % 2 === 0 ? 'w-2/3 self-end' : 'w-3/4'}`} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
              <Bot className="h-12 w-12 opacity-20" />
              <div>
                <p className="font-medium">
                  {selectedAgentId ? 'Inicie uma conversa' : 'Selecione um agente'}
                </p>
                <p className="text-xs mt-1">
                  {selectedAgentId
                    ? 'Digite uma pergunta para testar como o agente responde'
                    : 'Escolha um agente no seletor acima'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? `bg-primary text-primary-foreground rounded-tr-sm${msg.optimistic ? ' opacity-70' : ''}`
                        : msg.metadata.error
                          ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                          : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.metadata.error ? (
                      <span>{msg.metadata.error}</span>
                    ) : (
                      <span className="whitespace-pre-line">{msg.content}</span>
                    )}
                  </div>

                  {msg.role === 'assistant' && !msg.metadata.error && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.metadata.inputTokens !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {(msg.metadata.inputTokens ?? 0) + (msg.metadata.outputTokens ?? 0)} tokens
                        </span>
                      )}
                      {Array.isArray(msg.metadata.retrievedChunks) &&
                        msg.metadata.retrievedChunks.length > 0 && (
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          >
                            <ChevronDown
                              className={`h-2.5 w-2.5 transition-transform ${showSources.has(msg.id) ? 'rotate-180' : ''}`}
                            />
                            {msg.metadata.retrievedChunks.length} fonte(s)
                          </button>
                        )}
                      {msg.metadata.traceId && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {String(msg.metadata.traceId).slice(-8)}
                        </span>
                      )}
                    </div>
                  )}

                  {showSources.has(msg.id) &&
                    Array.isArray(msg.metadata.retrievedChunks) &&
                    msg.metadata.retrievedChunks.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2 text-xs max-w-full">
                        {(msg.metadata.retrievedChunks as Array<{ content: string; source: string }>).map(
                          (chunk, j) => (
                            <div key={j}>
                              <p className="font-medium text-muted-foreground mb-1">📄 {chunk.source}</p>
                              <p className="text-foreground/80 line-clamp-3">{chunk.content}</p>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary mt-1">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}

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

        {/* Send error */}
        {sendError && (
          <div className="shrink-0 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span>{sendError}</span>
              <button
                className="ml-2 underline text-xs"
                onClick={() => { setSendError(null); setTimeout(() => inputRef.current?.focus(), 50); }}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[52px] max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={
              !selectedAgentId
                ? 'Selecione um agente acima para começar'
                : 'Digite sua mensagem… (Enter envia, Shift+Enter quebra linha)'
            }
            value={input}
            disabled={!selectedAgentId || sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            autoFocus={!!selectedAgentId}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || !selectedAgentId || sending}
            className="self-end h-[52px] w-[52px] rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
