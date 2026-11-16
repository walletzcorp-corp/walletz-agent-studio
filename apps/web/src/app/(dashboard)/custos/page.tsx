'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Zap, Smartphone, Calendar, ExternalLink, Loader2, Activity, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import {
  aiConnectionsApi, apiErrorMessage, formatBRL, plansApi,
  type AiConnection, type AiProviderInfo, type TenantPlanSummary,
} from '../../../lib/studio-api';

export default function CustosPage() {
  const { tenantId } = useAuth();
  const [summary, setSummary] = useState<TenantPlanSummary | null>(null);
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([plansApi.summary(tenantId), aiConnectionsApi.list(tenantId), aiConnectionsApi.providers(tenantId)])
      .then(([s, c, p]) => { setSummary(s.data); setConnections(c.data); setProviders(p.data); })
      .catch((err) => setError(apiErrorMessage(err, 'Não foi possível carregar os custos.')));
  }, [tenantId]);

  if (error) return <div className="page-container"><div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-4 text-sm text-neural-danger">{error}</div></div>;
  if (!summary) return <div className="page-container flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const linkFor = (c: AiConnection) => providers.find((p) => p.id === c.provider)?.links.buyCredits;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Custos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          O que a Walletz cobra e o que você paga diretamente a cada fornecedor.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cobrado pela Walletz</h2>
        <div className="neural-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Shield className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-foreground">Assinatura Walletz Studio IA · {summary.plan.name}</p>
              <p className="text-xs text-muted-foreground">Licença da plataforma, hospedagem, atualizações e suporte {summary.plan.support === 'basico' ? 'básico' : 'do plano'}. Não inclui IA.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-display font-semibold text-foreground">{formatBRL(summary.plan.priceMonthlyCents)}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
            <Link href="/billing" className="text-xs text-neural-blue hover:underline">Ver plano e limites</Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pago diretamente aos fornecedores</h2>

        <div className="neural-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neural-blue/10 text-neural-blue"><Zap className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Inteligência artificial (tokens)</p>
              <p className="text-xs text-muted-foreground">Cobrado pelo provedor na sua conta. A Walletz não recebe esse valor nem cobra taxa sobre ele.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Uso técnico no mês</p>
              <p className="text-sm font-semibold text-foreground">{summary.aiTokensMonth.toLocaleString('pt-BR')} tokens</p>
            </div>
          </div>
          {connections.length === 0 ? (
            <p className="text-xs text-neural-warning inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Nenhum provedor conectado. <Link href="/configuracoes/ia" className="text-neural-blue hover:underline">Conectar chave de IA</Link>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {connections.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs">
                  <span className="text-foreground">{c.providerName} · {c.defaultModel}</span>
                  {linkFor(c) && (
                    <a href={linkFor(c)} target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline inline-flex items-center gap-1">
                      Ver saldo e fatura no provedor <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="neural-card p-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] shrink-0"><Smartphone className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">WhatsApp / Meta</p>
            <p className="text-xs text-muted-foreground">
              Mensagens, templates e categorias são cobrados pela Meta (ou BSP) na conta do cliente.{' '}
              <a href="https://business.whatsapp.com/products/platform-pricing" target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline">Tabela de preços da Meta</a>
            </p>
          </div>
        </div>

        <div className="neural-card p-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground shrink-0"><Calendar className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Google Workspace / Microsoft 365</p>
            <p className="text-xs text-muted-foreground">Licenças das agendas e e-mails são contratadas com o Google ou a Microsoft.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
