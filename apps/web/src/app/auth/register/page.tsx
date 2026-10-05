'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, FormField, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@walletz/ui';
import { authApi } from '../../../lib/api';

const registerSchema = z.object({
  firstName: z.string().min(1, 'Nome obrigatório').max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await authApi.register({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName });
      setSuccess(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      setError(status === 409 ? 'Este email já está cadastrado' : 'Erro ao criar conta. Tente novamente.');
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conta criada!</CardTitle>
          <CardDescription>Enviamos um link de verificação para o seu email. Verifique sua caixa de entrada.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login')}>Ir para o login</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Comece sua jornada com Walletz Agent Studio</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nome" required error={errors.firstName}>
              <Input placeholder="João" error={!!errors.firstName} {...register('firstName')} />
            </FormField>
            <FormField label="Sobrenome" error={errors.lastName}>
              <Input placeholder="Silva" {...register('lastName')} />
            </FormField>
          </div>
          <FormField label="Email" required error={errors.email}>
            <Input type="email" placeholder="seu@email.com" error={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Senha" required error={errors.password} hint="Mínimo 8 caracteres">
            <Input type="password" placeholder="••••••••" error={!!errors.password} {...register('password')} />
          </FormField>
          <FormField label="Confirmar senha" required error={errors.confirmPassword}>
            <Input type="password" placeholder="••••••••" error={!!errors.confirmPassword} {...register('confirmPassword')} />
          </FormField>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button form="register-form" type="submit" className="w-full" loading={isSubmitting}>Criar conta</Button>
        <p className="text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
