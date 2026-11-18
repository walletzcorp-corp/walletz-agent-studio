'use client';

import { useEffect, useState } from 'react';
import { ACCOUNT_BLOCKED_EVENT } from '../../lib/api';
import { planWhatsappUrl } from '../../lib/contact';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '../../components/sidebar';
import { UserMenu } from '../../components/user-menu';
import { Topbar } from '../../components/topbar'; // loaded
import { useAuth } from '../../hooks/use-auth';
import { Skeleton } from '@walletz/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, email, tenantId, tenantName, isPlatformAdmin, logout } = useAuth();
  const router = useRouter();
  // Todas as telas do painel dependem de uma organização; sem ela ficariam
  // carregando para sempre. Quem ainda não tem vai criar a primeira.
  const needsOrganization = isAuthenticated && !tenantId;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/auth/login');
    else if (needsOrganization) router.replace('/auth/organizacao');
  }, [isAuthenticated, isLoading, needsOrganization, router]);

  // Trial vencido, organização suspensa ou usuário acima do limite do plano (vem da API).
  const [accountBlock, setAccountBlock] = useState<string | null>(null);
  useEffect(() => {
    const onBlocked = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setAccountBlock(detail?.message ?? 'O acesso a esta organização está bloqueado.');
    };
    window.addEventListener(ACCOUNT_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(ACCOUNT_BLOCKED_EVENT, onBlocked);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('walletz:logout', handler);
    return () => window.removeEventListener('walletz:logout', handler);
  }, [logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-60 border-r border-border p-3 space-y-2" style={{ background: 'hsl(var(--surface-1))' }}>
          <Skeleton className="h-8 w-full mb-4" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <Skeleton className="h-14 w-full border-b border-border shrink-0" />
          <div className="flex-1 p-8 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || needsOrganization) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col shrink-0">
        <Sidebar tenantName={tenantName ?? undefined} />
        <div className="border-r border-t border-border px-2 py-2" style={{ background: 'hsl(var(--surface-1))' }}>
          <UserMenu email={email} isPlatformAdmin={isPlatformAdmin} />
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar email={email} tenantName={tenantName ?? undefined} tenantId={tenantId ?? undefined} onLogout={() => void logout()} />
        {accountBlock && (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <span className="font-medium">{accountBlock}</span>
            <a href={planWhatsappUrl()} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Falar com a Walletz
            </a>
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
