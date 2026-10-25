import { Inject, Injectable } from '@nestjs/common';
import { logger } from '../../lib/logger';
import { WHATSAPP_SENDER, WhatsAppSender } from './whatsapp-sender';
import { EMAIL_SENDER, EmailSender } from './email-sender';
import { NotificationSettingsService } from './notification-settings.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    private readonly settings: NotificationSettingsService,
  ) {}

  async sendWhatsApp(to: string, message: string) {
    if (!to) return; // users may not have a phone yet; never block enrollment on notifications
    if (!(await this.enabled('whatsapp'))) return;
    try {
      await this.whatsapp.send(to, message);
    } catch (e) {
      // notifications must never fail the primary flow
      logger.error({ err: e }, 'notification send failed');
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!to) return;
    if (!(await this.enabled('email'))) return;
    try {
      await this.email.send(to, subject, body);
    } catch (e) {
      logger.error({ err: e }, 'email notification failed');
    }
  }

  private async enabled(channel: 'whatsapp' | 'email') {
    try {
      return await this.settings.isEnabled(channel);
    } catch (e) {
      logger.error({ err: e }, 'notification settings lookup failed; sending anyway');
      return true;
    }
  }
}
