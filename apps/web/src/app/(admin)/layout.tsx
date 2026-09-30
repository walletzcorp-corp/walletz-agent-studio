'use client';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
