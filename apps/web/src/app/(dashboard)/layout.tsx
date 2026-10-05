'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/sidebar';
import { UserMenu } from '../../components/user-menu';
import { useAuth } from '../../hooks/use-auth';
import { Skeleton } from '@walletz/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, email, tenantName, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('walletz:logout', handler);
    return () => window.removeEventListener('walletz:logout', handler);
  }, [logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 border-r border-border bg-card p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="flex flex-col w-64 shrink-0">
        <Sidebar tenantName={tenantName ?? undefined} />
        <div className="border-r border-border bg-card px-3 py-3">
          <UserMenu email={email} />
        </div>
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
