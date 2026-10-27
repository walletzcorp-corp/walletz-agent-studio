'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Monitor, CheckCircle2, Copy, RefreshCw, ArrowLeft,
  Wifi, WifiOff, Shield, Folder, AlertTriangle, Terminal,
  Loader2,
} from 'lucide-react';
import { Button } from '@walletz/ui';
import { useAuth } from '../../../../hooks/use-auth';

type PairState = 'idle' | 'generating' | 'waiting' | 'paired' | 'error';

interface PcDevice {
  id: string;
  deviceName: string;
  platform: string;
  pairedAt: string | null;
  lastSeenAt: string | null;
  capabilities: Record<string, unknown>;
  authorizedPaths: string[];
  authorizedApps: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function apiCall(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('accessToken') ?? '';
  const r = await fetch(`${API_BASE}/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function MeuComputadorPage() {
  const { tenantId } = useAuth();
  const [state, setState] = useState<PairState>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [device, setDevice] = useState<PcDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDevices = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await apiCall(`/tenants/${tenantId}/pc-connector/devices`);
      const paired = (data as PcDevice[]).find(d => d.pairedAt);
      if (paired) setDevice(paired);
      return paired;
    } catch { return null; }
  }, [tenantId]);

  useEffect(() => {
    loadDevices().then(d => { if (d) setState('paired'); });
  }, [loadDevices]);

  const generateToken = async () => {
    if (!tenantId) return;
    setState('generating');
    setError(null);
    try {
      const data = await apiCall(`/tenants/${tenantId}/pc-connector/pair-token`, { method: 'POST' });
      setToken(data.token as string);
      setExpiresAt(new Date(data.expiresAt as string));
      setState('waiting');

      // Poll for paired device
      pollRef.current = setInterval(async () => {
        const d = await loadDevices();
        if (d) {
          clearInterval(pollRef.current!);
          setState('paired');
          setDevice(d);
        }
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar token');
      setState('error');
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const copyCommand = () => {
    if (!token) return;
    const cmd = `node walletz-pc-connector.mjs --token=${token} --api=${API_BASE}`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isOnline = device?.lastSeenAt
    ? Date.now() - new Date(device.lastSeenAt).getTime() < 30_000
    : false;

  return (
    <div className="page-container max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/integracoes">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Integrações
          </button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/10">
          <Monitor className="h-7 w-7 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Meu Computador</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permita que seus agentes executem tarefas autorizadas neste computador
          </p>
        </div>
      </div>

      {/* Paired state */}
      {state === 'paired' && device && (
        <div className="space-y-6">
          <div className="neural-card p-6 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isOnline ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {isOnline ? <Wifi className="h-6 w-6 text-green-600" /> : <WifiOff className="h-6 w-6 text-yellow-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{device.deviceName}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {device.platform} • Última atividade: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('pt-BR') : 'nunca'}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          </div>

          {/* Capabilities */}
          <div className="neural-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Permissões configuradas
            </h2>
            <CapabilityGrid capabilities={device.capabilities} />
          </div>

          {/* Authorized paths */}
          <div className="neural-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" /> Pastas autorizadas
            </h2>
            {device.authorizedPaths.length > 0 ? (
              <ul className="space-y-1">
                {device.authorizedPaths.map(p => (
                  <li key={p} className="rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">{p}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma pasta configurada ainda.</p>
            )}
          </div>

          <div className="flex gap-3">
            <Link href="/configuracoes/dispositivos">
              <Button variant="outline">Gerenciar dispositivos</Button>
            </Link>
            <Button variant="outline" onClick={generateToken} className="text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2" /> Parear outro computador
            </Button>
          </div>
        </div>
      )}

      {/* Idle / Generate token */}
      {(state === 'idle' || state === 'error') && (
        <div className="space-y-6">
          <div className="neural-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#6366F1]/10">
              <Monitor className="h-10 w-10 text-[#6366F1]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">Conectar este computador</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                O Walletz PC Connector é um processo local seguro que permite a seus agentes executar tarefas autorizadas neste computador.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive w-full">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <Button onClick={generateToken} className="gap-2">
              <Monitor className="h-4 w-4" /> Conectar Computador
            </Button>
          </div>

          <div className="neural-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Como funciona</h2>
            <div className="space-y-3">
              {[
                { n: '1', text: 'Clique em "Conectar Computador" para gerar um token seguro.' },
                { n: '2', text: 'Abra o terminal neste computador e execute o comando que será exibido.' },
                { n: '3', text: 'O computador aparecerá como "CONECTADO ✓" automaticamente.' },
                { n: '4', text: 'Configure as permissões e pastas autorizadas para o agente.' },
              ].map(s => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{s.n}</div>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generating */}
      {state === 'generating' && (
        <div className="neural-card p-12 flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Gerando token seguro…</p>
        </div>
      )}

      {/* Waiting for connector */}
      {state === 'waiting' && token && (
        <div className="space-y-6">
          <div className="neural-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              <h2 className="font-semibold text-foreground">Aguardando pareamento…</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Token válido até {expiresAt?.toLocaleTimeString('pt-BR')}. Execute o comando abaixo neste computador:
            </p>

            <div className="rounded-xl bg-[#0d1117] border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> PowerShell / Terminal
              </div>
              <div className="flex items-start gap-2">
                <code className="flex-1 font-mono text-xs text-green-400 break-all leading-relaxed">
                  node walletz-pc-connector.mjs --token={token} --api={API_BASE}
                </code>
                <button
                  onClick={copyCommand}
                  className="shrink-0 rounded-lg border border-border/50 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copiar"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-medium">Onde encontrar o script?</p>
              <p className="font-mono text-xs">scripts/walletz-pc-connector.mjs</p>
              <p>Abra o PowerShell na pasta do projeto Walletz e execute o comando acima.</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Monitorando conexão…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CapabilityGrid({ capabilities }: { capabilities: Record<string, unknown> }) {
  const files = (capabilities.files ?? {}) as Record<string, boolean>;
  const apps = (capabilities.apps ?? {}) as Record<string, boolean>;
  const browser = (capabilities.browser ?? {}) as Record<string, boolean>;
  const system = (capabilities.system ?? {}) as Record<string, boolean>;

  const items = [
    { label: 'Ler arquivos autorizados', enabled: files.read !== false, section: 'ARQUIVOS' },
    { label: 'Criar arquivos', enabled: files.create !== false, section: 'ARQUIVOS' },
    { label: 'Renomear', enabled: !!files.rename, section: 'ARQUIVOS' },
    { label: 'Mover', enabled: !!files.move, section: 'ARQUIVOS' },
    { label: 'Excluir', enabled: !!files.delete, section: 'ARQUIVOS' },
    { label: 'Abrir aplicativos autorizados', enabled: !!apps.open, section: 'APLICATIVOS' },
    { label: 'Fechar aplicativos', enabled: !!apps.close, section: 'APLICATIVOS' },
    { label: 'Abrir URL', enabled: browser.openUrl !== false, section: 'NAVEGADOR' },
    { label: 'Informações do sistema', enabled: system.info !== false, section: 'SISTEMA' },
  ];

  const sections = ['ARQUIVOS', 'APLICATIVOS', 'NAVEGADOR', 'SISTEMA'] as const;

  return (
    <div className="grid grid-cols-2 gap-4">
      {sections.map(sec => {
        const sectionItems = items.filter(i => i.section === sec);
        return (
          <div key={sec} className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec}</p>
            {sectionItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`h-3.5 w-3.5 rounded border ${item.enabled ? 'bg-primary border-primary' : 'bg-transparent border-border'}`}>
                  {item.enabled && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className={`text-xs ${item.enabled ? 'text-foreground' : 'text-muted-foreground/50'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
