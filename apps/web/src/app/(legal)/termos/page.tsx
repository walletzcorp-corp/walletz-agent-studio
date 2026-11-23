import type { Metadata } from 'next';
import Link from 'next/link';
import { DocTitle, H2, List, P } from '../../docs/_components';
import { COMPANY, LEGAL_EFFECTIVE_DATE } from '../../../lib/company';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Regras de uso do Walletz Agent Studio.',
};

const LINK = 'text-neural-blue hover:underline';

export default function TermsPage() {
  return (
    <>
      <DocTitle title="Termos de Uso" intro={<>Walletz Agent Studio. Em vigor desde {LEGAL_EFFECTIVE_DATE}.</>} />

      <H2 id="servico">1. O serviço</H2>
      <P>
        O Walletz Agent Studio, operado por {COMPANY.legalName}, CNPJ {COMPANY.taxId}, permite criar, testar e operar
        agentes de inteligência artificial. Ao usar a plataforma você aceita estes termos. Se houver proposta ou contrato
        assinado, ele prevalece no que for diferente.
      </P>

      <H2 id="conta">2. Conta e acesso</H2>
      <List>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
        <li>Cada pessoa deve usar o próprio acesso e manter a senha em sigilo.</li>
        <li>A empresa cliente responde pelos usuários que convida e pelos papéis que concede.</li>
      </List>

      <H2 id="cliente">3. Responsabilidades da empresa cliente</H2>
      <List>
        <li>Ter base legal para os dados que insere e informar os titulares sobre o tratamento.</li>
        <li>Obter consentimento quando exigido e respeitar pedidos de descadastro em campanhas.</li>
        <li>Configurar, testar e supervisionar os agentes antes e depois de publicá-los.</li>
        <li>Avisar as pessoas atendidas de que conversam com um agente de IA.</li>
        <li>Cumprir as regras da Meta, do Google, da Microsoft e dos provedores de IA que conectar.</li>
      </List>

      <H2 id="proibido">4. Usos proibidos</H2>
      <List>
        <li>Enviar spam, golpes, conteúdo ilegal ou que viole direitos de terceiros.</li>
        <li>Tentar acessar dados de outra organização, burlar limites ou prejudicar o serviço.</li>
        <li>
          Usar dados obtidos de APIs do Google fora do que a{' '}
          <Link className={LINK} href="/privacidade">Política de Privacidade</Link> descreve.
        </li>
      </List>

      <H2 id="ia">5. Inteligência artificial</H2>
      <P>
        Respostas de IA podem conter erros e não substituem orientação profissional. A empresa usa a própria chave do
        provedor de IA, paga o provedor diretamente e responde pelo contrato com ele.
      </P>

      <H2 id="terceiros">6. Serviços de terceiros</H2>
      <P>
        Integrações dependem de serviços externos, com regras, tarifas e disponibilidade próprias. Podemos suspender uma
        integração se o fornecedor exigir ou se houver risco de segurança.
      </P>

      <H2 id="planos">7. Planos e pagamento</H2>
      <P>
        Recursos, limites, preços e condições são os da proposta contratada. A falta de pagamento pode bloquear o uso,
        mas não causa a exclusão imediata dos dados.
      </P>

      <H2 id="propriedade">8. Propriedade</H2>
      <P>
        A plataforma pertence à Walletz. O conteúdo inserido pela empresa continua sendo dela; a Walletz o usa somente
        para prestar o serviço.
      </P>

      <H2 id="suspensao">9. Suspensão e encerramento</H2>
      <P>
        Podemos suspender acessos que violem estes termos, a lei ou a segurança da plataforma. A empresa pode encerrar o
        uso conforme o contrato e pedir a exportação ou a exclusão dos dados.
      </P>

      <H2 id="responsabilidade">10. Responsabilidade</H2>
      <P>
        Buscamos manter o serviço disponível e seguro, mas não garantimos funcionamento ininterrupto nem resultados
        específicos. Nada nestes termos afasta responsabilidades que a lei não permite limitar.
      </P>

      <H2 id="privacidade">11. Privacidade</H2>
      <P>
        O tratamento de dados está na <Link className={LINK} href="/privacidade">Política de Privacidade</Link>.
      </P>

      <H2 id="gerais">12. Disposições gerais</H2>
      <P>
        Estes termos seguem a lei brasileira e podem ser atualizados; a data no início mostra a versão em vigor. Dúvidas:{' '}
        <a className={LINK} href={`mailto:${COMPANY.privacyContactEmail}`}>{COMPANY.privacyContactEmail}</a>.
      </P>
    </>
  );
}
