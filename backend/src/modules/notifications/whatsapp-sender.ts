/** Single swap point: implement this for a real WhatsApp provider. */
export interface WhatsAppSender {
  send(to: string, message: string, type?: string): Promise<void>;
}

export const WHATSAPP_SENDER = Symbol('WHATSAPP_SENDER');
