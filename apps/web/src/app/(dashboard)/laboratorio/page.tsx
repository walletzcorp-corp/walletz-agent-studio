'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { labApi, type ChatMessage } from '../../../lib/lab-api';
import { Button, Card, CardContent, Badge, Skeleton } from '@walletz/ui';
import { Bot, Send, User, FlaskConical, RefreshCw, ChevronDown, Info } from 'lucide-react';
import { api } from '../../../lib/api';

interface Agent {
  id: string;
  name: string;
  status: string;
  objective: string | null;
}

interface DisplayMessage extends ChatMessage {
  traceId?: string;
  retrievedChunks?: Array<{ content: string; source: string }>;
  tokens?: { input: number; output: number };
  error?: string;
}

export default function LaboratorioPage() {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [showSources, setShowSources] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    api
      .get<Agent[]>(`/tenants/${tenantId}/agents`)
      .then(({ data }) => {
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0]!.id);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [tenantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const clearChat = () => setMessages([]);

  const handleSend = async () => {
    if (!tenantId || !selectedAgentId || !input.trim() || loading) return;

    const userMessage: DisplayMessage = { role: 'user', content: input.trim() };
    const history: ChatMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await labApi.chat(tenantId, selectedAgentId, userMessage.content, history);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          traceId: data.traceId,
          retrievedChunks: data.retrievedChunks,
          tokens: { input: data.inputTokens, output: data.outputTokens },
        },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao processar mensagem';
      setMessages((prev) => [...prev, { role: 'assistant', content: '', error: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (idx: number) => {
    setShowSources((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Laboratório
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Teste seus agentes antes de publicar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Nova conversa
        </Button>
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
                onChange={(e) => {
                  setSelectedAgentId(e.target.value);
                  setMessages([]);
                }}
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
                {selectedAgent.status}
              </Badge>
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
            <Bot className="h-12 w-12 opacity-20" />
            <div>
              <p className="font-medium">Inicie uma conversa</p>
              <p className="text-xs mt-1">Digite uma pergunta para testar como o agente responde</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
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
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : msg.error
                      ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                      : 'bg-muted rounded-tl-sm'
                }`}
              >
                {msg.error ? (
                  <span>{msg.error}</span>
                ) : (
                  <span className="whitespace-pre-line">{msg.content}</span>
                )}
              </div>

              {msg.role === 'assistant' && !msg.error && (
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.tokens && (
                    <span className="text-[10px] text-muted-foreground">
                      {msg.tokens.input + msg.tokens.output} tokens
                    </span>
                  )}
                  {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                    <button
                      onClick={() => toggleSources(i)}
                      className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                    >
                      <ChevronDown
                        className={`h-2.5 w-2.5 transition-transform ${showSources.has(i) ? 'rotate-180' : ''}`}
                      />
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

              {showSources.has(i) && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
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

        {loading && (
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
          placeholder={selectedAgentId ? 'Digite sua mensagem…' : 'Selecione um agente'}
          value={input}
          disabled={!selectedAgentId || loading}
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
          disabled={!input.trim() || !selectedAgentId || loading}
          className="self-end h-[52px] w-[52px] rounded-xl p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
