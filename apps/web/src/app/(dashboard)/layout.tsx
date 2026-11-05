'use client';

import { useEffect } from 'react';
import { useRouter, } from 'next/navigation';
import { Sidebar } from '../../components/sidebar';
import { UserMenu } from '../../components/user-menu';
import { Topbar } from '../../components/topbar'; // loaded
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

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col shrink-0">
        <Sidebar tenantName={tenantName ?? undefined} />
        <div className="border-r border-t border-border px-2 py-2" style={{ background: 'hsl(var(--surface-1))' }}>
          <UserMenu email={email} />
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar email={email} tenantName={tenantName ?? undefined} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
