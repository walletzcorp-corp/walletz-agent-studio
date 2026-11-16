import Link from 'next/link';
import type { Metadata } from 'next';
import { DocTitle, P } from './_components';

export const metadata: Metadata = { title: 'Guias de integração' };

const GUIDES = [
  {
    href: '/docs/webchat',
    title: 'Webchat no site',
    text: 'Coloque o balão de atendimento do seu agente em qualquer site: HTML, WordPress, Wix, Shopify, Google Tag Manager ou React.',
    plan: 'Todos os planos',
  },
  {
    href: '/docs/whatsapp',
    title: 'WhatsApp oficial (Meta)',
    text: 'Conecte o número da sua empresa pela API oficial do WhatsApp usando o app Meta da sua empresa.',
    plan: 'Pro, Business e Agency',
  },
  {
    href: '/docs/webhooks',
    title: 'Webhooks de saída',
    text: 'Receba no seu sistema os eventos das conversas e reuniões, com assinatura para validar a origem.',
    plan: 'Pro, Business e Agency',
  },
];

export default function DocsHome() {
  return (
    <>
      <DocTitle
        title="Guias de integração"
        intro="Passo a passo para publicar e conectar seus agentes do Walletz Studio IA. Pode encaminhar estes links para quem cuida do seu site ou sistema."
      />
      <div className="grid gap-3">
        {GUIDES.map((g) => (
          <Link key={g.href} href={g.href} className="neural-card block p-5 transition-colors hover:border-primary/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-foreground">{g.title}</p>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{g.plan}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{g.text}</p>
          </Link>
        ))}
      </div>
      <P>
        Antes de qualquer canal, conecte a chave de IA da sua conta em <strong>Config. IA</strong> no painel. Nenhum plano inclui tokens: o
        consumo de IA é pago diretamente ao provedor que você escolher.
      </P>
    </>
  );
}
