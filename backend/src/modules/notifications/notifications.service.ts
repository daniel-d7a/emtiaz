import { Inject, Injectable } from '@nestjs/common';
import { logger } from '../../lib/logger';
import { WHATSAPP_SENDER, WhatsAppSender } from './whatsapp-sender';
import { EMAIL_SENDER, EmailSender } from './email-sender';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async sendWhatsApp(to: string, message: string) {
    if (!to) return; // users may not have a phone yet; never block enrollment on notifications
    try {
      await this.whatsapp.send(to, message);
    } catch (e) {
      // notifications must never fail the primary flow
      logger.error({ err: e }, 'notification send failed');
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!to) return;
    try {
      await this.email.send(to, subject, body);
    } catch (e) {
      logger.error({ err: e }, 'email notification failed');
    }
  }
}
