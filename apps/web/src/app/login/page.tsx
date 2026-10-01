'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

function PrismFlowLogo({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="26" cy="18" rx="14" ry="8.5" stroke="#152DFF" strokeWidth="5.5"
        fill="none" strokeLinecap="round" transform="rotate(-30 26 18)" />
      <ellipse cx="18" cy="33" rx="14" ry="8.5" stroke="#00B7A8" strokeWidth="5.5"
        fill="none" strokeLinecap="round" transform="rotate(90 18 33)" />
      <ellipse cx="34" cy="33" rx="14" ry="8.5" stroke="#FF784F" strokeWidth="5.5"
        fill="none" strokeLinecap="round" transform="rotate(150 34 33)" />
    </svg>
  );
}

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="flex flex-col items-center gap-4">
          <PrismFlowLogo />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#152DFF', filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#00B7A8', filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-5"
          style={{ background: '#FF784F', filter: 'blur(60px)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo mark + wordmark */}
        <div className="flex flex-col items-center mb-8">
          <PrismFlowLogo size={56} />
          <div className="mt-4 text-center">
            <div className="text-3xl font-bold tracking-tight leading-tight">
              <span style={{ color: '#152DFF' }}>Walletz</span>
              <span style={{ color: '#00B7A8' }}>Med</span>
            </div>
            <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500 uppercase mt-0.5">
              Prism Flow
            </div>
            <p className="text-slate-400 text-xs mt-2">
              People. Resources. Information. Care in Flow.
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl space-y-4"
          style={{
            background: 'rgba(30,41,59,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <h1 className="text-white text-xl font-bold mb-1">Entrar</h1>
            <p className="text-slate-400 text-sm">Use sua conta institucional para acessar</p>
          </div>

          {/* Keycloak */}
          <button
            onClick={() => signIn('keycloak', { callbackUrl: '/dashboard' })}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-px hover:shadow-lg"
            style={{ background: '#152DFF' }}
          >
            Entrar com Keycloak
            <ArrowRight size={16} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-slate-500 text-xs">ou</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Dev login */}
          <button
            onClick={handleDevLogin}
            disabled={devLoading}
            className="w-full py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50"
            style={{
              borderColor: '#00B7A8',
              color: '#00B7A8',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#00B7A8';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#00B7A8';
            }}
          >
            {devLoading ? 'Autenticando...' : 'Entrar como Dev Admin (sem Keycloak)'}
          </button>

          {devError && (
            <p className="text-red-400 text-xs text-center bg-red-950/40 rounded-lg px-3 py-2">{devError}</p>
          )}

          <p className="text-slate-500 text-xs text-center">
            Dev: <code style={{ color: '#00B7A8' }}>dev-admin@walletz-med.local</code>
          </p>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          © {new Date().getFullYear()} Walletz Corp. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
