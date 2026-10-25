import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { notifications } from '../../db/schema';
import { WhatsAppSender } from './whatsapp-sender';
import { logger } from '../../lib/logger';

@Injectable()
export class MockWhatsAppSender implements WhatsAppSender {
  // ponytail: mock sender persists to notifications table instead of hitting Meta API — swap via WHATSAPP_SENDER when real creds exist
  async send(to: string, message: string): Promise<void> {
    await db.insert(notifications).values({ channel: 'whatsapp', recipient: to, message });
    logger.info({ to }, 'mock WhatsApp notification');
  }
}
