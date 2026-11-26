'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { whatsappApi, type WhatsappAccount, type WhatsappSendHealth } from '../lib/whatsapp-api';

const WHATSAPP_MANAGER_URL = 'https://business.facebook.com/wa/manage/home/';

const SEND: Record<WhatsappSendHealth['send'], { label: string; className: string }> = {
  available: { label: 'Envio liberado', className: 'badge-success' },
  limited: { label: 'Envio limitado', className: 'badge-warning' },
  blocked: { label: 'Envio bloqueado', className: 'badge-danger' },
  unknown: { label: 'Envio não verificado', className: 'bg-surface-2 text-muted-foreground border border-border' },
};

const when = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

/** Recebimento e envio do número, com o motivo do bloqueio e o que fazer. */
export function WhatsappSendStatus({ tenantId, account }: { tenantId: string; account: WhatsappAccount }) {
  const [health, setHealth] = useState<WhatsappSendHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setChecking(true);
    setError(null);
    try {
      setHealth((await whatsappApi.health(tenantId, account.id, refresh)).data);
    } catch {
      setError('Não foi possível verificar a situação do número agora.');
    } finally {
      setChecking(false);
    }
  }, [tenantId, account.id]);

  useEffect(() => { void load(false); }, [load]);

  if (!health) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {checking ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando envio…</> : error}
      </div>
    );
  }

  const send = SEND[health.send];
  const problem = health.send === 'blocked' || health.send === 'limited';
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${health.send === 'blocked' ? 'border-neural-danger/40 bg-neural-danger/5' : problem ? 'border-neural-warning/40 bg-neural-warning/5' : 'border-border bg-surface-1'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium badge-success inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Recebendo
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1 ${send.className}`}>
          {health.send === 'blocked' ? <XCircle className="h-3 w-3" /> : health.send === 'limited' ? <AlertTriangle className="h-3 w-3" /> : null}
          {send.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {health.lastInboundAt ? `Última mensagem recebida: ${when(health.lastInboundAt)}` : 'Nenhuma mensagem recebida ainda'}
        </span>
      </div>

      {health.reasons.length > 0 && (
        <ul className="space-y-1.5">
          {health.reasons.map((r, i) => (
            <li key={i} className="text-xs text-foreground">
              <span className="font-medium">{r.message}</span>
              {r.action && <span className="block text-muted-foreground">Como resolver: {r.action}</span>}
            </li>
          ))}
        </ul>
      )}

      {health.lastFailure && health.failedSinceLastSuccess > 0 && (
        <p className="text-xs text-muted-foreground">
          {health.failedSinceLastSuccess === 1 ? '1 resposta não entregue' : `${health.failedSinceLastSuccess} respostas não entregues`}
          {health.lastSuccessAt ? ` desde o último envio com sucesso (${when(health.lastSuccessAt)})` : ''}.
          {' '}Última falha: {when(health.lastFailure.at)}. As conversas afetadas estão em{' '}
          <Link href="/conversas" className="text-neural-blue hover:underline">Conversas</Link>, aguardando atendente.
        </p>
      )}
      {health.metaUnavailable && (
        <p className="text-xs text-muted-foreground">A Meta não respondeu à consulta; a situação acima vem só dos envios registrados.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {problem && (
          <a href={WHATSAPP_MANAGER_URL} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-3 py-1.5 text-xs border border-border inline-flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir WhatsApp Manager
          </a>
        )}
        <button
          disabled={checking}
          onClick={() => void load(true)}
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs border border-border inline-flex items-center gap-1.5"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Verificar agora
        </button>
      </div>
    </div>
  );
}

/** Aviso no Início quando algum número não consegue enviar. Sem WhatsApp no plano, não mostra nada. */
export function WhatsappHealthBanner({ tenantId }: { tenantId: string }) {
  const [blocked, setBlocked] = useState<Array<{ account: WhatsappAccount; health: WhatsappSendHealth }>>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: accounts } = await whatsappApi.listAccounts(tenantId);
        const results = await Promise.all(accounts
          .filter((a) => a.status === 'connected')
          .map(async (account) => ({ account, health: (await whatsappApi.health(tenantId, account.id)).data })));
        if (active) setBlocked(results.filter((r) => r.health.send === 'blocked'));
      } catch { /* sem WhatsApp no plano ou sem permissão: nada a avisar */ }
    })();
    return () => { active = false; };
  }, [tenantId]);

  if (blocked.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-4 space-y-1">
      {blocked.map(({ account, health }) => (
        <p key={account.id} className="text-sm text-foreground flex items-start gap-2">
          <XCircle className="h-4 w-4 text-neural-danger shrink-0 mt-0.5" />
          <span>
            <strong>WhatsApp {account.phoneNumber ?? account.phoneNumberId}: o agente não consegue responder.</strong>{' '}
            {health.reasons[0]?.message ?? 'A Meta está recusando o envio.'}{' '}
            <Link href="/canais/whatsapp" className="text-neural-blue hover:underline">Ver detalhes</Link>
          </span>
        </p>
      ))}
    </div>
  );
}
