'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function getDevTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)walletz_dev_token=([^;]+)/);
  return match ? match[1] : null;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devToken, setDevToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('walletz_dev_token') ?? getDevTokenFromCookie();
    setDevToken(token);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (checked && status !== 'loading' && !session && !devToken) {
      router.replace('/login');
    }
  }, [checked, session, status, devToken, router]);

  if (!checked || status === 'loading') {
    return (
      <div className="min-h-screen bg-brand-graphite flex items-center justify-center">
        <p className="text-white text-sm">Verificando autenticação...</p>
      </div>
    );
  }

  if (!session && !devToken) return null;

  return <>{children}</>;
}
