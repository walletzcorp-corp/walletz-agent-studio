'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@walletz/ui';
import {
  Home, Bot, BookOpen, FlaskConical, MessageSquare,
  Users, Megaphone, Calendar, BarChart3, Settings,
  Smartphone, GraduationCap, Puzzle, DollarSign,
  CreditCard, Brain, ChevronRight, Sparkles, HelpCircle,
} from 'lucide-react';
import { WalletzLogo, WalletzMark } from './walletz-logo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  exact?: boolean;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Início', icon: Home, exact: true },
    ],
  },
  {
    label: 'Agentes',
    items: [
      { href: '/agentes',     label: 'Meus Agentes',        icon: Bot },
      { href: '/conhecimento',label: 'Conhecimento',        icon: BookOpen },
      { href: '/ensinar',     label: 'Ensinar IA',          icon: GraduationCap },
      { href: '/laboratorio', label: 'Laboratório',         icon: FlaskConical },
    ],
  },
  {
    label: 'Relacionamento',
    items: [
      { href: '/conversas',   label: 'Conversas',   icon: MessageSquare },
      { href: '/contatos',    label: 'Contatos',    icon: Users },
      { href: '/campanhas',   label: 'Campanhas',   icon: Megaphone },
      { href: '/agendas',     label: 'Agendas',     icon: Calendar },
    ],
  },
  {
    label: 'Canais',
    items: [
      { href: '/canais/whatsapp', label: 'WhatsApp',    icon: Smartphone },
      { href: '/integracoes',     label: 'Integrações', icon: Puzzle },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/resultados', label: 'Resultados', icon: BarChart3 },
      { href: '/custos',     label: 'Custos',     icon: DollarSign },
      { href: '/billing',    label: 'Billing',    icon: CreditCard },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { href: '/onboarding',         label: 'Primeiros passos', icon: Sparkles },
  { href: '/ajuda',              label: 'Ajuda',            icon: HelpCircle },
  { href: '/configuracoes/ia',   label: 'Config. IA',       icon: Brain },
  { href: '/configuracoes',      label: 'Configurações',    icon: Settings, exact: false },
];

interface SidebarProps {
  tenantName?: string;
}

export function Sidebar({ tenantName }: SidebarProps) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    // /configuracoes/ia must not match /configuracoes
    if (item.href === '/configuracoes') return pathname === '/configuracoes' || (pathname.startsWith('/configuracoes') && !pathname.startsWith('/configuracoes/ia'));
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border" style={{ background: 'hsl(var(--surface-1))' }}>
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
        <WalletzMark size={30} className="shrink-0" />
        <div className="min-w-0 flex flex-col leading-none">
          <span className="text-sm font-display font-bold text-foreground leading-tight">Walletz</span>
          <span
            className="text-[9px] font-display font-semibold tracking-[0.14em] uppercase leading-tight"
            style={{
              background: 'linear-gradient(90deg, #6D4AFF, #22D3EE)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Agent Studio
          </span>
          {tenantName && (
            <p className="truncate text-[9px] text-muted-foreground/70 leading-tight mt-0.5">{tenantName}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" style={{ scrollbarWidth: 'none' }}>
        <div className="space-y-4">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-2 py-2 space-y-0.5">
        {FOOTER_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.href === '/configuracoes' && (
                <ChevronRight className="h-3 w-3 opacity-40" />
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
