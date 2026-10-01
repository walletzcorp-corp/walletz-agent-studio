'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Building2, MapPin, Users, UserCheck, LayoutDashboard, Stethoscope,
  Package, ClipboardList, LogOut, Map, CalendarDays, UserCircle2,
  Ticket, FileText, Boxes, DollarSign, ShieldCheck, MessageSquare,
  BrainCircuit, Plug, DoorOpen, Pill, Zap, HeartHandshake,
  FlaskConical, Workflow, PackageOpen,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',     label: 'Painel',            icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizações',      icon: Building2 },
  { href: '/units',         label: 'Unidades',          icon: MapPin },
  { href: '/users',         label: 'Usuários',          icon: Users },
  { href: '/professionals', label: 'Profissionais',     icon: UserCheck },
  { href: '/resources',     label: 'Salas / Recursos',  icon: Package },
  { href: '/services',      label: 'Serviços',          icon: Stethoscope },
  { href: '/patients',      label: 'Pacientes',         icon: UserCircle2 },
  { href: '/schedule',      label: 'Agenda',            icon: CalendarDays },
  { href: '/queue',         label: 'Fila',              icon: Ticket },
  { href: '/records',       label: 'Prontuários',       icon: FileText },
  { href: '/estoque',       label: 'Estoque',           icon: Boxes },
  { href: '/financeiro',    label: 'Financeiro',        icon: DollarSign },
  { href: '/convenios',     label: 'Convênios / TIS',   icon: ShieldCheck },
  { href: '/crm',           label: 'CRM',               icon: MessageSquare },
  { href: '/salas',         label: 'Salas',             icon: DoorOpen },
  { href: '/ia',            label: 'IA Clínica',        icon: BrainCircuit },
  { href: '/integracoes',   label: 'Integrações',       icon: Plug },
  { href: '/medicamentos',  label: 'Medicamentos',      icon: Pill },
  { href: '/qualidade',     label: 'Qualidade',         icon: ShieldCheck },
  { href: '/ativos',        label: 'Ativos',            icon: Zap },
  { href: '/equipe',        label: 'Equipe',            icon: Users },
  { href: '/engajamento',   label: 'Engajamento',       icon: HeartHandshake },
  { href: '/diagnostico',   label: 'Diagnóstico',       icon: FlaskConical },
  { href: '/studio',        label: 'Studio No-code',    icon: Workflow },
  { href: '/migracao',      label: 'Migração',          icon: PackageOpen },
  { href: '/audit',         label: 'Auditoria',         icon: ClipboardList },
  { href: '/status',        label: 'Status do Produto', icon: Map },
];

function PrismFlowMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cobalt ring */}
      <ellipse cx="16" cy="11" rx="9" ry="5.5" stroke="#152DFF" strokeWidth="3.5"
        fill="none" strokeLinecap="round"
        transform="rotate(-30 16 11)" />
      {/* Teal ring */}
      <ellipse cx="11" cy="20" rx="9" ry="5.5" stroke="#00B7A8" strokeWidth="3.5"
        fill="none" strokeLinecap="round"
        transform="rotate(90 11 20)" />
      {/* Tangerine ring */}
      <ellipse cx="21" cy="20" rx="9" ry="5.5" stroke="#FF784F" strokeWidth="3.5"
        fill="none" strokeLinecap="round"
        transform="rotate(150 21 20)" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-1">
          <PrismFlowMark />
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">
              <span style={{ color: '#152DFF' }}>Walletz</span>
              <span style={{ color: '#00B7A8' }}>Med</span>
            </div>
            <div className="text-[9px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
              Prism Flow
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`sidebar-link${active ? ' active' : ''}`}>
              <Icon size={15} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => {
            document.cookie = 'walletz_dev_token=; path=/; max-age=0';
            try {
              sessionStorage.removeItem('walletz_dev_token');
              sessionStorage.removeItem('walletz_dev_user');
            } catch {}
            signOut({ callbackUrl: '/login' });
          }}
          className="sidebar-link w-full text-left"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  );
}
