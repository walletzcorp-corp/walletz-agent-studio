'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { api } from '../../../lib/api';
import { Button, Card, CardContent, Badge } from '@walletz/ui';
import {
  MessageSquare, Bot, User, PhoneCall, Clock, CheckCheck,
  Send, ArrowLeft, Pause, Play, XCircle,
} from 'lucide-react';

interface Conversation {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  agentId: string | null;
  assignedToUserId: string | null;
  aiPausedAt: string | null;
  lastMessageAt: string | null;
  tags: string[];
  createdAt: string;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  content: { text?: string };
  isAiGenerated: boolean;
  sentByUserId: string | null;
  sentByAgentId: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  waiting_human: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-gray-100 text-gray-600',
};

export default function ConversasPage() {
  const { tenantId, userId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<Conversation[]>(`/tenants/${tenantId}/conversations`);
      setConversations(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadMessages = async (convId: string) => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<Message[]>(`/tenants/${tenantId}/conversations/${convId}/messages`);
      setMessages(data.slice().reverse());
    } catch { /* silent */ }
  };

  useEffect(() => { void loadConversations(); }, [tenantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelect = (conv: Conversation) => {
    setSelected(conv);
    void loadMessages(conv.id);
  };

  const handleSend = async () => {
    if (!tenantId || !selected || !reply.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/tenants/${tenantId}/conversations/${selected.id}/messages`, {
        text: reply.trim(),
      });
      setReply('');
      await loadMessages(selected.id);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const handleAssume = async () => {
    if (!tenantId || !selected) return;
    try {
      const { data } = await api.post<Conversation>(
        `/tenants/${tenantId}/conversations/${selected.id}/assume`,
      );
      setSelected(data);
      setConversations((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch { /* silent */ }
  };

  const handleReturnToAi = async () => {
    if (!tenantId || !selected) return;
    try {
      const { data } = await api.post<Conversation>(
        `/tenants/${tenantId}/conversations/${selected.id}/return-to-ai`,
      );
      setSelected(data);
      setConversations((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch { /* silent */ }
  };

  const handleResolve = async () => {
    if (!tenantId || !selected) return;
    try {
      const { data } = await api.post<Conversation>(
        `/tenants/${tenantId}/conversations/${selected.id}/resolve`,
      );
      setSelected(data);
      setConversations((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch { /* silent */ }
  };

  const isAiPaused = !!selected?.aiPausedAt;
  const isHumanAssigned = !!selected?.assignedToUserId;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation list */}
      <div className={`flex flex-col border-r border-border ${selected ? 'hidden md:flex w-80' : 'flex flex-1 md:flex-none md:w-80'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </h1>
          <Badge variant="outline" className="text-xs">
            {conversations.filter((c) => c.status === 'open').length} abertas
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <div>
                <p className="font-medium text-sm">Nenhuma conversa</p>
                <p className="text-xs mt-1">As conversas aparecerão aqui quando chegarem mensagens</p>
              </div>
            </div>
          ) : (
            <ul>
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    className={`w-full text-left p-4 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                      selected?.id === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => handleSelect(conv)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <PhoneCall className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {conv.contactId.slice(0, 8)}…
                        </span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[conv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {conv.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{conv.channel}</span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {conv.aiPausedAt && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-yellow-600">
                        <Pause className="h-2.5 w-2.5" />
                        IA pausada
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Conversation detail */}
      {selected ? (
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <button
              onClick={() => setSelected(null)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <PhoneCall className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{selected.contactId.slice(0, 12)}…</p>
              <p className="text-xs text-muted-foreground">{selected.channel}</p>
            </div>
            <div className="flex items-center gap-2">
              {isAiPaused ? (
                <Button size="sm" variant="outline" onClick={() => void handleReturnToAi()}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Devolver para IA
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void handleAssume()}>
                  <User className="h-3.5 w-3.5 mr-1" />
                  Assumir
                </Button>
              )}
              {selected.status !== 'resolved' && (
                <Button size="sm" variant="outline" onClick={() => void handleResolve()}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Encerrar
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.map((msg) => {
              const isOut = msg.direction === 'outbound';
              const text =
                typeof msg.content === 'object' && msg.content !== null
                  ? (msg.content as { text?: string }).text ?? JSON.stringify(msg.content)
                  : String(msg.content);
              return (
                <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      isOut
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card border border-border rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{text}</p>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOut ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                      {msg.isAiGenerated && <Bot className="h-2.5 w-2.5" />}
                      {!msg.isAiGenerated && msg.sentByUserId && <User className="h-2.5 w-2.5" />}
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {isOut && <CheckCheck className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="shrink-0 flex gap-2 p-4 border-t border-border bg-card">
            <textarea
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-28"
              placeholder={isAiPaused ? 'Responder como humano…' : 'IA está ativa. Clique em "Assumir" para responder.'}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={!isAiPaused || sending}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
              }}
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!reply.trim() || !isAiPaused || sending}
              className="self-end h-11 w-11 rounded-xl p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 opacity-20" />
          <div>
            <p className="font-medium">Selecione uma conversa</p>
            <p className="text-sm mt-1">Clique em uma conversa na lista para visualizar</p>
          </div>
        </div>
      )}
    </div>
  );
}
