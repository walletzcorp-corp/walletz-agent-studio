'use client';

import { useAuth } from '../../../hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@walletz/ui';
import { Badge } from '@walletz/ui';
import { Skeleton } from '@walletz/ui';
import Link from 'next/link';
import { Bot, BookOpen, MessageSquare, Users, ArrowRight } from 'lucide-react';

const QUICK_ACTIONS = [
  { href: '/agentes', label: 'Criar Agente', desc: 'Configure um novo agente de IA', icon: Bot },
  { href: '/ensinar', label: 'Ensinar IA', desc: 'Adicione conhecimento ao seu agente', icon: BookOpen },
  { href: '/conversas', label: 'Ver Conversas', desc: 'Monitore as interações em andamento', icon: MessageSquare },
  { href: '/contatos', label: 'Gerenciar Contatos', desc: 'Importe e organize sua base de leads', icon: Users },
];

export default function DashboardPage() {
  const { email, tenantName, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá{email ? `, ${email.split('@')[0]}` : ''}! 👋
        </h1>
        {tenantName && (
          <p className="mt-1 text-muted-foreground">
            Workspace <strong>{tenantName}</strong>
            {role && (
              <Badge variant="secondary" className="ml-2">
                {role}
              </Badge>
            )}
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-base">{action.label}</CardTitle>
                    <CardDescription>{action.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Getting started */}
      <Card>
        <CardHeader>
          <CardTitle>Começando</CardTitle>
          <CardDescription>Siga estes passos para ter seu primeiro agente funcionando</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { step: 1, label: 'Crie seu primeiro agente', href: '/agentes' },
              { step: 2, label: 'Ensine sua IA com conhecimento da empresa', href: '/ensinar' },
              { step: 3, label: 'Teste no Laboratório', href: '/laboratorio' },
              { step: 4, label: 'Publique e conecte ao WhatsApp', href: '/configuracoes/whatsapp' },
            ].map((item) => (
              <li key={item.step} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {item.step}
                </span>
                <Link href={item.href} className="text-sm text-foreground hover:text-primary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
