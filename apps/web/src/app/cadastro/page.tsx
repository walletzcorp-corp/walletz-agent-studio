'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  User,
  CreditCard,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { WalletzLogo } from '../../components/walletz-logo';
import { authApi } from '../../lib/api';

/* ── Types ── */
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}
interface CompanyData {
  fantasyName: string;
  legalName: string;
  cnpj: string;
  country: string;
  state: string;
  city: string;
  phone: string;
  website: string;
  segment: string;
  employeeCount: string;
  goal: string;
}
type PlanId = 'starter' | 'professional' | 'business';

/* ── Constants ── */
const STEPS = [
  { id: 1, label: 'Você', icon: User },
  { id: 2, label: 'Empresa', icon: Building2 },
  { id: 3, label: 'Plano', icon: CreditCard },
  { id: 4, label: 'Pronto!', icon: Sparkles },
];

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  highlight?: boolean;
  features: string[];
}[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 197/mês',
    features: ['1 agente', '1.000 conversas/mês', 'WhatsApp (BYOC)', 'Suporte por e-mail'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'R$ 497/mês',
    highlight: true,
    features: [
      '5 agentes',
      '10.000 conversas/mês',
      'WhatsApp + Meta',
      'Google/Microsoft Calendar',
      'Relatórios avançados',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 1.197/mês',
    features: [
      'Agentes ilimitados',
      '50.000 conversas/mês',
      'BYOK (chave própria de IA)',
      'SLA dedicado',
      'Onboarding personalizado',
    ],
  },
];

const SEGMENTS = [
  'Tecnologia',
  'Saúde',
  'Educação',
  'Varejo',
  'Imóveis',
  'Serviços Financeiros',
  'Logística',
  'Indústria',
  'Alimentação',
  'Consultoria',
  'Outros',
];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', 'Mais de 1000'];
const GOALS = [
  'Atendimento ao cliente',
  'Qualificação de leads',
  'Agendamento de reuniões',
  'Vendas consultivas',
  'Suporte técnico',
  'Outro',
];

/* ── Field component ── */
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-neural-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-neural-danger">{error}</p>}
    </div>
  );
}

function Input({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
        error
          ? 'border-neural-danger focus:border-neural-danger'
          : 'border-border focus:border-primary/60'
      }`}
    />
  );
}

function Select({
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border bg-surface-1 px-3 py-2 text-sm text-foreground outline-none transition-colors ${
        error ? 'border-neural-danger' : 'border-border focus:border-primary/60'
      }`}
    >
      {children}
    </select>
  );
}

/* ── Step 1: User ── */
function StepUser({
  data,
  onChange,
  onNext,
}: {
  data: UserData;
  onChange: (d: Partial<UserData>) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof UserData, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (!data.firstName.trim()) e.firstName = 'Obrigatório';
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'E-mail inválido';
    if (data.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (data.password !== data.confirmPassword) e.confirmPassword = 'As senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" required error={errors.firstName}>
          <Input
            placeholder="João"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            error={!!errors.firstName}
          />
        </Field>
        <Field label="Sobrenome" error={errors.lastName}>
          <Input
            placeholder="Silva"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label="E-mail" required error={errors.email}>
        <Input
          type="email"
          placeholder="joao@empresa.com"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          error={!!errors.email}
        />
      </Field>
      <Field label="Telefone" error={errors.phone}>
        <Input
          type="tel"
          placeholder="+55 11 99999-9999"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </Field>
      <Field label="Senha" required error={errors.password}>
        <Input
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={data.password}
          onChange={(e) => onChange({ password: e.target.value })}
          error={!!errors.password}
        />
      </Field>
      <Field label="Confirmar senha" required error={errors.confirmPassword}>
        <Input
          type="password"
          placeholder="Repita a senha"
          value={data.confirmPassword}
          onChange={(e) => onChange({ confirmPassword: e.target.value })}
          error={!!errors.confirmPassword}
        />
      </Field>
      <button
        onClick={() => validate() && onNext()}
        className="w-full btn-primary rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
      >
        Continuar <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Step 2: Company ── */
function StepCompany({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: CompanyData;
  onChange: (d: Partial<CompanyData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyData, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (!data.fantasyName.trim()) e.fantasyName = 'Obrigatório';
    if (!data.country) e.country = 'Obrigatório';
    if (!data.segment) e.segment = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="space-y-4">
      <Field label="Nome fantasia" required error={errors.fantasyName}>
        <Input
          placeholder="Minha Empresa"
          value={data.fantasyName}
          onChange={(e) => onChange({ fantasyName: e.target.value })}
          error={!!errors.fantasyName}
        />
      </Field>
      <Field label="Razão social" error={errors.legalName}>
        <Input
          placeholder="Minha Empresa Ltda."
          value={data.legalName}
          onChange={(e) => onChange({ legalName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNPJ" error={errors.cnpj}>
          <Input
            placeholder="00.000.000/0001-00"
            value={data.cnpj}
            onChange={(e) => onChange({ cnpj: e.target.value })}
          />
        </Field>
        <Field label="País" required error={errors.country}>
          <Select
            value={data.country}
            onChange={(e) => onChange({ country: e.target.value })}
            error={!!errors.country}
          >
            <option value="">Selecione</option>
            <option value="BR">Brasil</option>
            <option value="PT">Portugal</option>
            <option value="US">Estados Unidos</option>
            <option value="AR">Argentina</option>
            <option value="MX">México</option>
            <option value="CL">Chile</option>
            <option value="CO">Colômbia</option>
            <option value="OUTRO">Outro</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado" error={errors.state}>
          <Input
            placeholder="SP"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </Field>
        <Field label="Cidade" error={errors.city}>
          <Input
            placeholder="São Paulo"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefone comercial" error={errors.phone}>
          <Input
            type="tel"
            placeholder="+55 11 3333-4444"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </Field>
        <Field label="Site" error={errors.website}>
          <Input
            type="url"
            placeholder="https://empresa.com"
            value={data.website}
            onChange={(e) => onChange({ website: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Segmento" required error={errors.segment}>
        <Select
          value={data.segment}
          onChange={(e) => onChange({ segment: e.target.value })}
          error={!!errors.segment}
        >
          <option value="">Selecione o segmento</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Funcionários" error={errors.employeeCount}>
          <Select
            value={data.employeeCount}
            onChange={(e) => onChange({ employeeCount: e.target.value })}
          >
            <option value="">Selecione</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objetivo principal" error={errors.goal}>
          <Select value={data.goal} onChange={(e) => onChange({ goal: e.target.value })}>
            <option value="">Selecione</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          onClick={() => validate() && onNext()}
          className="flex-1 btn-primary rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Plan ── */
function StepPlan({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: PlanId | null;
  onSelect: (p: PlanId) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Todos os planos incluem 14 dias de trial gratuito. Cancele a qualquer momento.
      </p>
      <div className="space-y-3">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
              selected === plan.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-surface-1 hover:border-border/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                  {plan.highlight && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                      Popular
                    </span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-neural-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-display font-bold text-foreground">{plan.price}</p>
                <p className="text-[10px] text-neural-success mt-0.5">14 dias grátis</p>
              </div>
            </div>
            {selected === plan.id && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Selecionado
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          onClick={() => selected && onNext()}
          disabled={!selected}
          className="flex-1 btn-primary rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Começar trial gratuito <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
const emptyUser: UserData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};
const emptyCompany: CompanyData = {
  fantasyName: '',
  legalName: '',
  cnpj: '',
  country: 'BR',
  state: '',
  city: '',
  phone: '',
  website: '',
  segment: '',
  employeeCount: '',
  goal: '',
};

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<UserData>(emptyUser);
  const [company, setCompany] = useState<CompanyData>(emptyCompany);
  const [plan, setPlan] = useState<PlanId | null>('professional');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    setApiError(null);
    try {
      await authApi.register({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName || undefined,
      });
      setDone(true);
      // Auto-advance to success state then redirect to login
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response?.status;
      setApiError(
        status === 409
          ? 'Este e-mail já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.',
      );
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="flex flex-col items-center gap-6 text-center max-w-sm px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neural-success/10">
            <CheckCircle2 className="h-10 w-10 text-neural-success" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Conta criada!</h1>
            <p className="text-muted-foreground">
              Workspace da{' '}
              <strong className="text-foreground">{company.fantasyName || user.firstName}</strong>{' '}
              criado com sucesso. Verifique seu e-mail e faça login.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="btn-primary rounded-lg px-6 py-2.5 text-sm font-semibold"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex w-80 shrink-0 flex-col justify-between p-8"
        style={{ background: 'hsl(var(--surface-1))', borderRight: '1px solid hsl(var(--border))' }}
      >
        <div>
          <WalletzLogo variant="full" size="md" />
          <p className="mt-6 text-xs text-muted-foreground/70 tracking-[0.15em] uppercase">
            Crie. Ensine. Conecte. Automatize.
          </p>
          <div className="mt-10 space-y-4">
            {[
              'Configure agentes de IA sem programar',
              'Conecte WhatsApp, Google e Microsoft',
              'Importe leads e automatize campanhas',
              'Agende reuniões com sua IA',
              'Analise resultados em tempo real',
            ].map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-neural-success shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground/40">© 2026 Walletz Agent Studio</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[480px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <WalletzLogo variant="horizontal" size="sm" />
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all ${
                      done
                        ? 'bg-neural-success'
                        : active
                          ? 'bg-primary'
                          : 'bg-surface-2 border border-border'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <Icon
                        className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-muted-foreground'}`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${active ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-px flex-1 min-w-[16px] ${done ? 'bg-neural-success' : 'bg-border'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step header */}
          <div className="mb-6">
            <h1 className="text-xl font-display font-bold text-foreground">
              {step === 1 && 'Crie sua conta'}
              {step === 2 && 'Sua empresa'}
              {step === 3 && 'Escolha seu plano'}
              {step === 4 && 'Tudo pronto'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 && 'Comece sua jornada com o Walletz Agent Studio'}
              {step === 2 && 'Vamos personalizar sua experiência'}
              {step === 3 && '14 dias grátis, sem cartão de crédito'}
              {step === 4 && 'Revise e crie seu workspace'}
            </p>
          </div>

          {/* Step content */}
          <div className="neural-card p-6">
            {step === 1 && (
              <StepUser
                data={user}
                onChange={(d) => setUser((prev) => ({ ...prev, ...d }))}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepCompany
                data={company}
                onChange={(d) => setCompany((prev) => ({ ...prev, ...d }))}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <StepPlan
                selected={plan}
                onSelect={setPlan}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <div className="space-y-5">
                {/* Summary */}
                <div className="space-y-3">
                  {[
                    { label: 'Nome', value: `${user.firstName} ${user.lastName}`.trim() },
                    { label: 'E-mail', value: user.email },
                    { label: 'Empresa', value: company.fantasyName || '—' },
                    { label: 'País', value: company.country || '—' },
                    { label: 'Segmento', value: company.segment || '—' },
                    { label: 'Plano', value: PLANS.find((p) => p.id === plan)?.name ?? '—' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between py-1.5 border-b border-border/40 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-xs font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>

                {apiError && (
                  <p className="rounded-lg bg-neural-danger/10 px-3 py-2 text-sm text-neural-danger">
                    {apiError}
                  </p>
                )}

                <div className="rounded-lg border border-neural-success/20 bg-neural-success/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-neural-success font-medium">
                      Trial grátis de 14 dias.{' '}
                    </span>
                    Sem cartão de crédito. Cancele quando quiser.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                  <button
                    onClick={submit}
                    disabled={loading}
                    className="flex-1 btn-primary rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Criando workspace…
                      </>
                    ) : (
                      <>
                        Criar workspace <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
