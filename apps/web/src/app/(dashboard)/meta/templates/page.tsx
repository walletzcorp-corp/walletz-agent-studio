'use client';

import { useState } from 'react';
import {
  Plus, Search, FileText, CheckCircle2, XCircle,
  AlertTriangle, Clock, Pause, Ban, ChevronRight,
  Edit2, Copy, Archive, MoreHorizontal, Eye,
  Smartphone, ArrowLeft, Send, Trash2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

/* ── Types ── */
type TemplateStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type TemplateLanguage = 'pt_BR' | 'en_US' | 'es' | 'fr';

interface TemplateButton {
  type: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  text: string;
  url?: string;
  phone?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  status: TemplateStatus;
  header?: { type: 'TEXT' | 'IMAGE' | 'DOCUMENT'; text?: string };
  body: string;
  footer?: string;
  buttons?: TemplateButton[];
  variables?: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

/* ── Sample templates ── */
const SAMPLE_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: '1',
    name: 'boas_vindas_lead',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'APPROVED',
    header: { type: 'TEXT', text: 'Olá, {{1}}! 👋' },
    body: 'Seja bem-vindo à {{2}}! Sou o {{3}}, seu assistente virtual.\n\nEstou aqui para te ajudar com qualquer dúvida. Como posso te auxiliar hoje?',
    footer: 'Responda a qualquer momento',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Ver produtos' },
      { type: 'QUICK_REPLY', text: 'Falar com humano' },
    ],
    variables: ['nome', 'empresa', 'agente'],
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    usageCount: 47,
  },
  {
    id: '2',
    name: 'confirmacao_reuniao',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'APPROVED',
    body: 'Olá {{1}}, confirmando sua reunião:\n\n📅 Data: {{2}}\n⏰ Hora: {{3}}\n📍 Link: {{4}}\n\nAté lá!',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Confirmar' },
      { type: 'QUICK_REPLY', text: 'Remarcar' },
    ],
    variables: ['nome', 'data', 'hora', 'link'],
    createdAt: '2026-10-02',
    updatedAt: '2026-10-02',
    usageCount: 12,
  },
  {
    id: '3',
    name: 'follow_up_proposta',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'PENDING',
    body: 'Olá {{1}}, ainda está pensando na nossa proposta? Tenho uma condição especial válida até {{2}}. Gostaria de conversar?',
    buttons: [{ type: 'QUICK_REPLY', text: 'Sim, quero saber mais' }],
    variables: ['nome', 'data'],
    createdAt: '2026-10-03',
    updatedAt: '2026-10-05',
  },
  {
    id: '4',
    name: 'promo_outubro',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'REJECTED',
    body: 'PROMOÇÃO! Compre agora e ganhe 50% de desconto! Clique no link abaixo!',
    rejectionReason: 'Template contém linguagem de spam. Remova palavras em caps lock e superlativo excessivo.',
    createdAt: '2026-10-04',
    updatedAt: '2026-10-05',
  },
  {
    id: '5',
    name: 'codigo_verificacao',
    category: 'AUTHENTICATION',
    language: 'pt_BR',
    status: 'DRAFT',
    body: 'Seu código de verificação é {{1}}. Válido por {{2}} minutos. Não compartilhe com ninguém.',
    variables: ['codigo', 'minutos'],
    createdAt: '2026-10-05',
    updatedAt: '2026-10-05',
  },
];

/* ── Status config ── */
const STATUS_CONFIG: Record<TemplateStatus, { label: string; className: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Rascunho',   className: 'bg-surface-2 text-muted-foreground border border-border',     icon: Edit2 },
  SUBMITTED: { label: 'Enviado',    className: 'badge-blue',                                                   icon: Send },
  PENDING:   { label: 'Pendente',   className: 'badge-warning',                                                icon: Clock },
  APPROVED:  { label: 'Aprovado',   className: 'badge-success',                                                icon: CheckCircle2 },
  REJECTED:  { label: 'Rejeitado',  className: 'badge-danger',                                                 icon: XCircle },
  PAUSED:    { label: 'Pausado',    className: 'bg-surface-2 text-neural-warning border border-neural-warning/30', icon: Pause },
  DISABLED:  { label: 'Desativado', className: 'bg-surface-2 text-muted-foreground/50 border border-border/50',    icon: Ban },
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  MARKETING:      'Marketing',
  UTILITY:        'Utilidade',
  AUTHENTICATION: 'Autenticação',
};

const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  pt_BR: 'Português (BR)',
  en_US: 'English (US)',
  es:    'Español',
  fr:    'Français',
};

/* ── WhatsApp Preview ── */
function WhatsAppPreview({ template }: { template: Partial<WhatsAppTemplate> }) {
  const previewBody = (template.body ?? '').replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const vars = template.variables ?? [];
    return vars[parseInt(n) - 1] ? `[${vars[parseInt(n) - 1]}]` : `[var${n}]`;
  });

  return (
    <div className="bg-[#0D1B2A] rounded-2xl p-4 max-w-[280px] mx-auto">
      {/* Phone chrome */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="h-8 w-8 rounded-full bg-[#25D366]/20 flex items-center justify-center">
          <Smartphone className="h-4 w-4 text-[#25D366]" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Seu Agente</p>
          <p className="text-[10px] text-white/50">WhatsApp Business</p>
        </div>
      </div>

      {/* Message bubble */}
      <div className="bg-[#1E2D3D] rounded-xl rounded-tl-none p-3 space-y-2 max-w-[240px]">
        {template.header?.text && (
          <p className="text-white font-semibold text-xs leading-tight">{template.header.text}</p>
        )}
        <p className="text-white/90 text-xs leading-relaxed whitespace-pre-line">{previewBody || 'Corpo da mensagem…'}</p>
        {template.footer && (
          <p className="text-white/40 text-[10px]">{template.footer}</p>
        )}
        <p className="text-white/30 text-[10px] text-right">14:32 ✓✓</p>
      </div>

      {/* Buttons */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="mt-2 space-y-1">
          {template.buttons.map((btn, i) => (
            <div key={i} className="rounded-xl bg-[#1E2D3D] border border-[#25D366]/20 px-3 py-2 text-center text-xs text-[#25D366] font-medium">
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── New Template Modal (inline drawer) ── */
function NewTemplateDrawer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Partial<WhatsAppTemplate>>({
    category: 'MARKETING',
    language: 'pt_BR',
    header: undefined,
    body: '',
    footer: '',
    buttons: [],
    variables: [],
  });
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [activePreview, setActivePreview] = useState(true);

  function update(patch: Partial<WhatsAppTemplate>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function addButton() {
    update({ buttons: [...(form.buttons ?? []), { type: 'QUICK_REPLY', text: '' }] });
  }

  function removeButton(idx: number) {
    update({ buttons: form.buttons?.filter((_, i) => i !== idx) });
  }

  function addVariable() {
    update({ variables: [...(form.variables ?? []), ''] });
  }

  const canSubmit = form.name && form.body && form.body.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div
        className="w-[860px] bg-background border-l border-border flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-sm font-display font-semibold text-foreground">Novo Template</h2>
              <p className="text-xs text-muted-foreground">Crie e envie para aprovação da Meta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePreview(!activePreview)}
              className={`btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 ${activePreview ? 'text-primary' : ''}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              disabled={!canSubmit}
              className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar para aprovação
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Objective selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Qual é o objetivo desta mensagem? *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  { label: 'Iniciar conversa',      cat: 'MARKETING',      emoji: '👋', hint: 'Primeiro contato ou boas-vindas' },
                  { label: 'Confirmar agendamento', cat: 'UTILITY',        emoji: '📅', hint: 'Reuniões, consultas, reservas' },
                  { label: 'Reativar cliente',      cat: 'MARKETING',      emoji: '🔄', hint: 'Clientes sem contato recente' },
                  { label: 'Enviar atualização',    cat: 'UTILITY',        emoji: '📢', hint: 'Pedidos, status, avisos' },
                  { label: 'Verificação',           cat: 'AUTHENTICATION', emoji: '🔐', hint: 'Códigos de acesso' },
                  { label: 'Outro',                 cat: 'MARKETING',      emoji: '💬', hint: 'Definir manualmente' },
                ] as Array<{ label: string; cat: TemplateCategory; emoji: string; hint: string }>).map(obj => (
                  <button
                    key={obj.label}
                    type="button"
                    onClick={() => update({ category: obj.cat })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                      form.category === obj.cat && form.name?.includes(obj.label.toLowerCase().split(' ')[0]!)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-surface-1 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-lg">{obj.emoji}</span>
                    <p className="text-xs font-semibold text-foreground">{obj.label}</p>
                    <p className="text-[10px] text-muted-foreground">{obj.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name and Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome do template *</label>
                <input
                  value={form.name ?? ''}
                  onChange={e => update({ name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                  placeholder="boas_vindas_lead"
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono"
                />
                <p className="text-[10px] text-muted-foreground/60">Apenas letras minúsculas, números e _</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Idioma *</label>
                <select
                  value={form.language}
                  onChange={e => update({ language: e.target.value as TemplateLanguage })}
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="pt_BR">Português (BR)</option>
                  <option value="en_US">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Header</label>
                <button
                  onClick={() => setHeaderEnabled(!headerEnabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${headerEnabled ? 'bg-primary' : 'bg-surface-3'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${headerEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {headerEnabled && (
                <input
                  value={form.header?.text ?? ''}
                  onChange={e => update({ header: { type: 'TEXT', text: e.target.value } })}
                  placeholder="Olá, {{1}}! 👋"
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              )}
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Corpo *</label>
              <textarea
                value={form.body ?? ''}
                onChange={e => update({ body: e.target.value })}
                placeholder="Digite o corpo da mensagem. Use {{1}}, {{2}}… para variáveis."
                rows={5}
                className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60">{form.body?.length ?? 0}/1024 caracteres</p>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Footer</label>
                <button
                  onClick={() => setFooterEnabled(!footerEnabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${footerEnabled ? 'bg-primary' : 'bg-surface-3'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${footerEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {footerEnabled && (
                <input
                  value={form.footer ?? ''}
                  onChange={e => update({ footer: e.target.value })}
                  placeholder="Texto de rodapé"
                  className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              )}
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Nomes das variáveis <span className="text-muted-foreground/50">(para preview)</span>
                </label>
                <button onClick={addVariable} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>
              {(form.variables ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 font-mono">{`{{${i+1}}}`}</span>
                  <input
                    value={v}
                    onChange={e => {
                      const vars = [...(form.variables ?? [])];
                      vars[i] = e.target.value;
                      update({ variables: vars });
                    }}
                    placeholder={`variavel_${i+1}`}
                    className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Botões <span className="text-muted-foreground/50">(máx. 3)</span></label>
                {(form.buttons?.length ?? 0) < 3 && (
                  <button onClick={addButton} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Botão
                  </button>
                )}
              </div>
              {(form.buttons ?? []).map((btn, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={btn.type}
                    onChange={e => {
                      const btns = [...(form.buttons ?? [])];
                      btns[i] = { ...btns[i], type: e.target.value as TemplateButton['type'] };
                      update({ buttons: btns });
                    }}
                    className="rounded-lg border border-border bg-surface-1 px-2 py-1.5 text-xs text-foreground focus:outline-none shrink-0"
                  >
                    <option value="QUICK_REPLY">Resposta rápida</option>
                    <option value="CALL_TO_ACTION">Ação (URL/Tel)</option>
                  </select>
                  <input
                    value={btn.text}
                    onChange={e => {
                      const btns = [...(form.buttons ?? [])];
                      btns[i] = { ...btns[i], text: e.target.value };
                      update({ buttons: btns });
                    }}
                    placeholder="Texto do botão"
                    className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={() => removeButton(i)} className="text-muted-foreground hover:text-neural-danger p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* WhatsApp not connected warning */}
            <div className="rounded-lg border border-neural-warning/30 bg-neural-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-neural-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                WhatsApp não conectado. Conecte seu número para enviar templates para aprovação da Meta.
                {' '}<Link href="/canais/whatsapp" className="text-neural-blue hover:underline">Conectar agora</Link>
              </p>
            </div>
          </div>

          {/* Preview */}
          {activePreview && (
            <div className="w-72 border-l border-border bg-surface-1 px-5 py-6 overflow-y-auto shrink-0">
              <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Preview</p>
              <WhatsAppPreview template={form} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'ALL'>('ALL');
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState<WhatsAppTemplate | null>(null);

  const filtered = SAMPLE_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    APPROVED: SAMPLE_TEMPLATES.filter(t => t.status === 'APPROVED').length,
    PENDING:  SAMPLE_TEMPLATES.filter(t => t.status === 'PENDING').length,
    REJECTED: SAMPLE_TEMPLATES.filter(t => t.status === 'REJECTED').length,
    DRAFT:    SAMPLE_TEMPLATES.filter(t => t.status === 'DRAFT').length,
  };

  return (
    <>
      {showNew && <NewTemplateDrawer onClose={() => setShowNew(false)} />}

      <div className="page-container space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/meta" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">Templates WhatsApp</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Crie e gerencie templates para aprovação da Meta.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Novo Template
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Aprovados',  value: counts.APPROVED, className: 'text-neural-success' },
            { label: 'Pendentes',  value: counts.PENDING,  className: 'text-neural-warning' },
            { label: 'Rejeitados', value: counts.REJECTED, className: 'text-neural-danger' },
            { label: 'Rascunhos',  value: counts.DRAFT,    className: 'text-muted-foreground' },
          ].map(kpi => (
            <div key={kpi.label} className="stat-card text-center">
              <p className={`text-3xl font-display font-bold ${kpi.className}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* WhatsApp not connected warning */}
        <div className="rounded-lg border border-border bg-surface-1 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-neural-warning shrink-0" />
            <p className="text-sm text-muted-foreground">
              WhatsApp não conectado — templates em modo rascunho. Conecte para enviar à Meta.
            </p>
          </div>
          <Link href="/canais/whatsapp" className="text-xs text-neural-blue hover:underline whitespace-nowrap flex items-center gap-1">
            Conectar <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs rounded-lg border border-border bg-surface-1 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar template…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface-1">
            {(['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Templates table */}
        <div className="neural-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Idioma</th>
                <th>Status</th>
                <th>Uso</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const statusCfg = STATUS_CONFIG[t.status];
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={t.id}>
                    <td>
                      <p className="font-mono text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[220px] mt-0.5">{t.body.slice(0, 60)}…</p>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${
                        t.category === 'MARKETING' ? 'text-neural-blue' :
                        t.category === 'UTILITY'   ? 'text-neural-cyan' :
                        'text-neural-warning'
                      }`}>
                        {CATEGORY_LABELS[t.category]}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{LANGUAGE_LABELS[t.language]}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusCfg.className}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {statusCfg.label}
                      </span>
                      {t.rejectionReason && (
                        <p className="text-[10px] text-neural-danger/80 mt-1 max-w-[160px] truncate" title={t.rejectionReason}>
                          {t.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {t.usageCount !== undefined ? t.usageCount : '—'}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(t.updatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreview(t)}
                          className="p-1.5 rounded text-muted-foreground hover:text-neural-blue transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
                          <button
                            className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum template encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div className="bg-surface-1 rounded-2xl border border-border p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-mono text-foreground">{preview.name}</h3>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <WhatsAppPreview template={preview} />
            {preview.status === 'REJECTED' && preview.rejectionReason && (
              <div className="rounded-xl border border-neural-danger/30 bg-neural-danger/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-neural-danger">Template rejeitado pela Meta</p>
                <p className="text-xs text-foreground">{preview.rejectionReason}</p>
                <p className="text-xs text-muted-foreground">Edite o template conforme a orientação acima e envie novamente para aprovação.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setPreview(null)} className="btn-primary rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
                    <Edit2 className="h-3 w-3" /> Editar template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
