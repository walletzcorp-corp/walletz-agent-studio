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
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

function AcceptInviteForm() {
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
          <CardTitle>Convite inválido</CardTitle>
          <CardDescription>
            O link está incompleto. Abra novamente o link recebido por e-mail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const onSubmit = async (data: Form) => {
    setServerError(null);
    try {
      await authApi.acceptInvite({
        token,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      });
      setDone(true);
    } catch {
      setServerError('Convite inválido ou expirado. Peça um novo convite ao administrador.');
    }
  };

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Convite aceito</CardTitle>
          <CardDescription>Sua conta está pronta. Entre para acessar o workspace.</CardDescription>
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
        <CardTitle>Aceitar convite</CardTitle>
        <CardDescription>
          Defina uma senha para entrar. Se você já tem conta, informe qualquer senha válida — a sua
          atual não será alterada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="invite-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" error={errors.firstName}>
              <Input autoComplete="given-name" {...register('firstName')} />
            </FormField>
            <FormField label="Sobrenome" error={errors.lastName}>
              <Input autoComplete="family-name" {...register('lastName')} />
            </FormField>
          </div>
          <FormField label="Senha" required error={errors.password} hint="Mínimo 8 caracteres">
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
        <Button form="invite-form" type="submit" className="w-full" loading={isSubmitting}>
          Aceitar convite
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}
