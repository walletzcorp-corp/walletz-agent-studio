import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { WalletzLogo } from '../../components/walletz-logo';

export const metadata: Metadata = {
  title: { template: '%s | Guias Walletz Studio IA', default: 'Guias de integração' },
  robots: { index: false, follow: false },
};

const NAV: Array<[string, string]> = [
  ['/docs', 'Início'],
  ['/docs/webchat', 'Webchat no site'],
  ['/docs/whatsapp', 'WhatsApp oficial'],
  ['/docs/webhooks', 'Webhooks de saída'],
];

/** Área pública de guias (sem login): pode ser enviada ao cliente ou ao desenvolvedor dele. */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--surface-0))' }}>
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur" style={{ background: 'hsl(var(--surface-0) / 0.9)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/docs" className="flex items-center gap-2">
            <WalletzLogo variant="horizontal" size="sm" />
            <span className="hidden text-xs text-muted-foreground sm:inline">Guias de integração</span>
          </Link>
          <Link href="/auth/login" className="text-xs text-neural-blue hover:underline">Entrar no painel</Link>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-muted-foreground">
        Dúvidas? Abra um chamado com o suporte Walletz. Integrações de terceiros (Meta, Google, Microsoft) seguem as regras e tarifas de cada fornecedor.
      </footer>
    </div>
  );
}
