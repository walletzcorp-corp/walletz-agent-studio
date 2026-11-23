import { SALES_WHATSAPP } from './contact';

/** Dados públicos da empresa, usados na política de privacidade e nos termos (fonte: cartão CNPJ). */
export const COMPANY = {
  legalName: 'Walletz Corp Technologies Ltda',
  taxId: '65.621.091/0001-28',
  address: 'Rua Bom Jesus, 212, sala 1904, 19º andar, Cond. AR 3000, Juvevê, Curitiba/PR, CEP 80035-010',
  privacyContactName: 'Emmanuel de Paula',
  privacyContactEmail: 'emmanuel@walletzcorp.com',
  whatsappUrl: `https://wa.me/${SALES_WHATSAPP.replace(/\D/g, '')}`,
  whatsappLabel: '(41) 99293-9892',
} as const;

/** Data de vigência exibida nas páginas legais. Atualize a cada mudança de texto. */
export const LEGAL_EFFECTIVE_DATE = '23 de novembro de 2026';
