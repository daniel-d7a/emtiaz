import { Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { db } from '../../db';
import { notifications } from '../../db/schema';
import { logger } from '../../lib/logger';
import { WHATSAPP_SENDER, WhatsAppSender } from './whatsapp-sender';
import { EMAIL_SENDER, EmailSender } from './email-sender';
import { NotificationSettingsService, type NotificationType } from './notification-settings.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    private readonly settings: NotificationSettingsService,
  ) {}

  async sendWhatsApp(to: string, message: string, type: NotificationType = 'SYSTEM') {
    if (!to) return; // users may not have a phone yet; never block enrollment on notifications
    if (!(await this.enabled('whatsapp', type))) return;
    try {
      await this.whatsapp.send(to, message, type);
    } catch (e) {
      // notifications must never fail the primary flow
      logger.error({ err: e }, 'notification send failed');
    }
  }

  async sendEmail(to: string, subject: string, body: string, type: NotificationType = 'SYSTEM') {
    if (!to) return;
    if (!(await this.enabled('email', type))) return;
    try {
      await this.email.send(to, subject, body, type);
    } catch (e) {
      logger.error({ err: e }, 'email notification failed');
    }
  }

  recent(limit = 50) {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(Math.min(limit, 200));
  }

  private async enabled(channel: 'whatsapp' | 'email', type: NotificationType) {
    try {
      return await this.settings.isEnabled(channel, type);
    } catch (e) {
      logger.error({ err: e }, 'notification settings lookup failed; sending anyway');
      return true;
    }
  }
}
