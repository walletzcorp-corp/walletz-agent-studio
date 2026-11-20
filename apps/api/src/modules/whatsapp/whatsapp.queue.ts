import type { WaMessage, WaContact } from './whatsapp.service';

export const WHATSAPP_INBOUND_QUEUE = 'whatsapp-inbound';

export interface WhatsappInboundJobData {
  phoneNumberId: string;
  message: WaMessage;
  waContact?: WaContact;
}
