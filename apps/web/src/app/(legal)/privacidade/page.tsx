import type { Metadata } from 'next';
import Link from 'next/link';
import { DocTitle, H2, H3, List, Note, P, Table, Toc } from '../../docs/_components';
import { COMPANY, LEGAL_EFFECTIVE_DATE } from '../../../lib/company';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Walletz Agent Studio coleta, usa, compartilha e protege dados pessoais, incluindo dados do Google Agenda.',
};

const LINK = 'text-neural-blue hover:underline';

function ContactEmail() {
  return <a className={LINK} href={`mailto:${COMPANY.privacyContactEmail}`}>{COMPANY.privacyContactEmail}</a>;
}

export default function PrivacyPage() {
  return (
    <>
      <DocTitle
        title="Política de Privacidade"
        intro={<>Walletz Agent Studio. Em vigor desde {LEGAL_EFFECTIVE_DATE}.</>}
      />

      <Toc
        items={[
          ['quem-somos', 'Quem somos'],
          ['papeis', 'Nosso papel em cada tratamento'],
          ['dados', 'Dados que tratamos'],
          ['google', 'Dados do Google (Google Agenda)'],
          ['microsoft', 'Dados do Microsoft 365'],
          ['ia', 'Inteligência artificial'],
          ['compartilhamento', 'Com quem compartilhamos'],
          ['retencao', 'Por quanto tempo guardamos'],
          ['seguranca', 'Segurança'],
          ['direitos', 'Seus direitos'],
          ['cookies', 'Cookies e armazenamento no navegador'],
          ['mudancas', 'Mudanças nesta política'],
          ['contato', 'Contato'],
        ]}
      />

      <H2 id="quem-somos">Quem somos</H2>
      <P>
        O Walletz Agent Studio é uma plataforma para empresas criarem, testarem e operarem agentes de inteligência
        artificial em canais como WhatsApp e webchat. É operada por {COMPANY.legalName}, CNPJ {COMPANY.taxId}, com sede
        em {COMPANY.address} (&quot;Walletz&quot;). Esta política segue a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018, LGPD).
      </P>

      <H2 id="papeis">Nosso papel em cada tratamento</H2>
      <List>
        <li>
          <strong>Controladora:</strong> dos dados das pessoas que usam o painel (cadastro, acesso, suporte e registros
          de segurança).
        </li>
        <li>
          <strong>Operadora:</strong> dos dados que cada empresa cliente trata na plataforma, como contatos, conversas,
          documentos e reuniões. Nesse caso a empresa cliente decide a finalidade, e nós tratamos os dados para prestar
          o serviço a ela.
        </li>
      </List>
      <P>
        Se você conversou com o agente de uma empresa, procure primeiro essa empresa. Se nos procurar, encaminhamos o
        pedido a ela.
      </P>

      <H2 id="dados">Dados que tratamos</H2>
      <Table
        head={['Categoria', 'Exemplos', 'Para quê', 'Base legal (LGPD)']}
        rows={[
          ['Conta', 'nome, e-mail, senha (somente em formato de hash), organização e papel', 'criar e proteger o acesso', 'execução de contrato'],
          ['Empresa cliente', 'nome ou razão social, CPF/CNPJ, telefone, plano', 'contratação, suporte e cobrança', 'execução de contrato e obrigação legal'],
          ['Registros de segurança', 'endereço IP, navegador, sessões e ações realizadas', 'segurança, auditoria e prevenção a fraude', 'legítimo interesse e obrigação legal'],
          ['Contatos e conversas', 'nome, telefone, e-mail e conteúdo das mensagens', 'atendimento em nome da empresa cliente', 'definida pela empresa cliente'],
          ['Base de conhecimento', 'documentos enviados pela empresa', 'permitir que o agente responda com esse conteúdo', 'definida pela empresa cliente'],
          ['Agenda', 'conta conectada, horários ocupados e reuniões', 'agendar reuniões', 'definida pela empresa cliente'],
          ['Credenciais de integração', 'chaves e tokens de serviços de terceiros', 'conectar os serviços escolhidos pela empresa', 'execução de contrato'],
        ]}
      />

      <H2 id="google">Dados do Google (Google Agenda)</H2>
      <P>A conexão com o Google Agenda é opcional e só acontece depois que você autoriza na tela do próprio Google.</P>

      <H3>O que acessamos</H3>
      <List>
        <li><strong>Identificação:</strong> e-mail e nome da conta Google, para mostrar qual agenda está conectada.</li>
        <li>
          <strong>Horários ocupados da agenda principal:</strong> para oferecer horários, pedimos ao Google só o início e
          o fim dos períodos ocupados. Não recebemos título, descrição nem convidados dos seus compromissos e não
          gravamos esses períodos.
        </li>
        <li>
          <strong>Criação, alteração e exclusão de eventos:</strong> criamos as reuniões marcadas pela plataforma
          (título, descrição, horário, convidado e link do Google Meet, quando pedido), mudamos o horário das que forem
          reagendadas e excluímos as que forem canceladas nela.
        </li>
      </List>

      <H3>O que guardamos</H3>
      <List>
        <li>E-mail, nome, permissões concedidas e tokens de acesso. Os tokens ficam criptografados (AES-256-GCM).</li>
        <li>As reuniões criadas pela plataforma, com o identificador do evento e o link da reunião.</li>
      </List>

      <H3>O que não fazemos</H3>
      <List>
        <li>Não vendemos dados do Google.</li>
        <li>Não usamos dados do Google para publicidade, análise de crédito ou formação de perfis de mercado.</li>
        <li>Não usamos dados do Google para desenvolver, melhorar ou treinar modelos de inteligência artificial generalistas.</li>
        <li>
          Nossa equipe não lê dados do Google, salvo com a sua autorização expressa, por segurança (por exemplo, apurar
          abuso) ou por exigência legal.
        </li>
      </List>

      <H3>Com quem esses dados são compartilhados</H3>
      <P>
        Somente para o recurso de agendamento funcionar: com os usuários autorizados da organização, com o convidado da
        reunião e, quando um agente faz o agendamento, com o provedor de IA escolhido pela empresa, que recebe os
        horários oferecidos e os dados da reunião (como título, horário e link). Se a empresa configurar webhooks, o
        aviso de reunião criada ou cancelada vai para o sistema que ela indicou.
      </P>

      <H3>Como desconectar e excluir</H3>
      <List>
        <li>
          Em <strong>Agendas</strong>, desconecte a conta: os tokens são apagados na hora e pedimos ao Google a revogação
          do acesso. Se a mesma conta Google estiver em outra conexão ativa, o acesso dela é mantido.
        </li>
        <li>
          Você também pode remover o acesso a qualquer momento em{' '}
          <a className={LINK} href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>.
        </li>
        <li>
          Depois de desconectar, ficam o registro da conexão (e-mail e nome da conta, sem tokens) e as reuniões criadas
          pela plataforma. Para excluí-los, escreva para <ContactEmail />.
        </li>
      </List>

      <Note>
        <strong>Uso Limitado.</strong> O uso e a transferência, pelo Walletz Agent Studio, de informações recebidas das
        APIs do Google seguem a{' '}
        <a className={LINK} href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Política de Dados do Usuário dos Serviços de API do Google
        </a>
        , incluindo os requisitos de Uso Limitado.
        <br /><br />
        <span lang="en">
          Walletz Agent Studio&apos;s use and transfer to any other app of information received from Google APIs will
          adhere to the Google API Services User Data Policy, including the Limited Use requirements.
        </span>
      </Note>

      <H2 id="microsoft">Dados do Microsoft 365</H2>
      <P>
        Quando a empresa conecta uma agenda do Microsoft 365, acessamos os dados básicos da conta e a agenda para as
        mesmas finalidades: consultar horários ocupados, criar, alterar e excluir reuniões e gerar links do Teams. Ao
        desconectar, apagamos os tokens; a permissão também pode ser removida na sua conta Microsoft.
      </P>

      <H2 id="ia">Inteligência artificial</H2>
      <P>
        Para responder, o agente envia ao provedor de IA escolhido pela empresa cliente (Anthropic, OpenAI, Google Gemini
        ou OpenRouter) a mensagem, o histórico da conversa, as instruções do agente e os trechos relevantes da base de
        conhecimento. A empresa usa a própria chave e o próprio contrato com o provedor, que define como ele trata esses
        dados. A empresa deve escolher um plano do provedor adequado a dados pessoais.
      </P>
      <P>
        As respostas são geradas automaticamente e podem conter erros. Você pode pedir à empresa a revisão de decisões
        tomadas unicamente por tratamento automatizado que afetem seus interesses.
      </P>

      <H2 id="compartilhamento">Com quem compartilhamos</H2>
      <List>
        <li><strong>Provedores de IA</strong> escolhidos pela empresa cliente.</li>
        <li><strong>Meta (WhatsApp)</strong>, para receber e entregar mensagens.</li>
        <li><strong>Google e Microsoft</strong>, quando a empresa conecta uma agenda.</li>
        <li><strong>Sistemas indicados pela empresa cliente</strong>, por meio de webhooks.</li>
        <li><strong>Fornecedores de infraestrutura e e-mail</strong>, para hospedar e operar a plataforma.</li>
        <li><strong>Autoridades</strong>, quando a lei ou uma ordem válida exigir.</li>
      </List>
      <P>
        Não vendemos dados pessoais. Alguns desses fornecedores tratam dados fora do Brasil; nesses casos a transferência
        internacional deve observar os artigos 33 a 36 da LGPD.
      </P>

      <H2 id="retencao">Por quanto tempo guardamos</H2>
      <P>
        Guardamos os dados enquanto a conta ou o contrato da empresa estiver ativo e pelo tempo necessário para cumprir
        obrigações legais, manter a segurança e exercer direitos. Pedidos de exclusão são atendidos conforme a LGPD, e
        podemos manter o que a lei exigir ou permitir. Falta de pagamento não leva à exclusão imediata dos dados.
      </P>

      <H2 id="seguranca">Segurança</H2>
      <List>
        <li>Conexão criptografada (HTTPS) entre o navegador e a plataforma.</li>
        <li>Senhas guardadas como hash; chaves de IA, tokens de agenda e tokens do WhatsApp criptografados.</li>
        <li>Separação dos dados por organização e acesso conforme o papel de cada usuário.</li>
        <li>Registro de auditoria das principais ações.</li>
      </List>
      <P>
        Nenhum sistema é totalmente imune. Incidentes que possam causar risco ou dano relevante serão comunicados à ANPD
        e às pessoas afetadas, como prevê a LGPD.
      </P>

      <H2 id="direitos">Seus direitos</H2>
      <P>
        Você pode pedir confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade,
        informação sobre compartilhamento, oposição e revogação do consentimento. Escreva para <ContactEmail />. Podemos
        pedir informações para confirmar a sua identidade. Você também pode reclamar à Autoridade Nacional de Proteção de
        Dados (ANPD).
      </P>

      <H2 id="cookies">Cookies e armazenamento no navegador</H2>
      <P>
        O painel guarda no armazenamento local do navegador os dados necessários para manter você conectado, e o webchat
        guarda o identificador da conversa.
      </P>

      <H2 id="mudancas">Mudanças nesta política</H2>
      <P>
        Podemos atualizar este texto. A data no início mostra a versão em vigor. Se mudarmos a forma de usar dados do
        Google, avisaremos e pediremos nova autorização quando necessário.
      </P>

      <H2 id="contato">Contato</H2>
      <List>
        <li>Responsável pelo contato: {COMPANY.privacyContactName}</li>
        <li>E-mail: <ContactEmail /></li>
        <li>
          WhatsApp:{' '}
          <a className={LINK} href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">{COMPANY.whatsappLabel}</a>
        </li>
        <li>Endereço: {COMPANY.address}</li>
      </List>
      <P>Veja também os <Link className={LINK} href="/termos">Termos de Uso</Link>.</P>
    </>
  );
}
