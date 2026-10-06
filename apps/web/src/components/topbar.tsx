'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, HelpCircle, Search, CheckCircle2, CreditCard } from 'lucide-react';

/* ── Route label map ── */
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':            'Início',
  '/agentes':              'Meus Agentes',
  '/conhecimento':         'Base de Conhecimento',
  '/ensinar':              'Ensinar IA',
  '/laboratorio':          'Laboratório',
  '/canais/whatsapp':      'WhatsApp',
  '/integracoes':          'Integrações',
  '/conversas':            'Conversas',
  '/contatos':             'Contatos',
  '/campanhas':            'Campanhas',
  '/agendas':              'Agendas',
  '/resultados':           'Resultados',
  '/custos':               'Central de Custos',
  '/billing':              'Billing',
  '/meta':                 'Central Meta',
  '/meta/templates':       'Templates WhatsApp',
  '/configuracoes':        'Configurações',
  '/configuracoes/ia':     'Configurações de IA',
};

function getRouteLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // partial matches
  for (const [key, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(key + '/')) return label;
  }
  return 'Walletz';
}

interface TopbarProps {
  email?: string | null;
  tenantName?: string;
}

export function Topbar({ tenantName }: TopbarProps) {
  const pathname = usePathname();
  const pageTitle = getRouteLabel(pathname);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 gap-4" style={{ background: 'hsl(var(--surface-0))' }}>
      {/* Left: page title / breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {tenantName && (
          <>
            <span className="text-xs text-muted-foreground/60 truncate max-w-[120px]">{tenantName}</span>
            <span className="text-muted-foreground/30 text-xs">/</span>
          </>
        )}
        <span className="text-sm font-medium text-foreground truncate">{pageTitle}</span>
      </div>

      {/* Center: search (collapsed by default) */}
      <div className="flex-1 max-w-sm mx-auto">
        {searchOpen ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-surface-1 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              onBlur={() => setSearchOpen(false)}
              placeholder="Buscar agentes, conversas, contatos…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm text-muted-foreground hover:border-border/60 hover:text-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">Buscar…</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-surface-2 px-1.5 text-[10px] text-muted-foreground/60">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-neural-success/30 bg-neural-success/5 px-2.5 py-1 mr-1">
          <CheckCircle2 className="h-3 w-3 text-neural-success" />
          <span className="text-[11px] text-neural-success font-medium">Operacional</span>
        </div>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-1 hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* Help */}
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-1 hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Plan badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-surface-1 px-2.5 py-1 ml-1">
          <CreditCard className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground font-medium">Professional</span>
        </div>
      </div>
    </header>
  );
}
