'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, FormField, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@walletz/ui';
import { authApi } from '../../../lib/api';

const schema = z.object({ email: z.string().email('Email inválido') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    await authApi.forgotPassword(data.email);
    setSent(true);
  };

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifique seu email</CardTitle>
          <CardDescription>
            Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">Voltar ao login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueceu a senha?</CardTitle>
        <CardDescription>
          Digite seu email e enviaremos instruções para redefinir sua senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="forgot-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" required error={errors.email}>
            <Input type="email" placeholder="seu@email.com" error={!!errors.email} {...register('email')} />
          </FormField>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button form="forgot-form" type="submit" className="w-full" loading={isSubmitting}>
          Enviar link de redefinição
        </Button>
        <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao login
        </Link>
      </CardFooter>
    </Card>
  );
}
