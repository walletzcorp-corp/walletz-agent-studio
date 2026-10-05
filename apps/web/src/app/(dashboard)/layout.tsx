// Sprint 1: Dashboard layout with sidebar navigation
// Navigation: Início, Meus Agentes, Ensinar IA, Laboratório,
//             Conversas, Contatos, Campanhas, Agendas, Resultados, Configurações

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="font-bold text-lg text-gray-900">Walletz</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {/* Sprint 1: NavigationMenu component */}
          <p className="text-sm text-gray-500 px-3">Menu — Sprint 1</p>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
