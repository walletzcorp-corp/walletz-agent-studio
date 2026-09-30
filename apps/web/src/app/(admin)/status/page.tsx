import { CheckCircle2, Clock, Wrench, Circle } from 'lucide-react';

type ModuleStatus = 'funcional' | 'parcial' | 'prototipo' | 'nao_iniciado';

interface Feature {
  name: string;
  status: ModuleStatus;
  note?: string;
}

interface Module {
  name: string;
  description: string;
  status: ModuleStatus;
  features: Feature[];
  dependencies?: string[];
}

const STATUS_META: Record<ModuleStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  funcional:    { label: 'Funcional e testado',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  parcial:      { label: 'Parcialmente funcional', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',   icon: Wrench },
  prototipo:    { label: 'Protótipo visual',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: Clock },
  nao_iniciado: { label: 'Não iniciado',          color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200',   icon: Circle },
};

const MODULES: Module[] = [
  {
    name: 'Módulo 1 — Organizações, Unidades e Acesso',
    description: 'Cadastro e gestão de organizações e unidades clínicas, controle de acesso por perfil.',
    status: 'parcial',
    features: [
      { name: 'CRUD de Organizações com CNPJ válido', status: 'funcional' },
      { name: 'Máquina de estados (RASCUNHO → ATIVA → SUSPENSA)', status: 'funcional' },
      { name: 'CRUD de Unidades com checklist de ativação', status: 'funcional' },
      { name: 'Histórico de status (auditoria)', status: 'funcional' },
      { name: 'Outbox events para integração eventual', status: 'funcional' },
      { name: 'Dev Auth Bypass (login sem Keycloak)', status: 'funcional', note: 'Apenas NODE_ENV=development' },
      { name: 'Isolamento de tenant derivado do JWT', status: 'funcional', note: 'Aplicado em todos os serviços e controllers' },
      { name: 'RLS PostgreSQL (CREATE POLICY)', status: 'prototipo', note: 'Script SQL em prisma/rls_policies.sql; requer withTenant() em todas as queries para ativar' },
      { name: 'Guard de permissão por Perfil/Permissão', status: 'nao_iniciado', note: 'Estrutura de tabelas existe; guard não implementado' },
      { name: 'Convite de usuários por e-mail', status: 'nao_iniciado', note: 'Depende de Keycloak + Mailpit' },
    ],
    dependencies: [],
  },
  {
    name: 'Módulo 2 — Profissionais, Recursos e Catálogo de Serviços',
    description: 'Cadastro de profissionais de saúde, salas/equipamentos e catálogo de serviços/procedimentos.',
    status: 'parcial',
    features: [
      { name: 'CRUD de Especialidades', status: 'funcional' },
      { name: 'CRUD de Profissionais com vínculo a especialidades', status: 'funcional' },
      { name: 'Vinculação profissional ↔ unidade', status: 'funcional' },
      { name: 'CRUD de Recursos (salas, equipamentos)', status: 'funcional' },
      { name: 'Catálogo de Serviços com tabela de preços', status: 'funcional' },
      { name: 'Publicação de serviço (RASCUNHO → PUBLICADO)', status: 'funcional' },
      { name: 'Isolamento de tenant em todos os endpoints', status: 'funcional', note: 'Mesma proteção do Módulo 1' },
      { name: 'Credenciais do profissional (CRM/CFO/etc.)', status: 'prototipo', note: 'Tabela existe; UI não implementada' },
      { name: 'Upload de documentos do profissional', status: 'nao_iniciado' },
      { name: 'Versionamento de serviços', status: 'nao_iniciado', note: 'Campo version existe; fluxo de nova versão não implementado' },
    ],
    dependencies: ['Módulo 1'],
  },
  {
    name: 'Módulo 3 — Agenda e Jornada Operacional',
    description: 'Agendamento de consultas e procedimentos, jornada do paciente, fila física e lista de espera.',
    status: 'parcial',
    features: [
      { name: 'Vistas de agenda: dia, semana e mês (RF-AGE-001)', status: 'funcional' },
      { name: 'Tipos de agendamento: consulta, retorno, sessão, procedimento, teleconsulta (RF-AGE-002)', status: 'funcional' },
      { name: 'Detecção de conflito com advisory lock (RF-AGE-003)', status: 'funcional' },
      { name: 'Recorrência e pacote de sessões (RF-AGE-004)', status: 'funcional' },
      { name: 'Regras de disponibilidade para agendamento online (RF-AGE-005)', status: 'funcional' },
      { name: 'Confirmação e cancelamento com motivo (RF-AGE-006/007)', status: 'funcional' },
      { name: 'Reagendamento (cria novo, marca anterior como REAGENDADO) (RF-AGE-007)', status: 'funcional' },
      { name: 'Lista de espera com promoção para agendamento (RF-AGE-008)', status: 'funcional' },
      { name: 'Jornada operacional: check-in, aguardando, atendimento, finalizado (RF-AGE-009)', status: 'funcional' },
      { name: 'Indicadores: tempo de espera, atraso, não compareceu (RF-AGE-012)', status: 'funcional' },
      { name: 'Fila física com senhas, prioridade legal configurável, painel (RF-AGE-015)', status: 'funcional' },
      { name: 'Cadastro de pacientes (dados básicos)', status: 'funcional' },
      { name: 'Roteamento interno (triagem → consulta → procedimento → alta) (RF-AGE-016)', status: 'prototipo', note: 'Estrutura de fila suporta; UI de roteamento não implementada' },
      { name: 'Notificações WhatsApp/SMS/e-mail de lembrete', status: 'nao_iniciado', note: 'Modo demonstração disponível; não há envio real sem canais configurados' },
      { name: 'Depósito de garantia de agendamento (F2)', status: 'nao_iniciado', note: 'Fora do escopo desta fase' },
      { name: 'Sincronização Google/Microsoft Calendar (F2)', status: 'nao_iniciado', note: 'Fora do escopo desta fase' },
    ],
    dependencies: ['Módulo 1', 'Módulo 2'],
  },
  {
    name: 'Módulo 4 — Prontuário Eletrônico (PEP)',
    description: 'Registro longitudinal de atendimentos com SOAP, sinais vitais, diagnósticos CID-10, assinatura e imutabilidade.',
    status: 'parcial',
    features: [
      { name: 'Prontuário longitudinal por paciente/org (RF-PEP-001/002)', status: 'funcional' },
      { name: 'Evolução SOAP com status: Rascunho → Aguardando → Assinado (RF-PEP-003/004)', status: 'funcional' },
      { name: 'Sinais vitais com IMC automático (RF-PEP-005)', status: 'funcional' },
      { name: 'Diagnósticos CID-10 v10/v11 com autocomplete (RF-PEP-006)', status: 'funcional' },
      { name: 'Alergias, medicamentos e antecedentes (RF-PEP-007/008)', status: 'funcional' },
      { name: 'Adaptador de assinatura (DEMO simulado + aviso jurídico) (RF-PEP-009)', status: 'funcional', note: 'Configure provedor ICP-Brasil para validade legal' },
      { name: 'Imutabilidade: entrada assinada não editável; adendo com autor/motivo (RF-PEP-010/011)', status: 'funcional' },
      { name: 'Modelos de prontuário por especialidade (RF-PEP-012)', status: 'funcional' },
      { name: 'Restrição de acesso por CareRelationship (RF-PEP-013)', status: 'funcional', note: 'Estrutura e aplicação no serviço; UI de gestão não implementada' },
      { name: 'Anexos de arquivos (PDF/imagem/DICOM) com controle de acesso (RF-PEP-015)', status: 'funcional' },
      { name: 'Exportação com log de auditoria (RF-PEP-016)', status: 'funcional' },
      { name: 'Vinculação com agendamento (RF-PEP-017)', status: 'funcional' },
      { name: 'Auditoria completa: LEITURA/INCLUSAO/EDICAO/IMPRESSAO/EXPORTACAO/ASSINATURA/ADENDO (RF-PEP-019)', status: 'funcional' },
      { name: 'Rastreamento de cópia de evolução anterior (RF-PEP-022)', status: 'funcional' },
      { name: 'Gráficos de evolução de sinais vitais (F2)', status: 'nao_iniciado', note: 'Fora do escopo desta fase' },
      { name: 'Alertas clínicos automatizados (F2)', status: 'nao_iniciado', note: 'Fora do escopo desta fase' },
      { name: 'Plano terapêutico avançado (F2)', status: 'nao_iniciado', note: 'Fora do escopo desta fase' },
    ],
    dependencies: ['Módulo 3'],
  },
  {
    name: 'Módulo 5 — Faturamento',
    description: 'Faturamento de convênios e particular, emissão de NFSe.',
    status: 'nao_iniciado',
    features: [
      { name: 'Geração de cobranças por atendimento', status: 'nao_iniciado' },
      { name: 'Integração com convênios (TISS)', status: 'nao_iniciado' },
      { name: 'Emissão de NFSe', status: 'nao_iniciado' },
      { name: 'Conciliação financeira', status: 'nao_iniciado' },
    ],
    dependencies: ['Módulo 4'],
  },
  {
    name: 'Infraestrutura',
    description: 'Fundação técnica compartilhada por todos os módulos.',
    status: 'parcial',
    features: [
      { name: 'Monorepo NestJS + Next.js com workspaces', status: 'funcional' },
      { name: 'Prisma 5 com PostgreSQL 18', status: 'funcional' },
      { name: 'Migrações versionadas', status: 'funcional' },
      { name: 'Seed com dados sintéticos (2 orgs para teste de isolamento)', status: 'funcional' },
      { name: 'Auditoria de ações (audit_events)', status: 'funcional' },
      { name: 'Outbox pattern para eventos assíncronos', status: 'funcional' },
      { name: 'JWT HS256 local (dev) / RS256 JWKS (prod)', status: 'funcional' },
      { name: 'RLS por tenant (políticas SQL)', status: 'prototipo', note: 'Script pronto; pendente integração com withTenant()' },
      { name: 'Keycloak em Docker', status: 'nao_iniciado', note: 'Sem Docker configurado; dev usa bypass local' },
      { name: 'Mailpit para e-mails de desenvolvimento', status: 'nao_iniciado' },
      { name: 'CI/CD pipeline', status: 'nao_iniciado' },
    ],
  },
];

function StatusBadge({ status }: { status: ModuleStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function overallStatus(features: Feature[]): ModuleStatus {
  const counts = features.reduce((acc, f) => { acc[f.status] = (acc[f.status] ?? 0) + 1; return acc; }, {} as Record<ModuleStatus, number>);
  if (counts.nao_iniciado === features.length) return 'nao_iniciado';
  if (counts.funcional === features.length) return 'funcional';
  if ((counts.funcional ?? 0) === 0 && (counts.prototipo ?? 0) > 0) return 'prototipo';
  return 'parcial';
}

export default function StatusPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1>Status do Produto</h1>
        <p className="text-slate-500 mt-1">
          Inventário de todos os módulos planejados — o que funciona de verdade, o que é protótipo e o que ainda não foi iniciado.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}>
                <Icon size={12} />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {MODULES.map((mod) => {
          const computed = overallStatus(mod.features);
          return (
            <div key={mod.name} className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{mod.name}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{mod.description}</p>
                  {mod.dependencies && mod.dependencies.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Depende de: {mod.dependencies.join(', ')}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={computed} />
                </div>
              </div>

              <div className="divide-y divide-surface-border">
                {mod.features.map((feature) => {
                  const meta = STATUS_META[feature.status];
                  const Icon = meta.icon;
                  return (
                    <div key={feature.name} className="flex items-start justify-between py-2.5 gap-4">
                      <div className="flex items-start gap-2">
                        <Icon size={14} className={`mt-0.5 shrink-0 ${meta.color}`} />
                        <div>
                          <span className="text-sm text-slate-700">{feature.name}</span>
                          {feature.note && (
                            <p className="text-xs text-slate-400 mt-0.5">{feature.note}</p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Restrições de segurança ativas:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside text-amber-700">
          <li>Tenant ID derivado exclusivamente do JWT — nunca aceito do browser</li>
          <li>Tokens de autenticação não são registrados em logs</li>
          <li>Apenas dados sintéticos em ambientes locais e de teste</li>
          <li>Bypass de auth disponível somente em NODE_ENV=development</li>
          <li>Nenhuma operação destrutiva ou deploy em produção nesta sessão</li>
        </ul>
      </div>
    </div>
  );
}
