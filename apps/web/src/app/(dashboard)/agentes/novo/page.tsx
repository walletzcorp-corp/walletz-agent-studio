'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../../hooks/use-auth';
import { agentsApi } from '../../../../lib/agents-api';
import { Button } from '@walletz/ui';
import { ChevronRight, ChevronLeft, Bot, Check } from 'lucide-react';

const TEMPLATES = [
  { id: 'sdr', label: 'SDR', description: 'Qualifica leads e agenda demonstrações', icon: '🎯' },
  {
    id: 'commercial',
    label: 'Comercial',
    description: 'Apresenta produtos e conduz vendas',
    icon: '💼',
  },
  {
    id: 'reception_scheduling',
    label: 'Recepção',
    description: 'Agenda e gerencia compromissos',
    icon: '📅',
  },
  {
    id: 'customer_service',
    label: 'Atendimento',
    description: 'Resolve dúvidas e problemas',
    icon: '🎧',
  },
  {
    id: 'post_sale',
    label: 'Pós-venda',
    description: 'Acompanha o sucesso do cliente',
    icon: '⭐',
  },
  { id: 'collection', label: 'Cobrança', description: 'Negocia pagamentos pendentes', icon: '💳' },
  { id: 'faq', label: 'FAQ', description: 'Responde perguntas frequentes', icon: '❓' },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Configure do zero para seu uso',
    icon: '✨',
  },
];

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'empathetic', label: 'Empático' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
];

const AVAILABLE_TOOLS = [
  { name: 'schedule_appointment', label: 'Agendar compromissos', category: 'Calendário' },
  { name: 'cancel_appointment', label: 'Cancelar compromissos', category: 'Calendário' },
  { name: 'check_availability', label: 'Verificar disponibilidade', category: 'Calendário' },
  { name: 'send_message', label: 'Enviar mensagem proativa', category: 'Mensagens' },
  { name: 'lookup_contact', label: 'Consultar dados do contato', category: 'CRM' },
  { name: 'update_contact', label: 'Atualizar dados do contato', category: 'CRM' },
  { name: 'search_knowledge', label: 'Buscar na base de conhecimento', category: 'Conhecimento' },
  { name: 'create_ticket', label: 'Abrir ticket de suporte', category: 'Suporte' },
  { name: 'check_order_status', label: 'Consultar status de pedido', category: 'Pedidos' },
  { name: 'generate_quote', label: 'Gerar proposta/orçamento', category: 'Vendas' },
  { name: 'transfer_to_human', label: 'Transferir para humano', category: 'Handoff' },
];

const step2Schema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80),
  title: z.string().max(120).optional(),
  objective: z.string().max(500).optional(),
});

const step3Schema = z.object({
  tone: z.string().min(1),
  language: z.string().min(1),
  personaDescription: z.string().max(500).optional(),
});

type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

const STEPS = ['Template', 'Informações', 'Persona', 'Ferramentas'];

export default function NovoAgentePage() {
  const { tenantId } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<string>('');
  const [toolsEnabled, setToolsEnabled] = useState<Set<string>>(
    new Set(['search_knowledge', 'transfer_to_human']),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form2 = useForm<Step2Form>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: { tone: 'professional', language: 'pt-BR' },
  });

  const goNext = async () => {
    if (step === 0) {
      if (!template) return;
      setStep(1);
    } else if (step === 1) {
      const ok = await form2.trigger();
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await form3.trigger();
      if (ok) setStep(3);
    }
  };

  const toggleTool = (name: string) => {
    setToolsEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const v2 = form2.getValues();
      const v3 = form3.getValues();

      const { data: agent } = await agentsApi.create(tenantId, {
        template,
        name: v2.name,
        title: v2.title || undefined,
        objective: v2.objective || undefined,
        tone: v3.tone,
        language: v3.language,
        persona: v3.personaDescription ? { description: v3.personaDescription } : undefined,
      } as Parameters<typeof agentsApi.create>[1]);

      await Promise.all(
        AVAILABLE_TOOLS.map((tool) =>
          agentsApi.setToolPermission(tenantId, agent.id, {
            toolName: tool.name,
            allowed: toolsEnabled.has(tool.name),
          }),
        ),
      );

      router.push(`/agentes/${agent.id}`);
    } catch {
      setError('Erro ao criar agente. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push('/agentes')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <h1 className="text-2xl font-bold">Criar Novo Agente</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              {i < step ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="text-xs">{i + 1}</span>
              )}
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-primary/40' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Step 1: Template */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Escolha um template como ponto de partida. Você poderá personalizar tudo depois.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border p-4 text-left transition-all hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  template === t.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border bg-card'
                }`}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Basic info */}
      {step === 1 && (
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="name">
              Nome interno <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Ex: Agente SDR Principal"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              {...form2.register('name')}
            />
            {form2.formState.errors.name && (
              <p className="text-xs text-destructive">{form2.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">
              Título exibido ao usuário
            </label>
            <input
              id="title"
              type="text"
              placeholder="Ex: Consultor de Pré-vendas"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              {...form2.register('title')}
            />
            <p className="text-xs text-muted-foreground">Nome que o cliente vê na conversa</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="objective">
              Objetivo principal
            </label>
            <textarea
              id="objective"
              rows={3}
              placeholder="Descreva o que este agente deve fazer..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              {...form2.register('objective')}
            />
          </div>
        </form>
      )}

      {/* Step 3: Persona */}
      {step === 2 && (
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tom de comunicação</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => form3.setValue('tone', t.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    form3.watch('tone') === t.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="language">
              Idioma
            </label>
            <select
              id="language"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              {...form3.register('language')}
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="personaDescription">
              Descrição da persona
            </label>
            <textarea
              id="personaDescription"
              rows={4}
              placeholder="Descreva quem é o agente — experiência, valores e forma de atuar..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              {...form3.register('personaDescription')}
            />
          </div>
        </form>
      )}

      {/* Step 4: Tools */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione quais ferramentas este agente pode usar. Você poderá alterar isso depois.
          </p>
          <div className="space-y-4">
            {Object.entries(
              AVAILABLE_TOOLS.reduce<Record<string, typeof AVAILABLE_TOOLS>>((acc, tool) => {
                (acc[tool.category] = acc[tool.category] ?? []).push(tool);
                return acc;
              }, {}),
            ).map(([category, tools]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {category}
                </p>
                <div className="space-y-1">
                  {tools.map((tool) => (
                    <label
                      key={tool.name}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <span className="text-sm">{tool.label}</span>
                      <input
                        type="checkbox"
                        checked={toolsEnabled.has(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {step < 3 ? (
          <Button onClick={goNext} disabled={step === 0 && !template}>
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar Agente'}
            {!submitting && <Bot className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
