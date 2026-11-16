import type { Metadata } from 'next';
import { Code, DocTitle, H2, H3, List, Note, P, Steps, Table, Toc } from '../_components';

export const metadata: Metadata = { title: 'WhatsApp oficial (Meta)' };

const META = 'https://developers.facebook.com/apps';
const SYSTEM_USERS = 'https://business.facebook.com/settings/system-users';
const PRICING = 'https://business.whatsapp.com/products/platform-pricing';

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline">{children}</a>;
}

export default function WhatsappGuide() {
  return (
    <>
      <DocTitle
        title="WhatsApp oficial (Meta)"
        intro="Conecte o número da sua empresa pela API oficial do WhatsApp (Cloud API) usando o app Meta da própria empresa. Seu agente passa a responder por esse número."
      />

      <Toc
        items={[
          ['antes', '1. Antes de começar'],
          ['app', '2. Criar o app na Meta'],
          ['token', '3. Gerar o token permanente'],
          ['painel', '4. Conectar no painel Walletz'],
          ['webhook', '5. Configurar o webhook na Meta'],
          ['testar', '6. Testar'],
          ['regras', '7. Regras da Meta que você precisa saber'],
          ['problemas', '8. Problemas comuns'],
        ]}
      />

      <H2 id="antes">1. Antes de começar</H2>
      <List>
        <li>Plano <strong>Pro</strong> (1 número), <strong>Business</strong> (2) ou <strong>Agency</strong> (5).</li>
        <li>Conta no <A href="https://business.facebook.com">Meta Business (Gerenciador de Negócios)</A> com acesso de administrador.</li>
        <li>Um número de telefone que <strong>não esteja em uso no app WhatsApp</strong> comum (ou que será migrado para a API).</li>
        <li>Forma de pagamento cadastrada na Meta: as conversas são cobradas pela Meta na sua conta (<A href={PRICING}>tabela de preços</A>). A Walletz não cobra por mensagem.</li>
        <li>Agente publicado e chave de IA conectada em <em>Config. IA</em>.</li>
      </List>

      <H2 id="app">2. Criar o app na Meta</H2>
      <Steps>
        <li>Acesse <A href={META}>developers.facebook.com/apps</A> e clique em <strong>Criar app</strong>.</li>
        <li>Tipo de app: <strong>Empresa</strong> (Business). Vincule ao Gerenciador de Negócios da sua empresa.</li>
        <li>No painel do app, adicione o produto <strong>WhatsApp</strong> e siga a configuração inicial (adicionar e verificar o número).</li>
        <li>
          Anote os dados que vão para o painel Walletz:
          <List>
            <li><strong>App ID</strong> e <strong>App Secret</strong>: <em>Configurações do app → Básico</em> (clique em “Mostrar” no App Secret).</li>
            <li><strong>Phone Number ID</strong> e <strong>WABA ID</strong> (ID da conta do WhatsApp Business): <em>WhatsApp → Configuração da API</em>.</li>
          </List>
        </li>
      </Steps>

      <H2 id="token">3. Gerar o token permanente</H2>
      <P>O token temporário que aparece na tela de configuração da API vence em 24 horas. Use um token de <strong>Usuário do Sistema</strong>, que não expira:</P>
      <Steps>
        <li>Abra <A href={SYSTEM_USERS}>Gerenciador de Negócios → Usuários do sistema</A> e clique em <strong>Adicionar</strong> (função <strong>Admin</strong>).</li>
        <li>Em <strong>Atribuir ativos</strong>, dê acesso total ao seu <strong>app</strong> e à sua <strong>conta do WhatsApp</strong>.</li>
        <li>Clique em <strong>Gerar novo token</strong>, escolha o app, validade <strong>Nunca</strong> e marque as permissões <Code>whatsapp_business_messaging</Code> e <Code>whatsapp_business_management</Code>.</li>
        <li>Copie o token (começa com <Code>EAA…</Code>). Ele só aparece uma vez.</li>
      </Steps>
      <Note tone="warn">Nunca envie o token ou o App Secret por WhatsApp, e-mail ou chat. Cole apenas no formulário do painel Walletz.</Note>

      <H2 id="painel">4. Conectar no painel Walletz</H2>
      <Steps>
        <li>No painel, abra <strong>Canais → WhatsApp</strong> e clique em <strong>Conectar número</strong>.</li>
        <li>Preencha Phone Number ID, WABA ID, App ID, App Secret e o token permanente.</li>
        <li>Escolha o <strong>agente</strong> que vai responder neste número.</li>
        <li>
          Clique em <strong>Validar e conectar</strong>. Conferimos tudo na Meta antes de salvar: token válido e do mesmo app, permissão de
          WhatsApp, App Secret correto e número pertencente à conta. Também inscrevemos o app na sua conta do WhatsApp automaticamente.
        </li>
        <li>Ao final, o painel mostra a <strong>URL de retorno</strong> e o <strong>token de verificação</strong> exclusivos deste número. Deixe a tela aberta para o próximo passo.</li>
      </Steps>

      <H2 id="webhook">5. Configurar o webhook na Meta</H2>
      <Steps>
        <li>No app da Meta: <em>WhatsApp → Configuração</em>, seção <strong>Webhook</strong> → <strong>Editar</strong>.</li>
        <li>Cole a <strong>URL de retorno</strong> (Callback URL) e o <strong>token de verificação</strong> (Verify token) mostrados no painel Walletz.</li>
        <li>Clique em <strong>Verificar e salvar</strong>.</li>
        <li>Em <strong>Campos do webhook</strong>, clique em <strong>Assinar</strong> no campo <Code>messages</Code>.</li>
      </Steps>
      <P>Se precisar ver esses dados depois: <em>Canais → WhatsApp → Ver dados do webhook</em>.</P>

      <H2 id="testar">6. Testar</H2>
      <Steps>
        <li>De outro celular, mande uma mensagem para o número conectado.</li>
        <li>O agente responde em alguns segundos e a conversa aparece em <strong>Conversas</strong>.</li>
        <li>Para atender manualmente, assuma a conversa no painel: a IA para de responder até você devolver.</li>
      </Steps>

      <H2 id="regras">7. Regras da Meta que você precisa saber</H2>
      <List>
        <li><strong>Janela de 24 horas:</strong> o agente responde livremente até 24h depois da última mensagem do cliente. Fora dessa janela, só com <strong>templates aprovados</strong> pela Meta.</li>
        <li><strong>App em modo de desenvolvimento</strong> só conversa com números de teste cadastrados. Para atender o público, publique o app (modo “Ao vivo”) e conclua a verificação da empresa, se a Meta pedir.</li>
        <li><strong>Limites de envio</strong> e <strong>qualidade do número</strong> são definidos pela Meta.</li>
        <li>Quem responde “SAIR”, “PARAR” ou “STOP” é retirado das mensagens de marketing automaticamente.</li>
      </List>

      <H2 id="problemas">8. Problemas comuns</H2>
      <Table
        head={['Mensagem / sintoma', 'Causa provável', 'Como resolver']}
        rows={[
          ['“A Meta recusou o App ID/App Secret”', 'App ID ou App Secret digitado errado, ou de outro app.', 'Copie de novo em Configurações do app → Básico.'],
          ['“Token de acesso inválido ou expirado”', 'Token temporário (24h) ou revogado.', 'Gere um token de Usuário do Sistema com validade “Nunca”.'],
          ['“O token não tem a permissão whatsapp_business_messaging”', 'Permissão não marcada ao gerar o token.', 'Gere outro token marcando as duas permissões de WhatsApp.'],
          ['“Este Phone Number ID não pertence à conta…”', 'Phone Number ID e WABA ID de contas diferentes.', 'Copie os dois da mesma tela (WhatsApp → Configuração da API).'],
          ['A Meta não verifica o webhook', 'URL ou token de verificação copiados errado.', <>Use <em>Ver dados do webhook</em> e copie com o botão “Copiar”.</>],
          ['Mensagens não chegam ao painel', 'Campo messages não assinado, ou app em modo de desenvolvimento.', 'Assine o campo messages; publique o app ou use número de teste.'],
          ['Mensagem chega, mas o agente não responde', 'Sem chave de IA / sem crédito, ou nenhum agente publicado.', 'Confira Config. IA e publique o agente; veja o agente do número.'],
          ['Status “Token expirado / erro” no painel', 'A Meta recusou o token ao enviar.', 'Em Canais → WhatsApp, use “Trocar token / App Secret”.'],
        ]}
      />
    </>
  );
}
