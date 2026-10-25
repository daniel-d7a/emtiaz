import { Inject, Injectable } from '@nestjs/common';
import { WHATSAPP_SENDER, WhatsAppSender } from './whatsapp-sender';

@Injectable()
export class NotificationsService {
  constructor(@Inject(WHATSAPP_SENDER) private readonly sender: WhatsAppSender) {}

  async sendWhatsApp(to: string, message: string) {
    if (!to) return; // users may not have a phone yet; never block enrollment on notifications
    try {
      await this.sender.send(to, message);
    } catch (e) {
      // notifications must never fail the primary flow
      console.error('[notifications] send failed:', e);
    }
  }
}
