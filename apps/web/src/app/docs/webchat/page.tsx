import type { Metadata } from 'next';
import { Code, DocTitle, H2, H3, List, Note, P, Pre, Steps, Table, Toc, widgetScriptExample } from '../_components';

export const metadata: Metadata = { title: 'Webchat no site' };

export default function WebchatGuide() {
  const src = widgetScriptExample();
  const snippet = `<script src="${src}" data-key="wc_SUA_CHAVE" async></script>`;

  return (
    <>
      <DocTitle
        title="Webchat no site"
        intro="Coloque o balão de atendimento do seu agente de IA no seu site. As conversas chegam no painel, em Conversas, junto com as do WhatsApp."
      />

      <Toc
        items={[
          ['antes', '1. Antes de começar'],
          ['criar', '2. Criar o widget no painel'],
          ['instalar', '3. Instalar no site'],
          ['testar', '4. Testar'],
          ['problemas', '5. Problemas comuns'],
          ['seguranca', '6. Segurança e privacidade'],
        ]}
      />

      <H2 id="antes">1. Antes de começar</H2>
      <List>
        <li><strong>Chave de IA conectada</strong> em <em>Config. IA</em> (Claude, OpenAI, Gemini ou OpenRouter). Sem ela o balão aparece, mas o agente não responde.</li>
        <li><strong>Agente publicado</strong>: crie, ensine e teste no Laboratório; depois clique em Publicar.</li>
        <li><strong>Endereço do site</strong>, por exemplo <Code>https://www.suaempresa.com.br</Code>.</li>
        <li>Disponível em todos os planos (Starter: 1 widget · Pro: 3 · Business: 8 · Agency: 10).</li>
      </List>

      <H2 id="criar">2. Criar o widget no painel</H2>
      <Steps>
        <li>Entre no painel e abra <strong>Canais → Webchat</strong>.</li>
        <li>Clique em <strong>Novo widget</strong> e escolha o <strong>agente</strong> que vai responder.</li>
        <li>Defina título da janela, cor e mensagem de boas-vindas.</li>
        <li>
          Em <strong>Sites autorizados</strong>, informe um endereço por linha, com <Code>https://</Code>. Se o site abre com e sem
          “www”, cadastre os dois: <Code>https://suaempresa.com.br</Code> e <Code>https://www.suaempresa.com.br</Code>.
        </li>
        <li>Clique em <strong>Criar widget</strong> e copie o <strong>código para colar no site</strong>.</li>
      </Steps>
      <P>O código tem este formato (a sua chave <Code>wc_…</Code> aparece no painel):</P>
      <Pre title="Código de incorporação">{snippet}</Pre>
      <Note>
        A <Code>data-key</Code> identifica o widget e <strong>não é senha</strong>: ela fica visível no código do site. Quem protege o uso é a
        lista de sites autorizados.
      </Note>

      <H2 id="instalar">3. Instalar no site</H2>
      <P>Cole o código uma única vez, de preferência logo antes de <Code>{'</body>'}</Code>, em todas as páginas onde o balão deve aparecer.</P>

      <H3>HTML (qualquer site)</H3>
      <Pre title="index.html">{`<!doctype html>
<html lang="pt-BR">
  <body>
    <!-- conteúdo do site -->

    ${snippet}
  </body>
</html>`}</Pre>

      <H3>WordPress</H3>
      <Steps>
        <li>Instale um plugin de inserção de código, como <strong>WPCode</strong> (Insert Headers and Footers).</li>
        <li>Em <em>Code Snippets → Header &amp; Footer</em>, cole o código no campo <strong>Footer</strong> e salve.</li>
        <li>Se usa plugin de cache (WP Rocket, LiteSpeed etc.), limpe o cache.</li>
      </Steps>

      <H3>Wix</H3>
      <Steps>
        <li>No painel do site: <em>Configurações → Código personalizado → Adicionar código</em>.</li>
        <li>Cole o código, escolha <strong>Todas as páginas</strong> e posição <strong>Corpo – fim</strong>.</li>
        <li>Publique o site.</li>
      </Steps>

      <H3>Shopify</H3>
      <Steps>
        <li><em>Loja virtual → Temas → … → Editar código</em>.</li>
        <li>Abra <Code>layout/theme.liquid</Code> e cole o código logo antes de <Code>{'</body>'}</Code>.</li>
        <li>Salve. Cadastre o domínio da loja (e o <Code>.myshopify.com</Code>, se usar) em Sites autorizados.</li>
      </Steps>

      <H3>Google Tag Manager</H3>
      <Steps>
        <li>Crie uma tag do tipo <strong>HTML personalizado</strong> e cole o código.</li>
        <li>Acionador: <strong>All Pages</strong> (ou só as páginas desejadas). Publique o contêiner.</li>
      </Steps>

      <H3>React / Next.js</H3>
      <Pre title="Next.js (App Router) — app/layout.tsx">{`import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Script src="${src}" data-key="wc_SUA_CHAVE" strategy="afterInteractive" />
      </body>
    </html>
  );
}`}</Pre>
      <Pre title="React (Vite, CRA) — componente">{`import { useEffect } from 'react';

export function WalletzWebchat() {
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${src}';
    s.async = true;
    s.dataset.key = 'wc_SUA_CHAVE';
    document.body.appendChild(s);
  }, []);
  return null;
}`}</Pre>

      <H2 id="testar">4. Testar</H2>
      <Steps>
        <li>Abra o site em uma aba anônima e clique no balão no canto inferior direito.</li>
        <li>Envie uma pergunta que o agente sabe responder (algo da base de conhecimento).</li>
        <li>No painel, abra <strong>Conversas</strong>: a conversa aparece com o canal “webchat”.</li>
        <li>Para testar o atendimento humano, assuma a conversa e responda: a mensagem aparece no balão em até 5 segundos.</li>
      </Steps>

      <H2 id="problemas">5. Problemas comuns</H2>
      <Table
        head={['Sintoma', 'Causa provável', 'Como resolver']}
        rows={[
          ['O balão não aparece', 'O endereço do site não está em Sites autorizados (ou falta a versão com/sem “www”).', 'Cadastre exatamente o endereço que aparece no navegador, com https://.'],
          ['O balão não aparece', 'Widget desativado ou removido.', 'Em Canais → Webchat, confira se o widget está Ativo.'],
          ['O balão não aparece', 'O site bloqueia scripts externos (Content-Security-Policy).', <>Libere o domínio da API em <Code>script-src</Code> e <Code>connect-src</Code>.</>],
          ['Responde “um atendente vai responder…”', 'Sem chave de IA, sem crédito no provedor ou agente não publicado.', 'Confira Config. IA (status da conexão) e publique o agente.'],
          ['“Limite de mensagens desta conversa atingido”', 'Proteção contra abuso: 100 mensagens por conversa.', 'O visitante pode recarregar a página para iniciar outra conversa.'],
          ['Mudanças no código não aparecem', 'Cache do site ou da CDN.', 'Limpe o cache do plugin/CDN e recarregue.'],
        ]}
      />

      <H2 id="seguranca">6. Segurança e privacidade</H2>
      <List>
        <li>Só os sites autorizados conseguem usar o widget; cada visitante tem uma sessão própria e não vê conversas de outros.</li>
        <li>O balão roda isolado (não altera o visual do seu site nem lê dados da página).</li>
        <li>As respostas usam a chave de IA da sua conta; há limite de mensagens por IP e por conversa para proteger seu consumo.</li>
        <li>As mensagens ficam no seu painel. Informe na política de privacidade do site que o atendimento usa IA (LGPD).</li>
      </List>
    </>
  );
}
