'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState('');

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  async function handleDevLogin() {
    setDevLoading(true);
    setDevError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011';
      const res = await fetch(`${apiUrl}/api/v1/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dev-admin@walletz-med.local' }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) {
        setDevError(data.error ?? 'Erro ao obter token de dev');
        return;
      }
      // Armazena o token em cookie (acessível em server components) e sessionStorage
      document.cookie = `walletz_dev_token=${data.access_token}; path=/; max-age=28800; SameSite=Lax`;
      sessionStorage.setItem('walletz_dev_token', data.access_token);
      sessionStorage.setItem('walletz_dev_user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (e: any) {
      setDevError(`API indisponível: ${e.message}`);
    } finally {
      setDevLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-brand-graphite flex items-center justify-center">
        <p className="text-white text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-graphite flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / nome */}
        <div className="text-center mb-8">
          <span className="text-brand-emerald font-bold text-3xl tracking-tight">Walletz</span>
          <span className="text-white font-light text-3xl"> Med</span>
          <p className="text-slate-400 text-sm mt-1">Sistema Operacional para Clínicas</p>
        </div>

        <div className="bg-brand-graphite-light rounded-2xl p-8 shadow-2xl space-y-4">
          <div>
            <h1 className="text-white text-xl font-semibold mb-1">Entrar</h1>
            <p className="text-slate-400 text-sm">
              Use sua conta institucional para acessar
            </p>
          </div>

          {/* Login Keycloak (produção) */}
          <button
            onClick={() => signIn('keycloak', { callbackUrl: '/dashboard' })}
            className="btn-primary w-full justify-center py-3"
          >
            Entrar com Keycloak
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-slate-700" />
            <span className="text-slate-500 text-xs">ou</span>
            <div className="flex-1 border-t border-slate-700" />
          </div>

          {/* Login Dev (sem Keycloak) */}
          <button
            onClick={handleDevLogin}
            disabled={devLoading}
            className="w-full py-3 rounded-lg border border-brand-emerald text-brand-emerald text-sm font-medium hover:bg-brand-emerald hover:text-white transition-colors disabled:opacity-50"
          >
            {devLoading ? 'Autenticando...' : 'Entrar como Dev Admin (sem Keycloak)'}
          </button>

          {devError && (
            <p className="text-red-400 text-xs text-center">{devError}</p>
          )}

          <p className="text-slate-500 text-xs text-center">
            Dev: <code className="text-brand-emerald">dev-admin@walletz-med.local</code>
          </p>
        </div>
      </div>
    </div>
  );
}
