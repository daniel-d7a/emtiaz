import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { notificationSettings } from '../../db/schema';

export type NotificationChannel = 'whatsapp' | 'email' | 'inApp';
export type NotificationType = 'ADMIN' | 'PARENT' | 'TEACHER' | 'SYSTEM';

const column = {
  whatsapp: 'whatsappEnabled',
  email: 'emailEnabled',
  inApp: 'inAppEnabled',
} as const;

const typeColumn = {
  ADMIN: 'adminEnabled',
  PARENT: 'parentEnabled',
  TEACHER: 'teacherEnabled',
} as const;

@Injectable()
export class NotificationSettingsService {
  async get() {
    const [row] = await db.select().from(notificationSettings).where(eq(notificationSettings.id, 'global'));
    if (row) return row;
    const [created] = await db
      .insert(notificationSettings)
      .values({ id: 'global' })
      .onConflictDoNothing()
      .returning();
    return created ?? (await db.select().from(notificationSettings).where(eq(notificationSettings.id, 'global')))[0];
  }

  async update(
    patch: Partial<
      Pick<
        typeof notificationSettings.$inferInsert,
        | 'whatsappEnabled'
        | 'emailEnabled'
        | 'inAppEnabled'
        | 'adminEnabled'
        | 'parentEnabled'
        | 'teacherEnabled'
        | 'supportEmail'
        | 'supportPhone'
        | 'supportWhatsapp'
        | 'primaryColor'
        | 'secondaryColor'
        | 'logoUrl'
      >
    >,
  ) {
    await this.get();
    const [row] = await db
      .update(notificationSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(notificationSettings.id, 'global'))
      .returning();
    return row;
  }

  async isEnabled(channel: NotificationChannel, type: NotificationType = 'SYSTEM'): Promise<boolean> {
    const row = await this.get();
    if (!row[column[channel]]) return false;
    return type === 'SYSTEM' ? true : row[typeColumn[type]];
  }
}
