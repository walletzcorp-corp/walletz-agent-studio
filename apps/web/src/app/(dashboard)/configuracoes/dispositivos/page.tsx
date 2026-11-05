'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Monitor, Wifi, WifiOff, Trash2, Settings2, ArrowLeft,
  Plus, RefreshCw, Shield, Folder, AlertTriangle,
} from 'lucide-react';
import { Button } from '@walletz/ui';
import { useAuth } from '../../../../hooks/use-auth';
import { API_BASE } from '../../../../lib/config';

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

async function apiCall(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('accessToken') ?? '';
  const r = await fetch(`${API_BASE}/v1${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}

export default function DispositivosPage() {
  const { tenantId } = useAuth();
  const [devices, setDevices] = useState<PcDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PcDevice | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await apiCall(`/tenants/${tenantId}/pc-connector/devices`);
      setDevices(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const disconnect = async (deviceId: string) => {
    if (!tenantId) return;
    if (!confirm('Desconectar este dispositivo? O agente perderá acesso ao computador.')) return;
    setDisconnecting(deviceId);
    try {
      await apiCall(`/tenants/${tenantId}/pc-connector/devices/${deviceId}`, { method: 'DELETE' });
      await load();
    } catch { /* ignore */ }
    setDisconnecting(null);
  };

  const isOnline = (d: PcDevice) =>
    !!d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 30_000;

  return (
    <div className="page-container max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/configuracoes">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Configurações
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Dispositivos</h1>
          <p className="text-sm text-muted-foreground mt-1">Computadores conectados ao Walletz Agent Studio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/integracoes/meu-computador">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Conectar computador
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="neural-card p-12 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="neural-card p-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Monitor className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Nenhum dispositivo conectado</p>
            <p className="text-sm text-muted-foreground mt-1">Conecte este computador para que agentes possam executar tarefas nele.</p>
          </div>
          <Link href="/integracoes/meu-computador">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Conectar Computador</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map(device => (
            <div key={device.id} className="neural-card p-5 space-y-4">
              {/* Device header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOnline(device) ? 'bg-green-100' : 'bg-muted/50'}`}>
                    {isOnline(device)
                      ? <Wifi className="h-5 w-5 text-green-600" />
                      : <WifiOff className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{device.deviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.platform} •{' '}
                      {isOnline(device) ? (
                        <span className="text-green-600 font-medium">Online agora</span>
                      ) : device.lastSeenAt ? (
                        `Última atividade: ${new Date(device.lastSeenAt).toLocaleString('pt-BR')}`
                      ) : 'Nunca visto online'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(selected?.id === device.id ? null : device)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Gerenciar
                  </button>
                  <button
                    onClick={() => disconnect(device.id)}
                    disabled={disconnecting === device.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded management panel */}
              {selected?.id === device.id && (
                <div className="border-t border-border pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Permissões
                    </p>
                    <CapabilityCheckboxes device={device} tenantId={tenantId ?? ''} onSaved={load} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5" /> Pastas autorizadas
                    </p>
                    {device.authorizedPaths.length > 0 ? (
                      <ul className="space-y-1">
                        {device.authorizedPaths.map(p => (
                          <li key={p} className="rounded bg-muted/50 px-3 py-1.5 font-mono text-xs">{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma pasta configurada.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Aplicativos autorizados</p>
                    <div className="flex flex-wrap gap-2">
                      {device.authorizedApps.map(app => (
                        <span key={app} className="rounded-full bg-muted/50 px-3 py-1 text-xs font-mono">{app}</span>
                      ))}
                    </div>
                  </div>

                  {!isOnline(device) && (
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 flex gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Dispositivo offline. Execute o Walletz PC Connector neste computador para ficar online.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CapabilityCheckboxes({
  device, tenantId, onSaved,
}: {
  device: PcDevice;
  tenantId: string;
  onSaved: () => void;
}) {
  const files = (device.capabilities.files ?? {}) as Record<string, boolean>;
  const apps = (device.capabilities.apps ?? {}) as Record<string, boolean>;
  const browser = (device.capabilities.browser ?? {}) as Record<string, boolean>;
  const system = (device.capabilities.system ?? {}) as Record<string, boolean>;

  const [saving, setSaving] = useState(false);
  const [caps, setCaps] = useState({ files, apps, browser, system });

  const save = async () => {
    setSaving(true);
    try {
      await apiCall(`/tenants/${tenantId}/pc-connector/devices/${device.id}/capabilities`, {
        method: 'PATCH',
        body: JSON.stringify({ capabilities: caps }),
      });
      onSaved();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const toggle = (section: keyof typeof caps, key: string) => {
    setCaps(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: !prev[section][key] },
    }));
  };

  const ITEMS = [
    { section: 'files' as const, key: 'read', label: 'Ler arquivos autorizados', risk: 'low' },
    { section: 'files' as const, key: 'create', label: 'Criar arquivos', risk: 'medium' },
    { section: 'files' as const, key: 'rename', label: 'Renomear arquivos', risk: 'medium' },
    { section: 'files' as const, key: 'move', label: 'Mover arquivos', risk: 'medium' },
    { section: 'files' as const, key: 'delete', label: 'Excluir arquivos', risk: 'high' },
    { section: 'apps' as const, key: 'open', label: 'Abrir aplicativos', risk: 'medium' },
    { section: 'apps' as const, key: 'close', label: 'Fechar aplicativos', risk: 'medium' },
    { section: 'browser' as const, key: 'openUrl', label: 'Abrir URL no navegador', risk: 'low' },
    { section: 'system' as const, key: 'info', label: 'Consultar informações do sistema', risk: 'low' },
  ];

  const riskColor = (r: string) => r === 'high' ? 'text-red-500' : r === 'medium' ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="space-y-2">
      {ITEMS.map(item => {
        const enabled = !!(caps[item.section] as Record<string, boolean>)[item.key];
        return (
          <label key={`${item.section}.${item.key}`} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => toggle(item.section, item.key)}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">{item.label}</span>
            <span className={`ml-auto text-[10px] font-medium uppercase ${riskColor(item.risk)}`}>{item.risk}</span>
          </label>
        );
      })}
      <div className="pt-2">
        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
          {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          Salvar permissões
        </Button>
      </div>
    </div>
  );
}
