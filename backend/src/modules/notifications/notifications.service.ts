import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { inboxNotifications, notifications } from '../../db/schema';
import { logger } from '../../lib/logger';
import { WHATSAPP_SENDER, WhatsAppSender } from './whatsapp-sender';
import { EMAIL_SENDER, EmailSender } from './email-sender';
import { NotificationSettingsService, type NotificationType } from './notification-settings.service';
import { serializeAdminNotification, serializeInboxItem } from '../../lib/serializers';

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

  async sendInApp(userId: string, message: string, type: NotificationType = 'SYSTEM') {
    if (!userId) return;
    if (!(await this.enabled('inApp', type))) return;
    try {
      await db.insert(inboxNotifications).values({ userId, message, type });
    } catch (e) {
      logger.error({ err: e }, 'in-app notification failed');
    }
  }

  async inbox(userId: string, limit = 30) {
    const rows = await db
      .select()
      .from(inboxNotifications)
      .where(eq(inboxNotifications.userId, userId))
      .orderBy(desc(inboxNotifications.createdAt))
      .limit(Math.min(limit, 100));
    return rows.map(serializeInboxItem);
  }

  async unreadCount(userId: string) {
    const [row] = await db
      .select({ c: count() })
      .from(inboxNotifications)
      .where(and(eq(inboxNotifications.userId, userId), isNull(inboxNotifications.readAt)));
    return { unread: Number(row.c) };
  }

  async markRead(userId: string, id: string) {
    await db
      .update(inboxNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(inboxNotifications.id, id), eq(inboxNotifications.userId, userId)));
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await db
      .update(inboxNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(inboxNotifications.userId, userId), isNull(inboxNotifications.readAt)));
    return { ok: true };
  }

  async recent(limit = 50) {
    const rows = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(Math.min(limit, 200));
    return rows.map(serializeAdminNotification);
  }

  private async enabled(channel: 'whatsapp' | 'email' | 'inApp', type: NotificationType) {
    try {
      return await this.settings.isEnabled(channel, type);
    } catch (e) {
      logger.error({ err: e }, 'notification settings lookup failed; sending anyway');
      return true;
    }
  }
}
