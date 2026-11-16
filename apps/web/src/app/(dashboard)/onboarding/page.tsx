'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Bot,
  BookOpen,
  FlaskConical,
  Smartphone,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  BarChart3,
  Sparkles,
  X,
} from 'lucide-react';
import { WalletzLogo } from '../../../components/walletz-logo';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  done: boolean;
  optional?: boolean;
}

const INITIAL_STEPS: OnboardingStep[] = [
  {
    id: 'agent',
    title: 'Crie seu primeiro agente',
    description: 'Dê um nome, defina a função e o comportamento do seu assistente de IA.',
    href: '/agentes',
    action: 'Criar agente',
    icon: Bot,
    color: 'text-primary',
    bg: 'bg-primary/10',
    done: false,
  },
  {
    id: 'knowledge',
    title: 'Ensine sua IA',
    description:
      'Adicione documentos, textos e arquivos para que seu agente aprenda sobre sua empresa.',
    href: '/ensinar',
    action: 'Adicionar conhecimento',
    icon: BookOpen,
    color: 'text-neural-blue',
    bg: 'bg-neural-blue/10',
    done: false,
  },
  {
    id: 'lab',
    title: 'Teste no Laboratório',
    description: 'Converse com seu agente antes de publicá-lo e ajuste o comportamento.',
    href: '/laboratorio',
    action: 'Abrir laboratório',
    icon: FlaskConical,
    color: 'text-neural-cyan',
    bg: 'bg-neural-cyan/10',
    done: false,
  },
  {
    id: 'whatsapp',
    title: 'Conecte o WhatsApp',
    description: 'Publique seu agente no WhatsApp Business e comece a atender clientes.',
    href: '/canais/whatsapp',
    action: 'Conectar WhatsApp',
    icon: Smartphone,
    color: 'text-[#25D366]',
    bg: 'bg-[#25D366]/10',
    done: false,
  },
  {
    id: 'contacts',
    title: 'Importe seus contatos',
    description: 'Carregue sua lista de leads em CSV ou XLSX para segmentar e criar campanhas.',
    href: '/contatos',
    action: 'Importar contatos',
    icon: Users,
    color: 'text-neural-warning',
    bg: 'bg-neural-warning/10',
    done: false,
    optional: true,
  },
  {
    id: 'template',
    title: 'Configure um template Meta',
    description: 'Crie e envie templates aprovados pelo Meta para iniciar conversas no WhatsApp.',
    href: '/meta/templates',
    action: 'Criar template',
    icon: FileText,
    color: 'text-[#1877F2]',
    bg: 'bg-[#1877F2]/10',
    done: false,
    optional: true,
  },
  {
    id: 'calendar',
    title: 'Conecte sua agenda',
    description:
      'Integre Google Calendar ou Microsoft Teams para que sua IA possa agendar reuniões.',
    href: '/integracoes',
    action: 'Conectar agenda',
    icon: Calendar,
    color: 'text-neural-blue',
    bg: 'bg-neural-blue/10',
    done: false,
    optional: true,
  },
  {
    id: 'campaign',
    title: 'Crie sua primeira campanha',
    description: 'Envie mensagens em escala para sua lista de contatos com o agente de IA.',
    href: '/campanhas',
    action: 'Criar campanha',
    icon: MessageSquare,
    color: 'text-primary',
    bg: 'bg-primary/10',
    done: false,
    optional: true,
  },
  {
    id: 'conversation',
    title: 'Faça seu primeiro atendimento',
    description: 'Acompanhe conversas em andamento no Inbox e entenda como sua IA responde.',
    href: '/conversas',
    action: 'Ver conversas',
    icon: MessageSquare,
    color: 'text-neural-success',
    bg: 'bg-neural-success/10',
    done: false,
    optional: true,
  },
  {
    id: 'results',
    title: 'Analise seus resultados',
    description: 'Visualize métricas de atendimento, conversas e desempenho dos seus agentes.',
    href: '/resultados',
    action: 'Ver resultados',
    icon: BarChart3,
    color: 'text-neural-cyan',
    bg: 'bg-neural-cyan/10',
    done: false,
    optional: true,
  },
];

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingStep[]>(INITIAL_STEPS);
  const [dismissed, setDismissed] = useState(false);

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);
  const required = steps.filter((s) => !s.optional);
  const requiredDone = required.filter((s) => s.done).length;

  function toggleDone(id: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  if (dismissed) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Sparkles className="h-12 w-12 text-primary" />
        <h2 className="text-xl font-display font-bold text-foreground">Onboarding concluído</h2>
        <p className="text-muted-foreground max-w-sm">
          Você pode revisitar este guia a qualquer momento em Configurações → Primeiros passos.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-lg px-6 py-2.5 text-sm font-semibold"
        >
          Ir para o dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden p-8"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--surface-1)) 0%, hsl(var(--surface-2)) 100%)',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-20 -left-20 h-60 w-60 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #6D4AFF 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-10 blur-3xl"
            style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
          />
        </div>
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <WalletzLogo variant="mark" size="lg" />
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Sua equipe de IA começa aqui.
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Siga os passos abaixo para configurar seu Walletz Agent Studio.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Dispensar
          </button>
        </div>

        {/* Progress */}
        <div className="relative mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completed} de {total} etapas concluídas
            </span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6D4AFF, #22D3EE)' }}
            />
          </div>
          {requiredDone === required.length && completed < total && (
            <p className="text-xs text-neural-success">
              ✓ Etapas essenciais concluídas! Continue para aproveitar todo o potencial.
            </p>
          )}
        </div>
      </div>

      {/* Steps: required */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
          Essencial
        </h2>
        {steps
          .filter((s) => !s.optional)
          .map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`neural-card p-5 flex items-start gap-4 transition-opacity ${step.done ? 'opacity-60' : ''}`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${step.bg}`}
                >
                  <Icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                      Passo {i + 1}
                    </span>
                  </div>
                  <p
                    className={`text-sm font-semibold ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {step.href && !step.done && (
                    <Link
                      href={step.href}
                      className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1"
                    >
                      {step.action} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => toggleDone(step.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={step.done ? 'Marcar como pendente' : 'Marcar como concluído'}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-6 w-6 text-neural-success" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Steps: optional */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
          Recomendado
        </h2>
        {steps
          .filter((s) => s.optional)
          .map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`neural-card p-5 flex items-start gap-4 transition-opacity ${step.done ? 'opacity-60' : ''}`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${step.bg}`}
                >
                  <Icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {step.href && !step.done && (
                    <Link
                      href={step.href}
                      className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium border border-border flex items-center gap-1"
                    >
                      {step.action} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => toggleDone(step.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-6 w-6 text-neural-success" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-sm text-muted-foreground">Precisa de ajuda para começar?</p>
        <Link
          href="/ajuda"
          className="btn-ghost rounded-lg px-4 py-2 text-sm flex items-center gap-1.5 border border-border"
        >
          Central de Ajuda <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
