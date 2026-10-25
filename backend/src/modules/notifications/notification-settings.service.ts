import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { notificationSettings } from '../../db/schema';

export type NotificationChannel = 'whatsapp' | 'email' | 'inApp';

const column = {
  whatsapp: 'whatsappEnabled',
  email: 'emailEnabled',
  inApp: 'inAppEnabled',
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

  async update(patch: Partial<Pick<typeof notificationSettings.$inferInsert, 'whatsappEnabled' | 'emailEnabled' | 'inAppEnabled'>>) {
    await this.get();
    const [row] = await db
      .update(notificationSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(notificationSettings.id, 'global'))
      .returning();
    return row;
  }

  async isEnabled(channel: NotificationChannel): Promise<boolean> {
    const row = await this.get();
    return row[column[channel]];
  }
}
