'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { WalletzLogo } from '../../components/walletz-logo';
import { cn } from '@walletz/ui';
import { LayoutDashboard, Users, Settings, Shield, ChevronRight } from 'lucide-react';
import { Skeleton } from '@walletz/ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/planos', label: 'Planos', icon: Shield },
  { href: '/admin/config', label: 'Configurações', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login');
    if (!isLoading && isAuthenticated && role !== 'super_admin') router.replace('/dashboard');
  }, [isAuthenticated, isLoading, role, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div
          className="w-56 border-r border-border p-3 space-y-2"
          style={{ background: 'hsl(var(--surface-1))' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'super_admin') return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Admin sidebar */}
      <aside
        className="flex h-screen w-56 shrink-0 flex-col border-r border-border"
        style={{ background: 'hsl(var(--surface-1))' }}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-3">
          <WalletzLogo variant="horizontal" size="sm" />
        </div>
        <div className="flex h-8 items-center border-b border-border px-3">
          <span className="rounded-full bg-neural-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neural-danger">
            Super Admin
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
                  active
                    ? 'bg-neural-danger/10 text-neural-danger font-medium'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-3 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> Voltar ao app
          </Link>
          <p className="text-[10px] text-muted-foreground/40 mt-1 truncate">{email}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
