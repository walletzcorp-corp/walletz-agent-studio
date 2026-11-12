'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Input, FormField, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Skeleton,
} from '@walletz/ui';
import { tenantsApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';

const orgSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
});

type OrgForm = z.infer<typeof orgSchema>;

const SLUG_MAX = 50;
const MAX_ATTEMPTS = 5;

/** "Clínica São José Ltda." → "clinica-sao-jose-ltda" (identificador interno, não exibido). */
function slugify(value: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length >= 2 ? base : `org-${base}`.replace(/-+$/g, '') || 'org';
}

/** Na 1ª tentativa usa o nome puro; nas seguintes acrescenta um sufixo aleatório curto. */
function slugCandidate(name: string, attempt: number): string {
  const base = slugify(name);
  if (attempt === 0) return base.slice(0, SLUG_MAX).replace(/-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.slice(0, SLUG_MAX - suffix.length - 1).replace(/-+$/g, '')}-${suffix}`;
}

function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/**
 * Primeiro passo de quem acabou de criar a conta: toda tela do painel depende
 * de uma organização (tenant), então sem ela o usuário é trazido para cá.
 */
export default function CreateOrganizationPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, tenantId, isPlatformAdmin, email, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/auth/login');
    else if (tenantId) router.replace('/dashboard');
  }, [isLoading, isAuthenticated, tenantId, router]);

  const onSubmit = async ({ name }: OrgForm) => {
    setError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        await tenantsApi.create({ name, slug: slugCandidate(name, attempt), timezone, locale: 'pt-BR' });
        router.replace('/dashboard');
        return;
      } catch (err: unknown) {
        if (httpStatus(err) === 409) continue; // identificador já usado: tenta outro
        setError(
          httpStatus(err) === 400
            ? 'Confira o nome informado.'
            : 'Não foi possível criar a organização. Tente novamente.',
        );
        return;
      }
    }
    setError('Não foi possível criar a organização. Tente novamente.');
  };

  if (isLoading || !isAuthenticated || tenantId) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crie sua organização</CardTitle>
        <CardDescription>
          É o espaço da sua empresa: seus agentes, conhecimento e conversas ficam aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="org-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome da empresa" required error={errors.name}>
            <Input placeholder="Minha Empresa" autoFocus error={!!errors.name} {...register('name')} />
          </FormField>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button form="org-form" type="submit" className="w-full" loading={isSubmitting}>
          Criar organização
        </Button>
        {isPlatformAdmin && (
          <Link href="/admin" className="text-sm text-primary hover:underline">
            Ir para o painel da plataforma
          </Link>
        )}
        <p className="text-sm text-muted-foreground">
          {email ? `Conectado como ${email}. ` : ''}
          <button type="button" onClick={() => void logout()} className="text-primary hover:underline">
            Sair
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}
