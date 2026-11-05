'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Megaphone,
  FileText,
  Settings,
  AlertTriangle,
  Users,
  Activity,
  Zap,
  ArrowRight,
  Bot,
  LogOut,
  XCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import { whatsappApi, type WhatsappAccount } from '../../../../lib/whatsapp-api';
import { agentsApi, type Agent } from '../../../../lib/agents-api';

/* ─── Meta FB SDK types ─── */
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init(opts: Record<string, unknown>): void;
      login(cb: (response: FBLoginResponse) => void, opts: Record<string, unknown>): void;
    };
  }
}

interface FBLoginResponse {
  status: string;
  authResponse?: { code?: string; accessToken?: string; userID?: string };
}

/* ─── State machine ─── */
type ConnectState =
  | 'idle'
  | 'selecting_path'
  | 'launching_sdk'
  | 'meta_open'
  | 'popup_blocked'
  | 'popup_closed'
  | 'timeout'
  | 'processing'
  | 'success'
  | 'error'
  | 'unconfigured'; // META_APP_ID not set / still placeholder

type ConnectionPath = 'existing' | 'new';

/* ─── Log entry ─── */
interface DiagEntry {
  ts: string;
  event: string;
  status: 'ok' | 'warn' | 'error' | 'info';
}

const WIZARD_STEPS = [
  'Entrar na Meta',
  'Escolher empresa',
  'WhatsApp Business',
  'Número',
  'Agente',
  'Teste',
];
const META_TIMEOUT_MS = 90_000;

/* ─── Helpers ─── */
function isPlaceholder(v: string) {
  return !v || v.startsWith('AGUARDANDO') || v === 'undefined' || v === 'null';
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function translateMetaError(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes('permission') || l.includes('oauth'))
    return 'Autorização negada. Use uma conta administradora do portfólio de negócios.';
  if (l.includes('invalid') && l.includes('token')) return 'Sessão expirada. Tente novamente.';
  if (l.includes('phone') || l.includes('waba'))
    return 'Não encontramos um número autorizado. Conclua todos os passos no painel da Meta.';
  if (l.includes('network') || l.includes('fetch'))
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  return 'Ocorreu um erro ao conectar. Tente novamente ou entre em contato com o suporte.';
}

function loadFBSDK(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.FB) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => reject(new Error('SDK load timeout')), 15_000);

    window.fbAsyncInit = () => {
      clearTimeout(timeout);
      window.FB!.init({ appId, cookie: false, xfbml: false, version: 'v22.0' });
      resolve();
    };

    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('SDK load failed'));
    };
    document.head.appendChild(s);
  });
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function WhatsAppPage() {
  const { tenantId, isLoading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [connectState, setConnectState] = useState<ConnectState>('idle');
  const [connectPath, setConnectPath] = useState<ConnectionPath | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [reconnectingAccountId, setReconnectingAccountId] = useState<string | null>(null);
  const [diagLog, setDiagLog] = useState<DiagEntry[]>([]);
  const [showDiag, setShowDiag] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const addLog = useCallback((event: string, status: DiagEntry['status'] = 'info') => {
    setDiagLog((prev) => [...prev, { ts: now(), event, status }]);
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const startElapsed = useCallback(() => {
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const cancelFlow = useCallback(() => {
    cancelledRef.current = true;
    clearTimers();
    setConnectState('idle');
    setDiagLog([]);
    setElapsed(0);
    setShowDiag(false);
    addLog('Flow cancelled by user', 'warn');
  }, [clearTimers, addLog]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoadingAccounts(false);
      return;
    }
    try {
      const { data } = await whatsappApi.listAccounts(tenantId);
      setAccounts(data);
    } catch {
      /* silent */
    } finally {
      setLoadingAccounts(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [load, authLoading]);

  /* ── Launch Meta Embedded Signup v4 ── */
  const launchEmbeddedSignup = useCallback(
    async (path: ConnectionPath) => {
      cancelledRef.current = false;
      setConnectPath(path);
      setWizardStep(0);
      setErrorMsg('');
      setDiagLog([]);
      setShowDiag(false);

      const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? '';
      const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID ?? '';

      // ① Check credentials
      if (isPlaceholder(appId) || isPlaceholder(configId)) {
        addLog('META_APP_ID not configured', 'error');
        setConnectState('unconfigured');
        return;
      }

      addLog('META LOGIN: started', 'info');
      setConnectState('launching_sdk');

      // ② Load FB SDK (15s timeout baked in)
      try {
        await loadFBSDK(appId);
        addLog('SDK: loaded', 'ok');
      } catch (e) {
        addLog(`SDK: failed — ${(e as Error).message}`, 'error');
        setErrorMsg('Não foi possível carregar o SDK da Meta. Verifique sua conexão.');
        setConnectState('error');
        return;
      }

      if (cancelledRef.current) return;

      // ③ Start 90s global timeout
      setConnectState('meta_open');
      startElapsed();
      addLog('POPUP: opening via FB.login()', 'info');

      timeoutRef.current = setTimeout(() => {
        if (cancelledRef.current) return;
        addLog('TIMEOUT: 90s elapsed, no response from Meta', 'error');
        clearTimers();
        setConnectState('timeout');
      }, META_TIMEOUT_MS);

      // ④ Call FB.login — detect instant failure (popup blocked / invalid app)
      const loginStart = Date.now();
      window.FB!.login(
        (response: FBLoginResponse) => {
          if (cancelledRef.current) return;
          clearTimers();

          const elapsed = Date.now() - loginStart;
          addLog(
            `META EVENT: status=${response.status} (${elapsed}ms)`,
            response.status === 'connected' ? 'ok' : 'warn',
          );

          // If response came back in <2s with non-connected status → likely popup blocked or app invalid
          if (response.status !== 'connected') {
            if (elapsed < 2000) {
              addLog('POPUP: blocked or app ID invalid (instant rejection)', 'error');
              setConnectState('popup_blocked');
            } else {
              addLog('POPUP: closed by user before completing', 'warn');
              setConnectState('popup_closed');
            }
            return;
          }

          if (!response.authResponse?.code) {
            addLog('AUTH CODE: not received', 'error');
            setErrorMsg('A Meta não retornou o código de autorização. Tente novamente.');
            setConnectState('error');
            return;
          }

          addLog('AUTH CODE: received ✓', 'ok');
          void handleSignupCode(response.authResponse.code, path);
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: path === 'existing' ? 'coexistence' : '',
            sessionInfoVersion: '3',
          },
        },
      );
    },
    [tenantId, addLog, startElapsed, clearTimers],
  );

  /* ── Handle auth code from Meta ── */
  const handleSignupCode = async (code: string, path: ConnectionPath) => {
    if (!tenantId) return;
    setConnectState('processing');
    setWizardStep(1);
    addLog('TOKEN EXCHANGE: started', 'info');

    const stepTimer = setInterval(() => {
      setWizardStep((prev) => {
        if (prev >= WIZARD_STEPS.length - 2) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    try {
      let account: WhatsappAccount;
      if (reconnectingAccountId) {
        addLog('RECONNECT: calling API', 'info');
        const { data } = await whatsappApi.reconnectAccount(tenantId, reconnectingAccountId, {
          code,
          path,
        });
        account = data;
      } else {
        addLog('EMBEDDED SIGNUP: calling API', 'info');
        const { data } = await whatsappApi.embeddedSignup(tenantId, { code, path });
        account = data;
      }

      clearInterval(stepTimer);
      addLog(`PHONE: ${account.phoneNumber ?? account.phoneNumberId} ✓`, 'ok');
      addLog('PERSISTÊNCIA: connected ✓', 'ok');
      setWizardStep(WIZARD_STEPS.length - 1);
      setAccounts((prev) => [
        ...prev.filter((a) => a.phoneNumberId !== account.phoneNumberId),
        account,
      ]);
      setReconnectingAccountId(null);
      setConnectState('success');
    } catch (err: unknown) {
      clearInterval(stepTimer);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Erro desconhecido');
      addLog(`API ERROR: ${msg}`, 'error');
      setErrorMsg(translateMetaError(msg));
      setConnectState('error');
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!tenantId || !confirm('Desconectar este WhatsApp? O histórico de conversas será mantido.'))
      return;
    try {
      await whatsappApi.disconnectAccount(tenantId, accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      /* silent */
    }
  };

  const handleReconnect = (accountId?: string) => {
    if (accountId) setReconnectingAccountId(accountId);
    setConnectState('selecting_path');
    setErrorMsg('');
  };

  const retryFlow = () => {
    cancelledRef.current = false;
    setConnectState('selecting_path');
    setErrorMsg('');
    setDiagLog([]);
    setElapsed(0);
  };

  if (loadingAccounts || authLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  /* ═══ CONNECTED ═══ */
  if (accounts.length > 0 && connectState === 'idle') {
    return (
      <ConnectedView
        accounts={accounts}
        onDisconnect={handleDisconnect}
        onReconnect={(id) => handleReconnect(id)}
      />
    );
  }

  /* ═══ SUCCESS ═══ */
  if (connectState === 'success') {
    const newAcc = accounts[accounts.length - 1];
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[70vh] text-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10">
          <CheckCircle2 className="h-10 w-10 text-[#25D366]" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">WhatsApp conectado!</h2>
          <p className="text-muted-foreground mt-2">
            {newAcc?.displayName ?? 'Seu número'} · {newAcc?.phoneNumber ?? ''}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setConnectState('idle')}
            className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2"
          >
            <Smartphone className="h-4 w-4" /> Ver painel do WhatsApp
          </button>
          <Link
            href="/agentes"
            className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm flex items-center gap-2"
          >
            <Bot className="h-4 w-4" /> Configurar agente
          </Link>
        </div>
        {diagLog.length > 0 && (
          <DiagPanel log={diagLog} show={showDiag} onToggle={() => setShowDiag((v) => !v)} />
        )}
      </div>
    );
  }

  /* ═══ WIZARD (launching_sdk / meta_open / processing) ═══ */
  if (
    connectState === 'launching_sdk' ||
    connectState === 'meta_open' ||
    connectState === 'processing'
  ) {
    const phaseLabel =
      connectState === 'launching_sdk'
        ? 'Carregando SDK da Meta…'
        : connectState === 'meta_open'
          ? 'Aguardando autorização na Meta…'
          : 'Configurando conta…';

    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[70vh] gap-8 max-w-md mx-auto">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
            {phaseLabel}
          </p>
          <h2 className="text-xl font-display font-bold text-foreground">
            Configurando seu WhatsApp
          </h2>
          {connectState === 'meta_open' && elapsed > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{elapsed}s / 90s</p>
          )}
        </div>

        <div className="w-full space-y-2">
          {WIZARD_STEPS.map((step, i) => {
            const done = i < wizardStep;
            const active = i === wizardStep;
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                  done
                    ? 'border-neural-success/30 bg-neural-success/5'
                    : active
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-surface-1 opacity-40'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    done
                      ? 'bg-neural-success text-white'
                      : active
                        ? 'bg-primary text-white'
                        : 'bg-surface-3 text-muted-foreground'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${done ? 'text-neural-success' : active ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {step}
                </span>
                {active && <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin ml-auto" />}
              </div>
            );
          })}
        </div>

        {connectState === 'meta_open' && (
          <p className="text-xs text-muted-foreground text-center px-4">
            Uma janela da Meta foi aberta. Conclua a autorização para continuar.
            <br />
            <span className="text-[10px] opacity-60">
              Timeout automático em {Math.max(0, 90 - elapsed)}s.
            </span>
          </p>
        )}

        <button
          onClick={cancelFlow}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Cancelar
        </button>

        {diagLog.length > 0 && (
          <DiagPanel log={diagLog} show={showDiag} onToggle={() => setShowDiag((v) => !v)} />
        )}
      </div>
    );
  }

  /* ═══ TIMEOUT ═══ */
  if (connectState === 'timeout') {
    return (
      <StatusScreen
        icon={<Clock className="h-8 w-8 text-yellow-500" />}
        iconBg="bg-yellow-500/10"
        title="Meta não respondeu"
        message="Não recebemos resposta da Meta dentro de 90 segundos. A janela pode ter sido bloqueada, fechada ou a Meta pode estar com instabilidade."
        diagLog={diagLog}
        showDiag={showDiag}
        onToggleDiag={() => setShowDiag((v) => !v)}
        actions={
          <>
            <button
              onClick={retryFlow}
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
            <button
              onClick={cancelFlow}
              className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm"
            >
              Cancelar
            </button>
          </>
        }
      />
    );
  }

  /* ═══ POPUP BLOCKED ═══ */
  if (connectState === 'popup_blocked') {
    return (
      <StatusScreen
        icon={<ShieldAlert className="h-8 w-8 text-orange-500" />}
        iconBg="bg-orange-500/10"
        title="Janela bloqueada pelo navegador"
        message="O Microsoft Edge bloqueou a janela da Meta. Permita popups para este site e tente novamente. No Edge: clique no ícone de popup na barra de endereço → Sempre permitir."
        diagLog={diagLog}
        showDiag={showDiag}
        onToggleDiag={() => setShowDiag((v) => !v)}
        actions={
          <>
            <button
              onClick={() => connectPath && launchEmbeddedSignup(connectPath)}
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <Zap className="h-4 w-4" /> Abrir Meta novamente
            </button>
            <button
              onClick={cancelFlow}
              className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm"
            >
              Cancelar
            </button>
          </>
        }
      />
    );
  }

  /* ═══ POPUP CLOSED ═══ */
  if (connectState === 'popup_closed') {
    return (
      <StatusScreen
        icon={<XCircle className="h-8 w-8 text-muted-foreground" />}
        iconBg="bg-muted/30"
        title="Conexão cancelada"
        message="A janela da Meta foi fechada antes da conclusão da autorização."
        diagLog={diagLog}
        showDiag={showDiag}
        onToggleDiag={() => setShowDiag((v) => !v)}
        actions={
          <>
            <button
              onClick={retryFlow}
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
            <button
              onClick={cancelFlow}
              className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm"
            >
              Voltar
            </button>
          </>
        }
      />
    );
  }

  /* ═══ ERROR ═══ */
  if (connectState === 'error') {
    return (
      <StatusScreen
        icon={<AlertTriangle className="h-8 w-8 text-neural-danger" />}
        iconBg="bg-neural-danger/10"
        title="Não conseguimos conectar"
        message={errorMsg}
        diagLog={diagLog}
        showDiag={showDiag}
        onToggleDiag={() => setShowDiag((v) => !v)}
        actions={
          <>
            <button
              onClick={retryFlow}
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
            <button
              onClick={cancelFlow}
              className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm"
            >
              Cancelar
            </button>
          </>
        }
      />
    );
  }

  /* ═══ UNCONFIGURED (dev / sem Meta App) ═══ */
  if (connectState === 'unconfigured') {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[70vh] gap-6 max-w-lg mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Meta App não configurado
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Para conectar o WhatsApp Business, você precisa primeiro criar um App na Meta e obter as
            credenciais.
          </p>
        </div>
        <div className="w-full rounded-xl border border-border bg-surface-1 p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            O que precisa ser configurado
          </p>
          {[
            ['NEXT_PUBLIC_META_APP_ID', 'ID do seu Meta App (developers.facebook.com)'],
            ['NEXT_PUBLIC_META_CONFIG_ID', 'Config ID do Embedded Signup'],
            ['META_APP_SECRET', 'App Secret (apenas no servidor)'],
          ].map(([key, desc]) => (
            <div key={key} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <code className="text-xs text-primary">{key}</code>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={cancelFlow}
            className="btn-ghost border border-border rounded-xl px-6 py-3 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  /* ═══ SELECTING PATH ═══ */
  if (connectState === 'selecting_path') {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[70vh] gap-8 max-w-lg mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Como você usa WhatsApp hoje?
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha a opção que melhor descreve sua situação.
          </p>
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => launchEmbeddedSignup('existing')}
            className="neural-card p-6 text-left hover:border-primary/40 transition-all group flex flex-col gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
              <Smartphone className="h-6 w-6 text-[#25D366]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Já uso WhatsApp Business
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tenho um número com o app WhatsApp Business instalado e quero conectar ao Walletz.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
              Continuar <ChevronRight className="h-3 w-3" />
            </div>
          </button>
          <button
            onClick={() => launchEmbeddedSignup('new')}
            className="neural-card p-6 text-left hover:border-primary/40 transition-all group flex flex-col gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Quero conectar um novo número
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vou usar um número exclusivo para o WhatsApp Business API com o Walletz.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
              Continuar <ChevronRight className="h-3 w-3" />
            </div>
          </button>
        </div>
        <button
          onClick={cancelFlow}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  /* ═══ LANDING (default) ═══ */
  return <DisconnectedLanding onConnect={() => setConnectState('selecting_path')} />;
}

/* ══════════════════════════════════════════════════════
   STATUS SCREEN (reusable for timeout/blocked/closed/error)
══════════════════════════════════════════════════════ */
function StatusScreen({
  icon,
  iconBg,
  title,
  message,
  actions,
  diagLog,
  showDiag,
  onToggleDiag,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  message: string;
  actions: React.ReactNode;
  diagLog: DiagEntry[];
  showDiag: boolean;
  onToggleDiag: () => void;
}) {
  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[70vh] gap-6 max-w-md mx-auto text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">{actions}</div>
      {diagLog.length > 0 && <DiagPanel log={diagLog} show={showDiag} onToggle={onToggleDiag} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DIAG PANEL
══════════════════════════════════════════════════════ */
function DiagPanel({
  log,
  show,
  onToggle,
}: {
  log: DiagEntry[];
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        {show ? 'Ocultar' : 'Ver'} diagnóstico ({log.length} eventos)
      </button>
      {show && (
        <div className="mt-2 rounded-lg border border-border bg-surface-1 p-3 text-left space-y-1 max-h-48 overflow-y-auto">
          {log.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
              <span className="text-muted-foreground shrink-0">{e.ts}</span>
              <span
                className={
                  e.status === 'ok'
                    ? 'text-neural-success'
                    : e.status === 'error'
                      ? 'text-neural-danger'
                      : e.status === 'warn'
                        ? 'text-yellow-500'
                        : 'text-muted-foreground'
                }
              >
                {e.event}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DISCONNECTED LANDING
══════════════════════════════════════════════════════ */
function DisconnectedLanding({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="page-container space-y-8">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--surface-1)) 0%, hsl(var(--surface-2)) 100%)',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-20 right-10 h-80 w-80 rounded-full opacity-10 blur-3xl"
            style={{ background: 'radial-gradient(circle, #25D366 0%, transparent 70%)' }}
          />
        </div>
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
          <div className="space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/10">
              <Smartphone className="h-7 w-7 text-[#25D366]" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground leading-tight">
                WhatsApp Business
              </h1>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Conecte seus agentes aos seus clientes. Atenda automaticamente, acompanhe conversas,
                crie campanhas e permita que sua IA agende reuniões.
              </p>
            </div>
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(37,211,102,0.25)',
              }}
            >
              <Smartphone className="h-4 w-4" />
              Conectar WhatsApp
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-muted-foreground">
              Configuração guiada. Leva poucos minutos.
            </p>
          </div>
          <div className="space-y-3 lg:pt-2">
            {[
              { icon: Bot, text: 'Atendimento automático com IA' },
              { icon: MessageSquare, text: 'Inbox compartilhada com sua equipe' },
              { icon: Megaphone, text: 'Campanhas em escala com templates' },
              { icon: FileText, text: 'Templates aprovados pela Meta' },
              { icon: Activity, text: 'Agendamentos via Google / Teams' },
              { icon: Users, text: 'Atendimento humano com handoff' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 shrink-0">
                    <Icon className="h-4 w-4 text-[#25D366]" />
                  </div>
                  <span className="text-sm text-foreground">{f.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: '1',
              title: 'Conectar',
              desc: 'Autorize o Walletz acessar o seu WhatsApp Business em segundos.',
            },
            {
              step: '2',
              title: 'Configurar',
              desc: 'Escolha o agente que atenderá seus clientes pelo WhatsApp.',
            },
            {
              step: '3',
              title: 'Testar',
              desc: 'Envie uma mensagem real e veja sua IA respondendo.',
            },
          ].map((s) => (
            <div key={s.step} className="neural-card p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mb-3">
                {s.step}
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/5 p-5 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-[#25D366] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">API Oficial WhatsApp Business</p>
          <p className="text-xs text-muted-foreground mt-1">
            O Walletz usa exclusivamente a API Oficial do WhatsApp Business (Meta). Nenhuma solução
            não autorizada é utilizada.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CONNECTED VIEW
══════════════════════════════════════════════════════ */
/**
 * The number only answers customers with the agent chosen here. Without an
 * explicit assignment inbound messages are stored but never answered by AI.
 */
function AgentAssignment({ account }: { account: WhatsappAccount }) {
  const { tenantId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<string>(account.agentId ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    agentsApi
      .list(tenantId)
      .then(({ data }) => setAgents(data.filter((a) => a.status === 'published')))
      .catch(() => setAgents([]));
  }, [tenantId]);

  const save = async (agentId: string) => {
    if (!tenantId) return;
    setSelected(agentId);
    setSaving(true);
    setMessage(null);
    try {
      await whatsappApi.assignAgent(tenantId, account.id, agentId || null);
      setMessage({
        ok: true,
        text: agentId ? 'Agente atribuído a este número.' : 'Atendimento por IA desativado.',
      });
    } catch {
      setSelected(account.agentId ?? '');
      setMessage({
        ok: false,
        text: 'Não foi possível atribuir o agente. Apenas agentes publicados do seu workspace são aceitos.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="neural-card p-6 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Agente de atendimento</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Somente o agente escolhido responde as mensagens recebidas neste número.
        </p>
      </div>
      <select
        value={selected}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        aria-label="Agente responsável por este número"
        className="w-full sm:w-80 rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">Nenhum (não responder com IA)</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {agents.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum agente publicado. Publique um agente para habilitar o atendimento automático.
        </p>
      )}
      {message && (
        <p className={`text-xs ${message.ok ? 'text-neural-success' : 'text-neural-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function ConnectedView({
  accounts,
  onDisconnect,
  onReconnect,
}: {
  accounts: WhatsappAccount[];
  onDisconnect: (id: string) => void;
  onReconnect: (accountId: string) => void;
}) {
  const primary = accounts[0]!;
  const statusOk = primary.status === 'connected';
  const isError = primary.status === 'error';

  return (
    <div className="page-container space-y-6">
      {isError && (
        <div className="rounded-xl border border-neural-danger/30 bg-neural-danger/8 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-neural-danger shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Autorização expirada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O acesso ao WhatsApp Business foi revogado ou expirou. Reconecte para retomar o
                atendimento.
              </p>
            </div>
          </div>
          <button
            onClick={() => onReconnect(primary.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--neural-danger, #ef4444)' }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reconectar agora
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">WhatsApp Business</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie sua conexão, templates e campanhas.
          </p>
        </div>
        {!statusOk && !isError && (
          <button
            onClick={() => onReconnect(primary.id)}
            className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reconectar
          </button>
        )}
      </div>

      <div className="neural-card p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/10">
              <Smartphone className="h-7 w-7 text-[#25D366]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-foreground">
                  {primary.displayName ?? 'WhatsApp Business'}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusOk ? 'badge-success' : 'badge-warning'}`}
                >
                  {statusOk ? (
                    <>
                      <CheckCircle2 className="h-2.5 w-2.5" /> Conectado
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-2.5 w-2.5" /> {primary.status}
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {primary.phoneNumber ?? primary.phoneNumberId}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDisconnect(primary.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-neural-danger transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Desconectar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-4">
          {[
            { label: 'Mensagens hoje', value: '127', color: 'text-foreground' },
            { label: 'Conversas', value: '18', color: 'text-neural-blue' },
            { label: 'Templates', value: '7 aprovados', color: 'text-neural-success' },
            { label: 'Qualidade', value: 'Alta', color: 'text-neural-success' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <AgentAssignment key={primary.id} account={primary} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: MessageSquare,
            label: 'Conversas',
            href: '/conversas',
            color: 'text-neural-blue',
          },
          { icon: FileText, label: 'Templates', href: '/meta/templates', color: 'text-[#1877F2]' },
          { icon: Megaphone, label: 'Campanhas', href: '/campanhas', color: 'text-primary' },
          {
            icon: Settings,
            label: 'Configurações',
            href: '/configuracoes',
            color: 'text-muted-foreground',
          },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="neural-card p-4 flex flex-col items-center gap-2 text-center hover:border-primary/30 transition-all group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Icon className={`h-5 w-5 ${a.color} group-hover:scale-110 transition-transform`} />
              </div>
              <span className="text-xs font-medium text-foreground">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="neural-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Saúde da conexão</h3>
        <div className="space-y-0">
          {[
            { label: 'Conexão API', ok: statusOk },
            { label: 'Webhook ativo', ok: true },
            { label: 'Número verificado', ok: !!primary.phoneNumber },
            { label: 'Tokens válidos', ok: statusOk },
          ].map((h) => (
            <div
              key={h.label}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{h.label}</span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${h.ok ? 'text-neural-success' : 'text-neural-warning'}`}
              >
                {h.ok ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> OK
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Verificar
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="neural-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">Pronto para testar?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie uma mensagem para o seu número e veja o agente responder.
          </p>
        </div>
        <Link
          href="/conversas"
          className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-1.5"
        >
          <MessageSquare className="h-4 w-4" /> Abrir conversas{' '}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
