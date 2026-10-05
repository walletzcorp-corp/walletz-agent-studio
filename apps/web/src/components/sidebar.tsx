'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@walletz/ui';
import {
  Home,
  Bot,
  BookOpen,
  FlaskConical,
  MessageSquare,
  Users,
  Megaphone,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  Smartphone,
  GraduationCap,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/agentes', label: 'Meus Agentes', icon: Bot },
  { href: '/conhecimento', label: 'Base de Conhecimento', icon: BookOpen },
  { href: '/ensinar', label: 'Ensinar IA', icon: GraduationCap },
  { href: '/laboratorio', label: 'Laboratório', icon: FlaskConical },
  { href: '/canais/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { href: '/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/contatos', label: 'Contatos', icon: Users },
  { href: '/campanhas', label: 'Campanhas', icon: Megaphone },
  { href: '/agendas', label: 'Agendas', icon: Calendar },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
];

interface SidebarProps {
  tenantName?: string;
}

export function Sidebar({ tenantName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <svg className="h-4 w-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Walletz</p>
          {tenantName && (
            <p className="truncate text-xs text-muted-foreground">{tenantName}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-3">
        <Link
          href="/configuracoes"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
            pathname.startsWith('/configuracoes')
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="flex-1">Configurações</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        </Link>
      </div>
    </aside>
  );
}
