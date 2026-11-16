'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@walletz/ui';
import { authApi } from '../../../lib/api';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            O link está incompleto. Solicite uma nova redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/forgot-password" className="w-full">
            <Button variant="outline" className="w-full">
              Solicitar novo link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const onSubmit = async (data: Form) => {
    setServerError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
    } catch {
      setServerError('Link inválido ou expirado. Solicite uma nova redefinição.');
    }
  };

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Senha redefinida</CardTitle>
          <CardDescription>
            Todas as sessões foram encerradas. Entre com a nova senha.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">Ir para o login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>Escolha uma nova senha para a sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="reset-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nova senha" required error={errors.password} hint="Mínimo 8 caracteres">
            <Input
              type="password"
              autoComplete="new-password"
              error={!!errors.password}
              {...register('password')}
            />
          </FormField>
          <FormField label="Confirmar senha" required error={errors.confirmPassword}>
            <Input
              type="password"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </FormField>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button form="reset-form" type="submit" className="w-full" loading={isSubmitting}>
          Redefinir senha
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
