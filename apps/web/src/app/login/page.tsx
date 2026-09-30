'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

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

        <div className="bg-brand-graphite-light rounded-2xl p-8 shadow-2xl">
          <h1 className="text-white text-xl font-semibold mb-1">Entrar</h1>
          <p className="text-slate-400 text-sm mb-6">
            Use sua conta institucional para acessar
          </p>

          <button
            onClick={() => signIn('keycloak', { callbackUrl: '/dashboard' })}
            className="btn-primary w-full justify-center py-3"
          >
            Entrar com Keycloak
          </button>

          <p className="text-slate-500 text-xs text-center mt-6">
            Ambiente de desenvolvimento — usuário: <code className="text-brand-emerald">dev-admin / admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
