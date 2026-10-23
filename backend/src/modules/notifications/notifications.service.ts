import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { notifications } from '../../db/schema';

/** Single swap point: implement this for the real provider (Meta WhatsApp Cloud API etc.). */
export interface WhatsAppSender {
  send(to: string, message: string): Promise<void>;
}

@Injectable()
export class MockWhatsAppSender implements WhatsAppSender {
  // ponytail: mock sender persists to notifications table instead of hitting Meta API — swap via DI when real creds exist
  async send(to: string, message: string): Promise<void> {
    await db.insert(notifications).values({ channel: 'whatsapp', recipient: to, message });
    console.log(`[mock-whatsapp] → ${to}: ${message}`);
  }
}

@Injectable()
export class NotificationsService {
  // ponytail: sender is fixed here, not Nest DI (interface has no runtime token) — replace this line to swap providers
  private readonly sender: WhatsAppSender = new MockWhatsAppSender();

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
