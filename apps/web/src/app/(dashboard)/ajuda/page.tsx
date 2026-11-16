'use client';

import { useState } from 'react';
import {
  Search,
  ChevronRight,
  Bot,
  Smartphone,
  Users,
  Megaphone,
  Calendar,
  BarChart3,
  CreditCard,
  Shield,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Zap,
  GraduationCap,
} from 'lucide-react';

interface HelpCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  title: string;
  slug: string;
  tags?: string[];
}

const CATEGORIES: HelpCategory[] = [
  {
    id: 'start',
    label: 'Começando',
    icon: Zap,
    color: 'text-primary',
    bg: 'bg-primary/10',
    articles: [
      { title: 'Como criar sua conta', slug: 'criar-conta' },
      { title: 'Visão geral do Walletz Agent Studio', slug: 'visao-geral' },
      { title: 'Configurando sua empresa', slug: 'configurar-empresa' },
      { title: 'Guia dos primeiros 10 minutos', slug: 'primeiros-10-minutos', tags: ['popular'] },
      { title: 'Convidando usuários para seu workspace', slug: 'convidar-usuarios' },
    ],
  },
  {
    id: 'agents',
    label: 'Agentes de IA',
    icon: Bot,
    color: 'text-neural-blue',
    bg: 'bg-neural-blue/10',
    articles: [
      { title: 'O que é um agente de IA?', slug: 'o-que-e-agente' },
      { title: 'Criando seu primeiro agente', slug: 'criar-agente', tags: ['popular'] },
      { title: 'Definindo a função do agente', slug: 'funcao-agente' },
      { title: 'Configurando personalidade e comportamento', slug: 'personalidade' },
      { title: 'Permissões e limites do agente', slug: 'permissoes' },
      { title: 'Publicando seu agente', slug: 'publicar' },
    ],
  },
  {
    id: 'teach',
    label: 'Ensinar IA',
    icon: GraduationCap,
    color: 'text-neural-cyan',
    bg: 'bg-neural-cyan/10',
    articles: [
      { title: 'Como ensinar sua IA', slug: 'como-ensinar' },
      { title: 'Tipos de conteúdo aceitos', slug: 'tipos-conteudo' },
      { title: 'Adicionando PDFs e documentos', slug: 'pdfs' },
      { title: 'Regras de comportamento', slug: 'regras-comportamento' },
      { title: 'Base de conhecimento avançada', slug: 'base-conhecimento' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: Smartphone,
    color: 'text-[#25D366]',
    bg: 'bg-[#25D366]/10',
    articles: [
      { title: 'Conectando seu número WhatsApp', slug: 'conectar-whatsapp', tags: ['popular'] },
      { title: 'O que é a Meta Business?', slug: 'meta-business' },
      { title: 'Aprovação de número na Meta', slug: 'aprovacao-meta' },
      { title: 'Criando templates de mensagem', slug: 'templates' },
      { title: 'Por que meu template foi rejeitado?', slug: 'template-rejeitado' },
      { title: 'Opt-out e consentimento', slug: 'opt-out' },
    ],
  },
  {
    id: 'contacts',
    label: 'Contatos',
    icon: Users,
    color: 'text-neural-warning',
    bg: 'bg-neural-warning/10',
    articles: [
      { title: 'Importando contatos via CSV', slug: 'importar-csv' },
      { title: 'Campos obrigatórios no arquivo', slug: 'campos-csv' },
      { title: 'Segmentando sua base', slug: 'segmentacao' },
      { title: 'Consentimento e LGPD', slug: 'lgpd' },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    icon: Megaphone,
    color: 'text-primary',
    bg: 'bg-primary/10',
    articles: [
      { title: 'Criando sua primeira campanha', slug: 'criar-campanha' },
      { title: 'Segmentação de público', slug: 'segmentacao-campanha' },
      { title: 'Escolhendo o template', slug: 'template-campanha' },
      { title: 'Analisando resultados', slug: 'resultados-campanha' },
    ],
  },
  {
    id: 'calendar',
    label: 'Agendas',
    icon: Calendar,
    color: 'text-neural-blue',
    bg: 'bg-neural-blue/10',
    articles: [
      { title: 'Conectando Google Calendar', slug: 'google-calendar' },
      { title: 'Conectando Microsoft Teams', slug: 'microsoft-teams' },
      { title: 'Como a IA agenda reuniões', slug: 'agendamento-ia', tags: ['popular'] },
      { title: 'Reagendamento e cancelamento', slug: 'reagendar' },
    ],
  },
  {
    id: 'results',
    label: 'Resultados',
    icon: BarChart3,
    color: 'text-neural-cyan',
    bg: 'bg-neural-cyan/10',
    articles: [
      { title: 'Entendendo o painel de resultados', slug: 'painel' },
      { title: 'Métricas de atendimento', slug: 'metricas' },
      { title: 'Exportando relatórios', slug: 'exportar' },
    ],
  },
  {
    id: 'billing',
    label: 'Assinatura',
    icon: CreditCard,
    color: 'text-neural-success',
    bg: 'bg-neural-success/10',
    articles: [
      { title: 'Planos disponíveis', slug: 'planos' },
      { title: 'Como funciona o trial gratuito', slug: 'trial' },
      { title: 'Alterando seu plano', slug: 'alterar-plano' },
      { title: 'Gerenciando pagamento', slug: 'pagamento' },
      { title: 'Cancelando a assinatura', slug: 'cancelar' },
    ],
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    color: 'text-neural-danger',
    bg: 'bg-neural-danger/10',
    articles: [
      { title: 'Autenticação de dois fatores (2FA)', slug: '2fa' },
      { title: 'Permissões de usuários', slug: 'permissoes-usuarios' },
      { title: 'Como reportar um incidente', slug: 'incidente' },
    ],
  },
];

const FAQ = [
  {
    q: 'Preciso saber programar para usar o Walletz?',
    a: 'Não. O Walletz foi desenvolvido para empresas sem equipe técnica. Você configura tudo por formulários e menus visuais.',
  },
  {
    q: 'Como minha IA aprende sobre minha empresa?',
    a: 'Você faz upload de documentos, textos, PDFs, planilhas e URLs. Sua IA lê, aprende e responde com base nesse conteúdo.',
  },
  {
    q: 'O WhatsApp é oficial?',
    a: 'Sim. O Walletz usa somente a API Oficial do WhatsApp Business (Meta). Não usamos QR Code, scraping ou aplicativos não autorizados.',
  },
  {
    q: 'Posso importar minha lista de contatos?',
    a: 'Sim, em CSV ou XLSX. O Walletz valida os números, remove duplicatas e organiza automaticamente.',
  },
  {
    q: 'Como a IA agenda reuniões?',
    a: 'Ao conectar Google Calendar ou Microsoft Teams, sua IA consulta a disponibilidade real e cria eventos diretamente nas agendas.',
  },
  {
    q: 'Posso assumir uma conversa da IA?',
    a: 'Sim. No Inbox você pode entrar em qualquer conversa em andamento, assumir o atendimento e devolver para a IA quando quiser.',
  },
  {
    q: 'Quanto custa o WhatsApp?',
    a: 'As mensagens de WhatsApp são cobradas diretamente pela Meta conforme seu uso. O Walletz não cobra por mensagens — só pela assinatura do plano.',
  },
  {
    q: 'Posso usar minha própria chave de IA?',
    a: 'Sim, no plano Business você pode usar sua própria chave BYOK (Anthropic, OpenAI, Gemini).',
  },
  {
    q: 'O que acontece se eu atingir o limite do meu plano?',
    a: 'O sistema avisa quando você está próximo do limite. Você pode fazer upgrade a qualquer momento. Nunca bloqueamos sem aviso.',
  },
  {
    q: 'Meus dados são seguros?',
    a: 'Sim. Os dados de cada empresa ficam completamente isolados. Usamos criptografia AES-256 e seguimos as diretrizes da LGPD.',
  },
];

export default function AjudaPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) => !search || a.title.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => !search || cat.articles.length > 0);

  const activeCat = activeCategory ? CATEGORIES.find((c) => c.id === activeCategory) : null;

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-display font-bold text-foreground">Como podemos ajudar?</h1>
        <p className="text-muted-foreground">
          Encontre respostas, guias e tutoriais para usar o Walletz Agent Studio.
        </p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Buscar na Central de Ajuda…"
            className="w-full rounded-xl border border-border bg-surface-1 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
          />
        </div>
      </div>

      {/* Category view or search results */}
      {!activeCat ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="neural-card p-4 flex flex-col items-center gap-2 text-center hover:border-primary/30 transition-all group"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {cat.articles.length} artigos
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search results */}
          {search && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Resultados para <strong className="text-foreground">"{search}"</strong>
              </p>
              {filtered.flatMap((cat) =>
                cat.articles.map((a) => (
                  <div key={a.slug} className="neural-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{cat.label}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )),
              )}
              {filtered.every((c) => c.articles.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado. Tente termos diferentes ou entre em contato.
                </p>
              )}
            </div>
          )}

          {/* Popular articles */}
          {!search && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Artigos populares</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CATEGORIES.flatMap((c) =>
                  c.articles
                    .filter((a) => a.tags?.includes('popular'))
                    .map((a) => ({ ...a, catLabel: c.label, icon: c.icon, color: c.color })),
                ).map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.slug}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-border/60 transition-all cursor-pointer group"
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${a.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.catLabel}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Category detail */
        <div className="space-y-4">
          <button
            onClick={() => setActiveCategory(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Voltar às categorias
          </button>
          {(() => {
            const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
            const Icon = cat.icon;
            return (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">{cat.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {cat.articles.length} artigos disponíveis
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {cat.articles.map((a) => (
                    <div
                      key={a.slug}
                      className="neural-card p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {a.title}
                        </p>
                        {a.tags?.includes('popular') && (
                          <span className="badge-primary text-[10px] px-1.5 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* FAQ */}
      {!search && !activeCat && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Perguntas frequentes</h2>
          {FAQ.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      )}

      {/* Contact */}
      <div className="neural-card p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Não encontrou o que precisa?</p>
            <p className="text-xs text-muted-foreground">
              Nossa equipe está disponível para ajudar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="mailto:suporte@walletz.com"
            className="btn-ghost rounded-lg px-4 py-2 text-sm border border-border flex items-center gap-1.5"
          >
            E-mail <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-1.5">
            Chat ao vivo <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="neural-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-foreground pr-4">{question}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3">
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
