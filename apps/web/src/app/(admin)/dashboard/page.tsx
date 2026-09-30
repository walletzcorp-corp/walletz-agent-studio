import { Building2, MapPin, Users, UserCheck, Stethoscope, Package } from 'lucide-react';

export default async function DashboardPage() {
  const cards = [
    { label: 'Organizações',    icon: Building2,   color: 'text-brand-emerald', href: '/organizations' },
    { label: 'Unidades',        icon: MapPin,       color: 'text-blue-500',      href: '/units' },
    { label: 'Usuários',        icon: Users,        color: 'text-purple-500',    href: '/users' },
    { label: 'Profissionais',   icon: UserCheck,    color: 'text-orange-500',    href: '/professionals' },
    { label: 'Salas/Recursos',  icon: Package,      color: 'text-teal-500',      href: '/resources' },
    { label: 'Serviços',        icon: Stethoscope,  color: 'text-pink-500',      href: '/services' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1>Painel Administrativo</h1>
        <p className="text-slate-500 mt-1">Walletz Med — Sistema Operacional para Clínicas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, icon: Icon, color, href }) => (
          <a key={href} href={href} className="card hover:shadow-md transition-shadow group">
            <Icon size={28} className={`${color} mb-3`} />
            <p className="font-medium text-slate-900 group-hover:text-brand-emerald transition-colors">{label}</p>
            <p className="text-xs text-slate-400 mt-1">Gerenciar →</p>
          </a>
        ))}
      </div>

      <div className="card">
        <h3 className="mb-3">Ambiente de Desenvolvimento</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• API: <a href="http://localhost:3011/api/docs" target="_blank" className="text-brand-emerald hover:underline">http://localhost:3011/api/docs</a></li>
          <li>• Keycloak: <a href="http://localhost:8090" target="_blank" className="text-brand-emerald hover:underline">http://localhost:8090</a> — admin / admin_dev_password</li>
          <li>• Mailpit: <a href="http://localhost:8025" target="_blank" className="text-brand-emerald hover:underline">http://localhost:8025</a></li>
          <li>• PostgreSQL: localhost:5433 — walletz_med</li>
        </ul>
      </div>
    </div>
  );
}
