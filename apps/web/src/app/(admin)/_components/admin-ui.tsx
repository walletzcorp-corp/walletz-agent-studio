'use client';

import Link from 'next/link';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@walletz/ui';
import {
  TENANT_STATUS, actionLabel, fmtAgo, fmtCompact, templateLabel, type ActivityItem,
} from '../../../lib/admin-api';

/* Blocos visuais compartilhados pelas telas do painel admin. */

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function KpiCard({
  label, value, sub, icon: Icon, color = 'text-foreground',
}: { label: string; value: string; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function Section({ title, right, children, className }: {
  title: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function TenantStatusBadge({ status }: { status: string }) {
  const s = TENANT_STATUS[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', s.className)}>{s.label}</span>;
}

/** Lista de barras horizontais (ranking). */
export function BarList({ items, emptyText = 'Sem dados ainda.' }: {
  items: Array<{ key: string; label: React.ReactNode; value: number; hint?: string }>;
  emptyText?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-foreground">{i.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {fmtCompact(i.value)}{i.hint ? <span className="ml-1 text-xs">{i.hint}</span> : null}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Série diária em colunas (30 dias). */
export function DailyBars({ data, valueKey, label }: {
  data: Array<Record<string, number | string>>; valueKey: string; label: string;
}) {
  const values = data.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`${label}: ${fmtCompact(total)} em 30 dias`}>
        {data.map((d, idx) => {
          const v = values[idx] ?? 0;
          return (
            <div
              key={String(d['day'])}
              title={`${String(d['day'])}: ${fmtCompact(v)}`}
              className={cn('flex-1 rounded-sm', v > 0 ? 'bg-primary/80' : 'bg-muted')}
              style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 4}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{String(data[0]?.['day'] ?? '')}</span>
        <span>{label}: {fmtCompact(total)}</span>
        <span>{String(data[data.length - 1]?.['day'] ?? '')}</span>
      </div>
    </div>
  );
}

/** Barra de uso vs limite. */
export function UsageMeter({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return <p className="text-xs text-muted-foreground">{fmtCompact(used)} tokens · sem limite definido</p>;
  }
  const pct = limit === 0 ? 100 : Math.min(100, (used / limit) * 100);
  const color = pct >= 100 ? 'bg-neural-danger' : pct >= 80 ? 'bg-neural-warning' : 'bg-neural-success';
  return (
    <div>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn('h-2 rounded-full', color)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {fmtCompact(used)} de {fmtCompact(limit)} tokens ({pct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%)
      </p>
    </div>
  );
}

export function TemplateChips({ byTemplate }: { byTemplate: Record<string, number> }) {
  const entries = Object.entries(byTemplate).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <span className="text-xs text-muted-foreground">nenhum agente</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([tpl, n]) => (
        <span key={tpl} className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {templateLabel(tpl)} <span className="text-foreground">{n}</span>
        </span>
      ))}
    </div>
  );
}

export function ActivityList({ items, showTenant = true }: { items: ActivityItem[]; showTenant?: boolean }) {
  if (items.length === 0) return <EmptyState text="Nenhuma atividade registrada ainda." />;
  return (
    <ul className="divide-y divide-border/60">
      {items.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className={cn('truncate', a.action.startsWith('admin.') ? 'text-neural-danger' : 'text-foreground')}>
              {actionLabel(a.action)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {a.userEmail ?? 'sistema'}
              {showTenant && a.tenantName && a.tenantId && (
                <> · <Link href={`/admin/clientes/${a.tenantId}`} className="hover:text-primary">{a.tenantName}</Link></>
              )}
              {typeof a.metadata['reason'] === 'string' && <> · “{a.metadata['reason']}”</>}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground" title={new Date(a.createdAt).toLocaleString('pt-BR')}>
            {fmtAgo(a.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, pageSize, total, onPage }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm">
      <button className="btn-ghost rounded-md border border-border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span className="text-muted-foreground">{page} de {pages}</span>
      <button className="btn-ghost rounded-md border border-border px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Próxima
      </button>
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-neural-danger/30 bg-neural-danger/5 py-8 text-sm">
      <AlertTriangle className="h-5 w-5 text-neural-danger" />
      <p className="text-foreground">{message}</p>
      {onRetry && <button className="btn-ghost rounded-md border border-border px-3 py-1" onClick={onRetry}>Tentar de novo</button>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
      <Inbox className="h-5 w-5" /> {text}
    </div>
  );
}
