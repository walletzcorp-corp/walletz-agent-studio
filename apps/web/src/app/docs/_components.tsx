import type { ReactNode } from 'react';

/** Blocos de texto dos guias públicos (/docs). Componentes de servidor, sem estado. */

export function DocTitle({ title, intro }: { title: string; intro: ReactNode }) {
  return (
    <header className="space-y-2 border-b border-border pb-6">
      <h1 className="text-3xl font-display font-semibold text-foreground">{title}</h1>
      <p className="text-base text-muted-foreground">{intro}</p>
    </header>
  );
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 pt-6 text-xl font-display font-semibold text-foreground">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-3 text-base font-semibold text-foreground">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">{children}</ol>;
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>;
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

export function Pre({ title, children }: { title?: string; children: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {title && <div className="border-b border-border bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{title}</div>}
      <pre className="overflow-x-auto bg-surface-1 p-4 text-[12px] leading-relaxed text-foreground"><code>{children}</code></pre>
    </div>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'border-neural-warning/40 bg-neural-warning/5' : 'border-primary/30 bg-primary/5';
  return <div className={`rounded-lg border p-4 text-sm leading-relaxed text-muted-foreground ${cls}`}>{children}</div>;
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-muted-foreground">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Toc({ items }: { items: Array<[string, string]> }) {
  return (
    <nav aria-label="Nesta página" className="rounded-lg border border-border bg-surface-1 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nesta página</p>
      <ol className="space-y-1 text-sm">
        {items.map(([id, label]) => (
          <li key={id}><a href={`#${id}`} className="text-neural-blue hover:underline">{label}</a></li>
        ))}
      </ol>
    </nav>
  );
}

/** URL do script do widget no ambiente atual (produção: domínio público). */
export function widgetScriptExample(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://walletzcorp.com/agent-studio/api').replace(/\/$/, '');
  const absolute = base.startsWith('http') ? base : `https://walletzcorp.com${base}`;
  return `${absolute}/v1/public/webchat/widget.js`;
}
