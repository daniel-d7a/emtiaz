import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { notifications } from '../../db/schema';
import { logger } from '../../lib/logger';
import { EmailSender } from './email-sender';

@Injectable()
export class MockEmailSender implements EmailSender {
  // ponytail: persists to notifications instead of sending; swap via EMAIL_SENDER when a provider is chosen
  async send(to: string, subject: string, body: string, type = 'SYSTEM'): Promise<void> {
    await db.insert(notifications).values({
      channel: 'email',
      type,
      recipient: to,
      message: `${subject}\n\n${body}`,
    });
    logger.info({ to, subject }, 'mock email notification');
  }
}
