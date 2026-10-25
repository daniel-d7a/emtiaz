import { Injectable } from '@nestjs/common';
import { WhatsAppSender } from './whatsapp-sender';

/** Meta WhatsApp Cloud API sender. Enabled only when token + phone number id are set. */
@Injectable()
export class WhatsAppCloudSender implements WhatsAppSender {
  async send(to: string, message: string): Promise<void> {
    const token = process.env.WHATSAPP_CLOUD_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new Error('WhatsApp Cloud API is not configured');

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'text',
        text: { body: message },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp Cloud API ${res.status}: ${await res.text()}`);
  }
}

export function whatsappCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
