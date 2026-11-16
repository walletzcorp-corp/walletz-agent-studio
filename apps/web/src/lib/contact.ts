/** WhatsApp da equipe Walletz que recebe quem quer criar uma conta (cadastro é fechado). */
export const SALES_WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP || '5541992939892';

const SIGNUP_MESSAGE = 'Olá! Tenho interesse no Walletz Agent Studio e quero criar minha conta.';

/** Link wa.me que abre a conversa com a mensagem já escrita. */
export function signupWhatsappUrl(): string {
  return `https://wa.me/${SALES_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(SIGNUP_MESSAGE)}`;
}

/** Link wa.me para falar com a Walletz sobre um plano (contratar, mudar, implantação). */
export function planWhatsappUrl(planName?: string): string {
  const text = planName
    ? `Olá! Quero falar sobre o plano ${planName} do Walletz Studio IA.`
    : 'Olá! Quero falar sobre os planos do Walletz Studio IA.';
  return `https://wa.me/${SALES_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
