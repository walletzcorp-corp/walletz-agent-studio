import {
  Building2, MapPin, Users, UserCheck, Stethoscope, Package,
  CalendarDays, UserCircle2, Ticket, FileText, Boxes, DollarSign,
  HeartHandshake, FlaskConical, Workflow, PackageOpen, ArrowRight,
} from 'lucide-react';

const primaryCards = [
  { label: 'Organizações',  icon: Building2,    bg: '#eef0ff', fg: '#152DFF', href: '/organizations' },
  { label: 'Unidades',      icon: MapPin,       bg: '#e6f8f7', fg: '#009d8f', href: '/units' },
  { label: 'Profissionais', icon: UserCheck,    bg: '#fff0eb', fg: '#e56035', href: '/professionals' },
  { label: 'Pacientes',     icon: UserCircle2,  bg: '#eef0ff', fg: '#152DFF', href: '/patients' },
  { label: 'Agenda',        icon: CalendarDays, bg: '#e6f8f7', fg: '#009d8f', href: '/schedule' },
  { label: 'Prontuários',   icon: FileText,     bg: '#fff0eb', fg: '#e56035', href: '/records' },
  { label: 'Fila',          icon: Ticket,       bg: '#eef0ff', fg: '#152DFF', href: '/queue' },
  { label: 'Serviços',      icon: Stethoscope,  bg: '#e6f8f7', fg: '#009d8f', href: '/services' },
  { label: 'Estoque',       icon: Boxes,        bg: '#fff0eb', fg: '#e56035', href: '/estoque' },
  { label: 'Financeiro',    icon: DollarSign,   bg: '#eef0ff', fg: '#152DFF', href: '/financeiro' },
  { label: 'Usuários',      icon: Users,        bg: '#e6f8f7', fg: '#009d8f', href: '/users' },
  { label: 'Salas',         icon: Package,      bg: '#fff0eb', fg: '#e56035', href: '/resources' },
];

const newModuleCards = [
  { label: 'Engajamento',   icon: HeartHandshake, href: '/engajamento',  bg: '#eef0ff', fg: '#152DFF' },
  { label: 'Diagnóstico',   icon: FlaskConical,   href: '/diagnostico',  bg: '#e6f8f7', fg: '#009d8f' },
  { label: 'Studio',        icon: Workflow,        href: '/studio',       bg: '#fff0eb', fg: '#e56035' },
  { label: 'Migração',      icon: PackageOpen,    href: '/migracao',     bg: '#eef0ff', fg: '#152DFF' },
];

function IconBox({ icon: Icon, bg, fg }: { icon: any; bg: string; fg: string }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: bg }}
    >
      <Icon size={20} style={{ color: fg }} strokeWidth={2} />
    </div>
  );
}

export default async function DashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Painel Administrativo
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Walletz Med — People. Resources. Information. Care in Flow.
        </p>
      </div>

      {/* Primary modules grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {primaryCards.map(({ label, icon: Icon, bg, fg, href }) => (
          <a
            key={href}
            href={href}
            className="bg-white rounded-2xl border border-surface-border p-4 flex items-center gap-3
                       hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <IconBox icon={Icon} bg={bg} fg={fg} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 truncate">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                Abrir <ArrowRight size={10} />
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* M18–M21 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Módulos Avançados</h2>
          <div className="flex-1 border-t border-surface-border" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {newModuleCards.map(({ label, icon: Icon, href, bg, fg }) => (
            <a
              key={href}
              href={href}
              className="bg-white rounded-2xl border border-surface-border p-4 flex items-center gap-3
                         hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <IconBox icon={Icon} bg={bg} fg={fg} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  Abrir <ArrowRight size={10} />
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Dev info card */}
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Ambiente de Desenvolvimento</h3>
        <ul className="text-sm text-slate-500 space-y-1.5">
          <li>• API Swagger:{' '}
            <a href="http://localhost:3011/api/docs" target="_blank" rel="noreferrer"
              className="font-medium hover:underline" style={{ color: '#152DFF' }}>
              localhost:3011/api/docs
            </a>
          </li>
          <li>• Keycloak:{' '}
            <a href="http://localhost:8090" target="_blank" rel="noreferrer"
              className="font-medium hover:underline" style={{ color: '#152DFF' }}>
              localhost:8090
            </a>
            {' '}— admin / admin_dev_password
          </li>
          <li>• Mailpit:{' '}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer"
              className="font-medium hover:underline" style={{ color: '#152DFF' }}>
              localhost:8025
            </a>
          </li>
          <li>• PostgreSQL: localhost:5433 — walletz_med</li>
        </ul>
      </div>
    </div>
  );
}
