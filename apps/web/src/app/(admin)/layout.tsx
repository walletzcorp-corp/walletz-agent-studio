'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/use-auth';
import { WalletzLogo } from '../../components/walletz-logo';
import { cn, Skeleton } from '@walletz/ui';
import {
  LayoutDashboard, Building2, Bot, Users, Activity, Cpu, ChevronRight, LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/clientes', label: 'Clientes', icon: Building2 },
  { href: '/admin/agentes', label: 'Agentes', icon: Bot },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/atividade', label: 'Atividade', icon: Activity },
  { href: '/admin/ia', label: 'IA (Claude)', icon: Cpu },
];

/**
 * Painel da administração da plataforma. O bloqueio aqui é só de navegação:
 * toda rota /v1/admin/* é protegida no servidor (PlatformAdminGuard).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isPlatformAdmin, tenantId, email, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/auth/login');
    else if (!isPlatformAdmin) router.replace('/dashboard');
  }, [isAuthenticated, isLoading, isPlatformAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-56 border-r border-border p-3 space-y-2" style={{ background: 'hsl(var(--surface-1))' }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isPlatformAdmin) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border" style={{ background: 'hsl(var(--surface-1))' }}>
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-3">
          <WalletzLogo variant="horizontal" size="sm" />
        </div>
        <div className="flex h-8 items-center border-b border-border px-3">
          <span className="rounded-full bg-neural-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neural-danger">
            Admin da plataforma
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  active ? 'bg-neural-danger/10 text-neural-danger font-medium' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-3 py-3 space-y-2">
          {tenantId && (
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-3 w-3 rotate-180" /> Ir para minha organização
            </Link>
          )}
          <button
            onClick={() => void logout()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-neural-danger transition-colors"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
          <p className="text-[10px] text-muted-foreground/50 truncate">{email}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
