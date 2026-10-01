'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Building2,
  MapPin,
  Users,
  UserCheck,
  LayoutDashboard,
  Stethoscope,
  Package,
  ClipboardList,
  LogOut,
  Map,
  CalendarDays,
  UserCircle2,
  Ticket,
  FileText,
  Boxes,
  DollarSign,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',      label: 'Painel',           icon: LayoutDashboard },
  { href: '/organizations',  label: 'Organizações',     icon: Building2 },
  { href: '/units',          label: 'Unidades',         icon: MapPin },
  { href: '/users',          label: 'Usuários',         icon: Users },
  { href: '/professionals',  label: 'Profissionais',    icon: UserCheck },
  { href: '/resources',      label: 'Salas / Recursos', icon: Package },
  { href: '/services',       label: 'Serviços',         icon: Stethoscope },
  { href: '/patients',       label: 'Pacientes',        icon: UserCircle2 },
  { href: '/schedule',       label: 'Agenda',           icon: CalendarDays },
  { href: '/queue',          label: 'Fila',             icon: Ticket },
  { href: '/records',        label: 'Prontuários',      icon: FileText },
  { href: '/estoque',        label: 'Estoque',          icon: Boxes },
  { href: '/financeiro',     label: 'Financeiro',       icon: DollarSign },
  { href: '/convenios',      label: 'Convênios / TIS',  icon: ShieldCheck },
  { href: '/crm',            label: 'CRM',              icon: MessageSquare },
  { href: '/audit',          label: 'Auditoria',        icon: ClipboardList },
  { href: '/status',         label: 'Status do Produto', icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen sidebar flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-graphite-mid">
        <span className="text-brand-emerald font-bold text-xl">Walletz</span>
        <span className="text-white font-light text-xl"> Med</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-brand-graphite-mid">
        <button
          onClick={() => {
            document.cookie = 'walletz_dev_token=; path=/; max-age=0';
            try { sessionStorage.removeItem('walletz_dev_token'); sessionStorage.removeItem('walletz_dev_user'); } catch {}
            signOut({ callbackUrl: '/login' });
          }}
          className="sidebar-link w-full text-left"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
