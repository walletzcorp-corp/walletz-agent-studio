'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/use-auth';
import { whatsappApi, type WhatsappAccount, type WhatsappTemplate } from '../../../../lib/whatsapp-api';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Badge,
} from '@walletz/ui';
import {
  Smartphone, CheckCircle2, XCircle, AlertCircle, Plus, RefreshCw,
  Trash2, Send, Copy, ExternalLink, Zap,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  connected: { label: 'Conectado', color: 'text-green-600', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'text-yellow-600', icon: AlertCircle },
  disconnected: { label: 'Desconectado', color: 'text-gray-500', icon: XCircle },
  suspended: { label: 'Suspenso', color: 'text-red-600', icon: XCircle },
  error: { label: 'Erro', color: 'text-red-600', icon: AlertCircle },
};

interface Stats { sent: number; received: number; failed: number; total: number }

export default function WhatsAppPage() {
  const { tenantId } = useAuth();
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [templates, setTemplates] = useState<Record<string, WhatsappTemplate[]>>({});

  // Form
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState(() => crypto.randomUUID());
  const [webhookUrl, setWebhookUrl] = useState('');

  const load = async () => {
    if (!tenantId) return;
    try {
      const { data } = await whatsappApi.listAccounts(tenantId);
      setAccounts(data);
      for (const acc of data) {
        void whatsappApi.getStats(tenantId, acc.id).then(({ data: s }) =>
          setStats((prev) => ({ ...prev, [acc.id]: s })),
        ).catch(() => {});
        void whatsappApi.listTemplates(tenantId, acc.id).then(({ data: t }) =>
          setTemplates((prev) => ({ ...prev, [acc.id]: t })),
        ).catch(() => {});
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [tenantId]);

  const handleConnect = async () => {
    if (!tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      await whatsappApi.connectAccount(tenantId, {
        phoneNumberId,
        wabaId,
        accessToken,
        appSecret: appSecret || undefined,
        verifyToken,
        webhookUrl,
      });
      setShowForm(false);
      setPhoneNumberId(''); setWabaId(''); setAccessToken(''); setAppSecret('');
      setVerifyToken(crypto.randomUUID()); setWebhookUrl('');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro ao conectar WhatsApp');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!tenantId || !confirm('Desconectar este número do WhatsApp?')) return;
    try {
      await whatsappApi.disconnectAccount(tenantId, accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch { /* silent */ }
  };

  const handleSyncTemplates = async (accountId: string) => {
    if (!tenantId) return;
    try {
      await whatsappApi.syncTemplates(tenantId, accountId);
      const { data } = await whatsappApi.listTemplates(tenantId, accountId);
      setTemplates((prev) => ({ ...prev, [accountId]: data }));
    } catch { /* silent */ }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const webhookEndpoint = `${typeof window !== 'undefined' ? window.location.origin.replace('3000', '3001') : ''}/api/v1/webhook/whatsapp`;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-green-500" />
            WhatsApp Business
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte seu número WhatsApp Business para receber e enviar mensagens
          </p>
        </div>
        {accounts.length === 0 && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Conectar WhatsApp
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Connection Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              Conectar WhatsApp Business API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">📋 Antes de começar, você precisa:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Ter um Meta Business Account aprovado</li>
                <li>Criar um App no <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">Meta for Developers</a></li>
                <li>Adicionar o produto WhatsApp Business ao seu App</li>
                <li>Copiar o Phone Number ID e o WABA ID do painel</li>
                <li>Gerar um token de acesso de sistema (permanent token)</li>
              </ol>
            </div>

            {/* Webhook URL to configure in Meta */}
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Configure este webhook no Meta Developer Console:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs flex-1 break-all">{webhookEndpoint}</code>
                <button onClick={() => copyToClipboard(webhookEndpoint)} className="shrink-0">
                  <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number ID *</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">WABA ID *</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="123456789012345"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Access Token *</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="EAABxxxx..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">App Secret (opcional)</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="Para verificação de webhook"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  Verify Token *
                  <button onClick={() => copyToClipboard(verifyToken)}>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use este token ao configurar o webhook no Meta</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Webhook URL *</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://seu-dominio.com/api/v1/webhook/whatsapp"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL pública acessível pela Meta. Em dev, use ngrok: <code>ngrok http 3001</code>
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                onClick={() => void handleConnect()}
                disabled={submitting || !phoneNumberId || !wabaId || !accessToken || !verifyToken || !webhookUrl}
              >
                {submitting ? 'Conectando…' : 'Conectar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="h-32 animate-pulse bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : accounts.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Smartphone className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">Nenhum número conectado</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Conecte um número WhatsApp Business para começar a receber e enviar mensagens pelos seus agentes.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Conectar WhatsApp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => {
            const statusCfg = STATUS_CONFIG[acc.status] ?? STATUS_CONFIG.error!;
            const StatusIcon = statusCfg.icon;
            const accStats = stats[acc.id];
            const accTemplates = templates[acc.id] ?? [];

            return (
              <Card key={acc.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Smartphone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{acc.displayName ?? 'Número WhatsApp'}</p>
                        <p className="text-sm text-muted-foreground">{acc.phoneNumber ?? acc.phoneNumberId}</p>
                        <div className={`flex items-center gap-1 text-xs mt-0.5 ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSyncTemplates(acc.id)}
                        title="Sincronizar templates"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Templates
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDisconnect(acc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  {accStats && (
                    <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border pt-4">
                      {[
                        { label: 'Enviadas', value: accStats.sent },
                        { label: 'Recebidas', value: accStats.received },
                        { label: 'Erros', value: accStats.failed },
                        { label: 'Total', value: accStats.total },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-lg font-bold">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                    <div>
                      <span className="font-medium">WABA ID:</span>{' '}
                      <code>{acc.wabaId}</code>
                    </div>
                    <div>
                      <span className="font-medium">Phone Number ID:</span>{' '}
                      <code>{acc.phoneNumberId}</code>
                    </div>
                    {acc.lastSyncedAt && (
                      <div>
                        <span className="font-medium">Última sync:</span>{' '}
                        {new Date(acc.lastSyncedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Templates aprovados:</span>{' '}
                      {accTemplates.filter((t) => t.status === 'APPROVED').length} /{' '}
                      {accTemplates.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {accounts.length > 0 && (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Adicionar outro número
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
