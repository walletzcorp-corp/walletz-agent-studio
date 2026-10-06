'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Users, ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle, Pause } from 'lucide-react';

type ClientStatus = 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';

interface Client {
  id: string; company: string; owner: string; email: string; phone: string;
  plan: string; status: ClientStatus; createdAt: string; trialUntil?: string;
  lastAccess: string; users: number; agents: number; whatsapp: boolean; mrr: string;
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; className: string; icon: React.ElementType }> = {
  active:    { label: 'Ativo',        className: 'badge-success', icon: CheckCircle2 },
  trial:     { label: 'Trial',        className: 'badge-warning', icon: Clock },
  past_due:  { label: 'Inadimplente', className: 'badge-danger',  icon: AlertTriangle },
  suspended: { label: 'Suspenso',     className: 'bg-surface-3 text-muted-foreground border border-border', icon: Pause },
  cancelled: { label: 'Cancelado',    className: 'bg-surface-3 text-muted-foreground/60 border border-border', icon: XCircle },
};

const MOCK_CLIENTS: Client[] = [
  { id: '1', company: 'Tech Solutions Ltda.',   owner: 'Ricardo Alves',     email: 'admin@techsol.com',    phone: '+55 11 99001-1234', plan: 'Professional', status: 'active',    createdAt: '01/09/2026', lastAccess: '06/10/2026', users: 4, agents: 3, whatsapp: true,  mrr: 'R$ 497' },
  { id: '2', company: 'Saúde Digital S.A.',     owner: 'Mariana Costa',     email: 'ti@saudedigital.com',  phone: '+55 21 98002-5678', plan: 'Business',      status: 'trial',     createdAt: '03/10/2026', trialUntil: '17/10/2026', lastAccess: '05/10/2026', users: 2, agents: 1, whatsapp: false, mrr: '—' },
  { id: '3', company: 'Consultoria XYZ',        owner: 'Paulo Ferreira',    email: 'info@xyz.com',         phone: '+55 11 97003-9012', plan: 'Starter',       status: 'trial',     createdAt: '02/10/2026', trialUntil: '16/10/2026', lastAccess: '04/10/2026', users: 1, agents: 1, whatsapp: false, mrr: '—' },
  { id: '4', company: 'Varejo Premium EIRELI',  owner: 'Fernanda Lima',     email: 'ti@varejoprem.com',    phone: '+55 11 96004-3456', plan: 'Professional', status: 'active',    createdAt: '01/08/2026', lastAccess: '06/10/2026', users: 5, agents: 4, whatsapp: true,  mrr: 'R$ 497' },
  { id: '5', company: 'Logística Rápida',       owner: 'Sandro Mendes',     email: 'op@lograpida.com',     phone: '+55 31 95005-7890', plan: 'Business',      status: 'active',    createdAt: '01/07/2026', lastAccess: '05/10/2026', users: 8, agents: 6, whatsapp: true,  mrr: 'R$ 1.197' },
  { id: '6', company: 'Imóveis & Cia',          owner: 'Carla Rocha',       email: 'admin@imoveiscia.com', phone: '+55 51 94006-2345', plan: 'Starter',       status: 'past_due',  createdAt: '01/08/2026', lastAccess: '28/09/2026', users: 1, agents: 1, whatsapp: false, mrr: 'R$ 197' },
  { id: '7', company: 'EduTech Cursos',         owner: 'Bruno Nascimento',  email: 'ti@edutech.com',       phone: '+55 11 93007-6789', plan: 'Professional', status: 'active',    createdAt: '01/06/2026', lastAccess: '06/10/2026', users: 3, agents: 2, whatsapp: true,  mrr: 'R$ 497' },
  { id: '8', company: 'Fintech Pagamentos',     owner: 'Ana Barbosa',       email: 'dev@fintechpag.com',   phone: '+55 11 92008-0123', plan: 'Business',      status: 'active',    createdAt: '01/05/2026', lastAccess: '05/10/2026', users: 10, agents: 7, whatsapp: true, mrr: 'R$ 1.197' },
];

const FILTERS: { id: ClientStatus | 'all'; label: string }[] = [
  { id: 'all',       label: 'Todos' },
  { id: 'trial',     label: 'Trial' },
  { id: 'active',    label: 'Ativos' },
  { id: 'past_due',  label: 'Inadimplentes' },
  { id: 'suspended', label: 'Suspensos' },
  { id: 'cancelled', label: 'Cancelados' },
];

export default function AdminClientesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientStatus | 'all'>('all');

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{MOCK_CLIENTS.length} empresas cadastradas · {MOCK_CLIENTS.filter(c => c.status === 'active').length} ativas</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {f.id === 'all' ? MOCK_CLIENTS.length : MOCK_CLIENTS.filter(c => c.status === f.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por empresa, e-mail ou responsável…"
          className="w-full rounded-lg border border-border bg-surface-1 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="neural-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Responsável</th>
              <th>Plano</th>
              <th>Status</th>
              <th className="hidden lg:table-cell">Último acesso</th>
              <th className="hidden xl:table-cell">Usuários</th>
              <th className="hidden xl:table-cell">Agentes</th>
              <th className="hidden lg:table-cell">WA</th>
              <th>MRR</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</td>
              </tr>
            )}
            {filtered.map(c => {
              const { label, className, icon: Icon } = STATUS_CONFIG[c.status];
              return (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium text-foreground">{c.company}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="text-sm text-muted-foreground">{c.owner}</td>
                  <td>
                    <span className="text-xs font-medium text-foreground">{c.plan}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {label}
                    </span>
                    {c.trialUntil && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">até {c.trialUntil}</p>
                    )}
                  </td>
                  <td className="hidden lg:table-cell text-sm text-muted-foreground">{c.lastAccess}</td>
                  <td className="hidden xl:table-cell text-sm text-center">{c.users}</td>
                  <td className="hidden xl:table-cell text-sm text-center">{c.agents}</td>
                  <td className="hidden lg:table-cell text-center">
                    <span className={`text-[10px] font-medium ${c.whatsapp ? 'text-[#25D366]' : 'text-muted-foreground/40'}`}>
                      {c.whatsapp ? '●' : '○'}
                    </span>
                  </td>
                  <td className="text-sm font-semibold text-foreground">{c.mrr}</td>
                  <td>
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Ver <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'MRR Total',    value: 'R$ 14.910', sub: 'Clientes ativos', color: 'text-neural-success' },
          { label: 'Trials ativos', value: '3',        sub: 'Convertendo',     color: 'text-neural-warning' },
          { label: 'WA conectados', value: '8',        sub: 'Números',         color: 'text-[#25D366]' },
          { label: 'Churn 30d',    value: '0',         sub: 'Cancelamentos',   color: 'text-neural-success' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
