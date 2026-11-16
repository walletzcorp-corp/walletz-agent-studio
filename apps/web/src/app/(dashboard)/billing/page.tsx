'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard, CheckCircle2, XCircle, Clock, Loader2, MessageCircle, Shield, Headphones,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import {
  apiErrorMessage, FEATURE_LABELS, formatBRL, LIMIT_LABELS, plansApi, SUPPORT_LABELS,
  type PlanDefinition, type PlanFeatureKey, type PlanLimits, type TenantPlanSummary,
} from '../../../lib/studio-api';
import { planWhatsappUrl } from '../../../lib/contact';

const SHOWN_LIMITS: Array<keyof PlanLimits> = ['agents', 'users', 'aiConnections', 'whatsappNumbers', 'calendars', 'webchatWidgets', 'outboundWebhooks'];
const SHOWN_FEATURES: PlanFeatureKey[] = ['webchat', 'whatsapp', 'calendars', 'outboundWebhooks', 'emailNotifications', 'emailInbox', 'crmConnectors', 'publicApi', 'whiteLabel'];

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max <= 0 ? (used > 0 ? 100 : 0) : Math.min((used / max) * 100, 100);
  const color = pct >= 100 ? 'bg-neural-danger' : pct >= 80 ? 'bg-neural-warning' : 'bg-primary';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{max === 0 ? 'Não incluído' : `${used} / ${max}`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FeatureMark({ value }: { value: PlanDefinition['features'][PlanFeatureKey] }) {
  if (value === 'available') return <CheckCircle2 className="h-4 w-4 text-neural-success mx-auto" aria-label="Incluído" />;
  if (value === 'in_development') return <Clock className="h-4 w-4 text-neural-warning mx-auto" aria-label="Em desenvolvimento" />;
  return <XCircle className="h-4 w-4 text-muted-foreground/50 mx-auto" aria-label="Não incluído" />;
}

export default function BillingPage() {
  const { tenantId } = useAuth();
  const [summary, setSummary] = useState<TenantPlanSummary | null>(null);
  const [catalog, setCatalog] = useState<PlanDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([plansApi.summary(tenantId), plansApi.catalog()])
      .then(([s, c]) => { setSummary(s.data); setCatalog(c.data); })
      .catch((err) => setError(apiErrorMessage(err, 'Não foi possível carregar o plano.')));
  }, [tenantId]);

  if (error) return <div className="page-container"><div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-4 text-sm text-neural-danger">{error}</div></div>;
  if (!summary) return <div className="page-container flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const { plan, usage } = summary;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Plano e assinatura</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Sua licença do Walletz Studio IA, limites em uso e comparação entre planos.</p>
      </div>

      {/* Plano atual */}
      <div className="neural-card p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Plano atual</p>
              <p className="text-lg font-display font-semibold text-foreground">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display font-semibold text-foreground">{formatBRL(plan.priceMonthlyCents)}<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
            <p className="text-[11px] text-muted-foreground">IA não incluída: paga direto ao seu provedor</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {SHOWN_LIMITS.map((k) => <UsageBar key={k} label={LIMIT_LABELS[k]} used={usage[k]} max={plan.limits[k]} />)}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a href={planWhatsappUrl(plan.name)} target="_blank" rel="noopener noreferrer" className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Falar com a Walletz sobre o plano
          </a>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Headphones className="h-3.5 w-3.5" /> Suporte {SUPPORT_LABELS[plan.support]} · 1ª resposta P1 em até {plan.supportTargetsHours.p1}h úteis
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Não existe “IA ilimitada”.</strong> Nenhum plano inclui créditos ou tokens. O consumo é contratado e pago
          diretamente no provedor escolhido (Claude, OpenAI, Gemini ou OpenRouter); o limite de gasto é o que você define lá. Mensagens da Meta,
          licenças Google/Microsoft e outros serviços de terceiros também são cobrados pelos respectivos fornecedores.
        </p>
      </div>

      {/* Comparativo */}
      <div className="neural-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Item</th>
              {catalog.map((p) => (
                <th key={p.slug} className={`p-3 text-center text-xs font-semibold ${p.slug === plan.slug ? 'text-primary' : 'text-foreground'}`}>
                  {p.name}{p.slug === plan.slug && <span className="block text-[10px] font-normal">seu plano</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="p-3 text-xs text-muted-foreground">Mensalidade</td>
              {catalog.map((p) => <td key={p.slug} className="p-3 text-center font-medium">{formatBRL(p.priceMonthlyCents)}</td>)}
            </tr>
            {SHOWN_LIMITS.map((k) => (
              <tr key={k}>
                <td className="p-3 text-xs text-muted-foreground">{LIMIT_LABELS[k]}</td>
                {catalog.map((p) => <td key={p.slug} className="p-3 text-center">{p.limits[k] === 0 ? '—' : p.limits[k]}</td>)}
              </tr>
            ))}
            <tr>
              <td className="p-3 text-xs text-muted-foreground">IA incluída</td>
              {catalog.map((p) => <td key={p.slug} className="p-3 text-center text-muted-foreground">Nenhuma</td>)}
            </tr>
            {SHOWN_FEATURES.map((f) => (
              <tr key={f}>
                <td className="p-3 text-xs text-muted-foreground">{FEATURE_LABELS[f]}</td>
                {catalog.map((p) => <td key={p.slug} className="p-3"><FeatureMark value={p.features[f]} /></td>)}
              </tr>
            ))}
            <tr>
              <td className="p-3 text-xs text-muted-foreground">Suporte</td>
              {catalog.map((p) => <td key={p.slug} className="p-3 text-center text-xs">{SUPPORT_LABELS[p.support]}</td>)}
            </tr>
            <tr>
              <td className="p-3 text-xs text-muted-foreground">Implantação (50/50 · à vista)</td>
              {catalog.map((p) => (
                <td key={p.slug} className="p-3 text-center text-xs">
                  {formatBRL(p.setupFeeCents)}<span className="block text-muted-foreground">{formatBRL(p.setupFeeCashCents)} à vista</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="px-3 pb-3 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-neural-success" /> incluído e disponível</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-neural-warning" /> em desenvolvimento (roadmap, sem promessa de entrega)</span>
          <span className="inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> não incluído</span>
          <span>Integrações dependem de contas, aprovações e tarifas dos fornecedores. A implantação é serviço à parte, com prazo de até 15 dias úteis após o início formal.</span>
        </p>
      </div>
    </div>
  );
}
