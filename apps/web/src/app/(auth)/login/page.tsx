'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@walletz/ui';
import { Input } from '@walletz/ui';
import { FormField } from '@walletz/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@walletz/ui';
import { useAuth } from '../../../hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  mfaCode: z.string().length(6).optional().or(z.literal('')),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEV_EMAIL = 'demo@walletz.local';
const DEV_PASSWORD = 'Walletz@2026!';
const IS_DEV = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const { login } = useAuth();
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const devLogin = async () => {
    setValue('email', DEV_EMAIL);
    setValue('password', DEV_PASSWORD);
    setError(null);
    try {
      await login(DEV_EMAIL, DEV_PASSWORD);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Crie o usuário dev primeiro: POST /api/v1/auth/register');
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const result = await login(data.email, data.password, data.mfaCode || undefined);
      if (result.requiresMfa) {
        setRequiresMfa(true);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Credenciais inválidas');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta Walletz Agent Studio</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" required error={errors.email}>
            <Input
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              error={!!errors.email}
              {...register('email')}
            />
          </FormField>

          <FormField label="Senha" required error={errors.password}>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={!!errors.password}
              {...register('password')}
            />
          </FormField>

          {requiresMfa && (
            <FormField label="Código MFA" required error={errors.mfaCode}>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                {...register('mfaCode')}
              />
            </FormField>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button form="login-form" type="submit" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
        {IS_DEV && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
            onClick={devLogin}
          >
            ⚡ Dev Login
          </Button>
        )}
        <div className="flex w-full items-center justify-between text-sm">
          <Link href="/auth/forgot-password" className="text-muted-foreground hover:text-primary">
            Esqueceu a senha?
          </Link>
          <Link href="/auth/register" className="text-primary hover:underline">
            Criar conta
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
