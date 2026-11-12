'use client';

import { useState } from 'react';
import {
  Building2, Palette, Users, Bot, Smartphone, Calendar,
  Megaphone, Shield, CreditCard, FileText, Save,
  ChevronRight, Plus, Trash2, Eye, EyeOff, Check,
  AlertTriangle, ExternalLink, RefreshCw, Zap, Globe,
  Mail, Clock, Key, UserCheck, Activity,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { withBasePath } from '../../../lib/paths';

/* ── Tab definitions ── */
const TABS = [
  { id: 'geral',         label: 'Geral',               icon: Building2 },
  { id: 'identidade',    label: 'Identidade',          icon: Palette },
  { id: 'usuarios',      label: 'Usuários',            icon: Users },
  { id: 'agentes',       label: 'Agentes',             icon: Bot },
  { id: 'canais',        label: 'Canais',              icon: Smartphone },
  { id: 'agenda',        label: 'Agenda',              icon: Calendar },
  { id: 'campanhas',     label: 'Leads & Campanhas',   icon: Megaphone },
  { id: 'seguranca',     label: 'Segurança',           icon: Shield },
  { id: 'billing',       label: 'Assinatura',          icon: CreditCard },
  { id: 'logs',          label: 'Logs',                icon: FileText },
];

/* ── Reusable field ── */
function Field({
  label, description, children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({ value, placeholder, type = 'text' }: { value?: string; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={value}
      placeholder={placeholder}
      className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
    />
  );
}

function Select({ options, value }: { options: { value: string; label: string }[]; value?: string }) {
  return (
    <select
      defaultValue={value}
      className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-primary' : 'bg-surface-3'}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform inline-block ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

function SaveButton({ label = 'Salvar alterações' }: { label?: string }) {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <button
      onClick={handleSave}
      className="btn-primary rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2"
    >
      {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {saved ? 'Salvo!' : label}
    </button>
  );
}

/* ── Tab content components ── */

function TabGeral({ tenantName }: { tenantName?: string }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Dados da empresa" description="Informações básicas do seu workspace" />
      <div className="space-y-4">
        <Field label="Nome da empresa">
          <Input value={tenantName ?? 'Demo Empresa'} placeholder="Nome da empresa" />
        </Field>
        <Field label="Site" description="URL do site da empresa">
          <Input placeholder="https://empresa.com.br" />
        </Field>
        <Field label="Idioma">
          <Select
            options={[
              { value: 'pt_BR', label: 'Português (Brasil)' },
              { value: 'en_US', label: 'English (US)' },
              { value: 'es_ES', label: 'Español' },
            ]}
            value="pt_BR"
          />
        </Field>
        <Field label="Fuso horário">
          <Select
            options={[
              { value: 'America/Sao_Paulo', label: 'América/São Paulo (UTC-3)' },
              { value: 'America/Manaus', label: 'América/Manaus (UTC-4)' },
              { value: 'America/Belem', label: 'América/Belém (UTC-3)' },
              { value: 'UTC', label: 'UTC' },
            ]}
            value="America/Sao_Paulo"
          />
        </Field>
        <Field label="Moeda">
          <Select
            options={[
              { value: 'BRL', label: 'Real (BRL)' },
              { value: 'USD', label: 'Dólar (USD)' },
              { value: 'EUR', label: 'Euro (EUR)' },
            ]}
            value="BRL"
          />
        </Field>
        <Field label="CNPJ / Identificação fiscal" description="Opcional — usado em notas e relatórios">
          <Input placeholder="00.000.000/0000-00" />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </div>
  );
}

function TabIdentidade() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Identidade visual" description="Personalize a aparência do seu workspace" />
      <div className="space-y-4">
        <Field label="Logotipo" description="PNG ou SVG, min. 200×200px">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neural-violet/10 border border-neural-violet/30">
              <span className="text-neural-violet font-display font-bold text-xl">W</span>
            </div>
            <button className="btn-ghost rounded-lg px-4 py-2 text-sm">Alterar logo</button>
          </div>
        </Field>

        <Field label="Nome exibido" description="Como aparece na interface">
          <Input value="Walletz Agent Studio" />
        </Field>

        <Field label="Tema" description="Neural (recomendado) — dark premium">
          <div className="flex gap-3">
            {[
              { id: 'neural', label: 'Neural Dark', active: true, preview: 'bg-[#070B14] border-neural-violet/50' },
              { id: 'light', label: 'Claro', active: false, preview: 'bg-white border-gray-300' },
            ].map((theme) => (
              <div
                key={theme.id}
                className={`flex items-center gap-2.5 rounded-lg p-3 border cursor-pointer transition-colors ${
                  theme.active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className={`h-8 w-14 rounded border ${theme.preview}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{theme.label}</p>
                  {theme.active && <p className="text-xs text-neural-success">Ativo</p>}
                </div>
              </div>
            ))}
          </div>
        </Field>

        <Field label="Cor primária" description="Cor principal de CTAs e destaque">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-neural-violet border border-border" />
            <Input value="#6D4AFF" />
          </div>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </div>
  );
}

function TabUsuarios() {
  const users = [
    { name: 'demo@walletz.dev', role: 'owner', status: 'active', since: 'Out 2026' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Usuários e permissões" description="Gerencie acesso ao workspace" />
        <button className="btn-primary rounded-lg px-3 py-2 text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Convidar usuário
        </button>
      </div>

      <div className="neural-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.name}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neural-violet/10 text-neural-violet text-xs font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{u.name}</span>
                  </div>
                </td>
                <td>
                  <span className="badge-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize">
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="badge-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Ativo
                  </span>
                </td>
                <td className="text-sm">{u.since}</td>
                <td>
                  {u.role !== 'owner' && (
                    <button className="p-1.5 text-muted-foreground hover:text-neural-danger rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabAgentes() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Configurações globais de agentes" description="Comportamento padrão para todos os agentes" />
      <div className="space-y-4">
        <Field label="Comportamento padrão" description="Como o agente se comporta por padrão ao não entender uma mensagem">
          <Select
            options={[
              { value: 'fallback', label: 'Usar resposta de fallback' },
              { value: 'handoff', label: 'Encaminhar para humano' },
              { value: 'ignore', label: 'Ignorar silenciosamente' },
            ]}
            value="fallback"
          />
        </Field>

        <Field label="Fallback padrão" description="Mensagem enviada quando o agente não sabe responder">
          <textarea
            defaultValue="Entendo que você precisa de ajuda com isso. Deixe-me te conectar com um especialista. Um momento."
            rows={3}
            className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors resize-none"
          />
        </Field>

        <Field label="Handoff automático" description="Transferir para humano quando confiança da IA for baixa">
          <Toggle defaultChecked />
        </Field>

        <Field label="Limite de tokens por conversa" description="Máximo de tokens por sessão de conversa">
          <Input value="4000" type="number" />
        </Field>

        <Field label="Pode agendar reuniões" description="Permitir que agentes agendem reuniões automaticamente">
          <Toggle defaultChecked />
        </Field>

        <Field label="Aprendizado contínuo" description="Marcar novas respostas como candidatas ao Ensinar IA">
          <div className="flex items-center gap-3">
            <Toggle />
            <span className="text-xs text-muted-foreground">Requer aprovação humana antes de aplicar</span>
          </div>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </div>
  );
}

function TabCanais() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Canais conectados" description="Gerencie integrações com plataformas de comunicação" />

      {/* WhatsApp card */}
      <div className="neural-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 border border-[#25D366]/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">WhatsApp Business</p>
              <p className="text-xs text-muted-foreground">Não configurado</p>
            </div>
          </div>
          <a href={withBasePath('/canais/whatsapp')} className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
            Configurar
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="neural-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/30">
              <Calendar className="h-5 w-5 text-[#4285F4]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Não conectado</p>
            </div>
          </div>
          <a href={withBasePath('/agendas')} className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
            Conectar
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Microsoft Teams */}
      <div className="neural-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5059C9]/10 border border-[#5059C9]/30">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#5059C9]">
                <path d="M13.5 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm5.25 6.5h-7.5A.75.75 0 0 0 10.5 9.25v6.5a4.25 4.25 0 0 0 8.5 0v-6.5a.75.75 0 0 0-.25-.75zM8 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm2 5.5H5.5a.5.5 0 0 0-.5.5v4a3 3 0 0 0 6 0v-4a.5.5 0 0 0-.5-.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Microsoft Teams</p>
              <p className="text-xs text-muted-foreground">Não conectado</p>
            </div>
          </div>
          <a href={withBasePath('/agendas')} className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
            Conectar
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Webhooks section */}
      <div className="space-y-4">
        <SectionTitle title="Webhooks" description="Notificações de eventos em tempo real" />
        <div className="neural-card p-5 space-y-4">
          <Field label="Webhook URL" description="Receber eventos do Walletz no seu servidor">
            <div className="flex gap-2">
              <Input placeholder="https://seu-servidor.com/webhook" />
              <button className="btn-ghost rounded-lg px-3 py-2 text-sm whitespace-nowrap">Testar</button>
            </div>
          </Field>
          <Field label="Eventos ativos">
            <div className="space-y-2">
              {['Novo contato', 'Nova conversa', 'Reunião agendada', 'Campanha concluída'].map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border accent-primary" />
                  <span className="text-sm text-muted-foreground">{ev}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="flex justify-end">
            <SaveButton label="Salvar webhook" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabAgenda() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Agenda e reuniões" description="Configurações padrão para agendamento" />
      <div className="space-y-4">
        <Field label="Provedor padrão" description="Plataforma de reunião padrão ao criar um evento">
          <Select
            options={[
              { value: 'google_meet', label: 'Google Meet' },
              { value: 'teams', label: 'Microsoft Teams' },
              { value: 'presencial', label: 'Presencial' },
              { value: 'phone', label: 'Telefone' },
            ]}
            value="google_meet"
          />
        </Field>

        <Field label="Duração padrão de reunião" description="Duração em minutos">
          <Select
            options={[
              { value: '15', label: '15 minutos' },
              { value: '30', label: '30 minutos' },
              { value: '45', label: '45 minutos' },
              { value: '60', label: '1 hora' },
            ]}
            value="30"
          />
        </Field>

        <Field label="Buffer entre reuniões" description="Tempo livre entre compromissos">
          <Select
            options={[
              { value: '0', label: 'Sem buffer' },
              { value: '10', label: '10 minutos' },
              { value: '15', label: '15 minutos' },
              { value: '30', label: '30 minutos' },
            ]}
            value="15"
          />
        </Field>

        <Field label="Antecedência mínima" description="Com quanto tempo de antecedência pode agendar">
          <Select
            options={[
              { value: '1', label: '1 hora' },
              { value: '2', label: '2 horas' },
              { value: '4', label: '4 horas' },
              { value: '24', label: '1 dia' },
            ]}
            value="2"
          />
        </Field>

        <Field label="Fuso horário das reuniões">
          <Select
            options={[
              { value: 'America/Sao_Paulo', label: 'América/São Paulo (UTC-3)' },
              { value: 'UTC', label: 'UTC' },
            ]}
            value="America/Sao_Paulo"
          />
        </Field>

        <Field label="Confirmar reunião automaticamente" description="Confirmar sem aprovação manual do responsável">
          <Toggle />
        </Field>

        <Field label="Enviar convite ao cliente" description="Email de convite com link da reunião">
          <Toggle defaultChecked />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </div>
  );
}

function TabCampanhas() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Leads e campanhas" description="Políticas de importação, contato e consentimento" />
      <div className="space-y-4">
        <Field label="Deduplicação" description="Como tratar leads duplicados na importação">
          <Select
            options={[
              { value: 'merge', label: 'Mesclar com existente' },
              { value: 'skip', label: 'Ignorar duplicata' },
              { value: 'overwrite', label: 'Sobrescrever' },
            ]}
            value="merge"
          />
        </Field>

        <Field label="Janela de contato" description="Intervalo mínimo entre contatos ao mesmo número">
          <Select
            options={[
              { value: '6', label: '6 horas' },
              { value: '24', label: '24 horas' },
              { value: '48', label: '48 horas' },
              { value: '72', label: '72 horas' },
            ]}
            value="24"
          />
        </Field>

        <Field label="Requer consentimento" description="Só enviar se o contato tiver consentimento de marketing">
          <Toggle defaultChecked />
        </Field>

        <Field label="Processamento de opt-out" description="Ação ao receber pedido de cancelamento">
          <Select
            options={[
              { value: 'immediate', label: 'Imediato — pausar agora' },
              { value: 'next_batch', label: 'Próximo batch' },
            ]}
            value="immediate"
          />
        </Field>

        <Field label="Normalização E.164" description="Normalizar automaticamente números de telefone para E.164">
          <Toggle defaultChecked />
        </Field>

        <Field label="Campos obrigatórios na importação" description="Colunas obrigatórias nos arquivos CSV/XLSX">
          <div className="flex flex-wrap gap-2">
            {['Telefone', 'Nome', 'Email'].map((f) => (
              <span key={f} className="badge-primary rounded-full px-2.5 py-0.5 text-xs font-medium">{f}</span>
            ))}
            <button className="badge-blue rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Adicionar campo
            </button>
          </div>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </div>
  );
}

function TabSeguranca() {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-6">
      <SectionTitle title="Segurança" description="Senha, sessões, MFA e auditoria" />

      <div className="space-y-4">
        <Field label="Alterar senha">
          <div className="space-y-2">
            <Input type="password" placeholder="Senha atual" />
            <Input type="password" placeholder="Nova senha" />
            <Input type="password" placeholder="Confirmar nova senha" />
            <SaveButton label="Atualizar senha" />
          </div>
        </Field>

        <Field label="MFA (Autenticação de 2 fatores)" description="Camada extra de segurança no login">
          <div className="flex items-center gap-3">
            <Toggle />
            <span className="text-xs text-muted-foreground">Recomendado para contas owner</span>
          </div>
        </Field>

        <Field label="API Token" description="Token para integração via API REST">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value="wltz_live_sk_01a10d5b_xxxxxxxxxxxxxxxx"
              />
            </div>
            <button
              onClick={() => setShowToken(!showToken)}
              className="btn-ghost rounded-lg px-3 py-2 text-sm"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button className="btn-ghost rounded-lg px-3 py-2 text-sm">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </Field>
      </div>

      {/* Active sessions */}
      <div>
        <SectionTitle title="Sessões ativas" />
        <div className="neural-card p-4 space-y-3">
          {[
            { device: 'Chrome · Windows 11', ip: '189.xxx.xxx.xxx', location: 'São Paulo, BR', since: 'Hoje, 16:00', current: true },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-surface-2 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{s.ip} · {s.location} · {s.since}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.current && <span className="badge-success rounded-full px-2 py-0.5 text-xs font-medium">Atual</span>}
                {!s.current && <button className="text-xs text-neural-danger hover:underline">Revogar</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabBilling() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Assinatura" description="Plano atual, consumo e histórico" />

      <div className="neural-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-display font-semibold text-foreground">Plano Starter</p>
            <p className="text-sm text-muted-foreground">Período de demonstração — 30 dias restantes</p>
          </div>
          <button className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
            Fazer upgrade
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { label: 'Mensagens', used: 612, limit: 5000 },
            { label: 'Agentes', used: 1, limit: 3 },
            { label: 'Contatos', used: 0, limit: 1000 },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-surface-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground">{item.used}/{item.limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(item.used / item.limit) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plans comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { name: 'Starter', price: 'Grátis', current: true, features: ['1 agente', '5k mensagens/mês', '1.000 contatos', 'WhatsApp Sandbox'] },
          { name: 'Pro', price: 'R$ 297/mês', current: false, features: ['5 agentes', '50k mensagens/mês', '25.000 contatos', 'WhatsApp Oficial', 'Campanhas', 'Análises'] },
          { name: 'Enterprise', price: 'Custom', current: false, features: ['Agentes ilimitados', 'Mensagens ilimitadas', 'Contatos ilimitados', 'SLA dedicado', 'Onboarding premium'] },
        ].map((plan) => (
          <div key={plan.name} className={`neural-card p-5 space-y-4 ${plan.current ? 'border-primary/40' : ''}`}>
            <div>
              <p className="text-sm font-display font-semibold text-foreground">{plan.name}</p>
              <p className={`text-xl font-bold ${plan.current ? 'text-primary' : 'text-foreground'}`}>{plan.price}</p>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-neural-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button className="w-full btn-primary rounded-lg py-2 text-sm font-medium">
                Assinar {plan.name}
              </button>
            )}
            {plan.current && (
              <span className="w-full flex justify-center text-xs text-primary font-medium py-2">
                Plano atual
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabLogs() {
  const logs = [
    { time: '20:00:14', level: 'info', service: 'API', message: 'Server started on port 3001' },
    { time: '20:00:07', level: 'info', service: 'Auth', message: 'User demo@walletz.dev authenticated' },
    { time: '19:58:00', level: 'warn', service: 'BullMQ', message: 'Queue outbox: 0 jobs pending' },
    { time: '19:55:10', level: 'info', service: 'WhatsApp', message: 'Webhook verified for account tenant' },
    { time: '19:50:00', level: 'error', service: 'Lab', message: 'ANTHROPIC_API_KEY not set — lab unavailable' },
  ];

  const levelConfig: Record<string, string> = {
    info:  'badge-blue',
    warn:  'badge-warning',
    error: 'badge-danger',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Logs e diagnóstico" description="Últimos eventos e erros da plataforma" />
        <button className="btn-ghost rounded-lg px-3 py-2 text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'API', status: 'ok', icon: Activity },
          { label: 'Banco de dados', status: 'ok', icon: Activity },
          { label: 'Redis', status: 'ok', icon: Activity },
          { label: 'WhatsApp', status: 'pending', icon: AlertTriangle },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.status === 'ok' ? 'bg-neural-success/10' : 'bg-neural-warning/10'}`}>
                <Icon className={`h-4 w-4 ${s.status === 'ok' ? 'text-neural-success' : 'text-neural-warning'}`} />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className={`text-xs ${s.status === 'ok' ? 'text-neural-success' : 'text-neural-warning'}`}>
                  {s.status === 'ok' ? 'Operacional' : 'Configurar'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="neural-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-24">Hora</th>
              <th className="w-20">Nível</th>
              <th className="w-24">Serviço</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{log.time}</td>
                <td>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${levelConfig[log.level]}`}>
                    {log.level}
                  </span>
                </td>
                <td className="text-xs font-medium text-foreground">{log.service}</td>
                <td className="text-xs font-mono">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const { tenantName } = useAuth();

  const tabContent: Record<string, React.ReactNode> = {
    geral:      tenantName ? <TabGeral tenantName={tenantName} /> : <TabGeral />,
    identidade: <TabIdentidade />,
    usuarios:   <TabUsuarios />,
    agentes:    <TabAgentes />,
    canais:     <TabCanais />,
    agenda:     <TabAgenda />,
    campanhas:  <TabCampanhas />,
    seguranca:  <TabSeguranca />,
    billing:    <TabBilling />,
    logs:       <TabLogs />,
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central administrativa do seu workspace
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-0.5 sticky top-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {activeTab === tab.id && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="neural-card p-6">
            {tabContent[activeTab]}
          </div>
        </main>
      </div>
    </div>
  );
}
