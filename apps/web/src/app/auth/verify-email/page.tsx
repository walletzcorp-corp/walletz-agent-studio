'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@walletz/ui';
import { authApi } from '../../../lib/api';

type State = 'verifying' | 'ok' | 'error';

function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<State>(token ? 'verifying' : 'error');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => !cancelled && setState('ok'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copy: Record<State, { title: string; text: string }> = {
    verifying: { title: 'Verificando…', text: 'Aguarde um instante.' },
    ok: { title: 'E-mail confirmado', text: 'Sua conta está verificada. Já pode entrar.' },
    error: {
      title: 'Link inválido ou expirado',
      text: 'Entre na sua conta para solicitar um novo e-mail de verificação.',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy[state].title}</CardTitle>
        <CardDescription>{copy[state].text}</CardDescription>
      </CardHeader>
      {state !== 'verifying' && (
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">Ir para o login</Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
