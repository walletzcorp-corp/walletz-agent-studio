import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { WalletzLogo } from '../../components/walletz-logo';
import { COMPANY } from '../../lib/company';

// Páginas legais são públicas e indexáveis (o Google as consulta na verificação do app OAuth).
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--surface-0))' }}>
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur" style={{ background: 'hsl(var(--surface-0) / 0.9)' }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <WalletzLogo variant="horizontal" size="sm" />
          <nav aria-label="Páginas legais" className="flex gap-4 text-xs">
            <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">Privacidade</Link>
            <Link href="/termos" className="text-muted-foreground hover:text-foreground">Termos</Link>
            <Link href="/auth/login" className="text-neural-blue hover:underline">Entrar no painel</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-muted-foreground">
        {COMPANY.legalName} · CNPJ {COMPANY.taxId} · {COMPANY.address}
      </footer>
    </div>
  );
}
