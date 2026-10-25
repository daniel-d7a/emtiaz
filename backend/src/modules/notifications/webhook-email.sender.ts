import { Injectable } from '@nestjs/common';
import { EmailSender } from './email-sender';

/** Provider-agnostic email delivery: POST {to, subject, body} to EMAIL_WEBHOOK_URL. */
@Injectable()
export class WebhookEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string, type = 'SYSTEM'): Promise<void> {
    const url = process.env.EMAIL_WEBHOOK_URL;
    if (!url) throw new Error('EMAIL_WEBHOOK_URL is not configured');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, type }),
    });
    if (!res.ok) throw new Error(`Email webhook ${res.status}: ${await res.text()}`);
  }
}

export function emailWebhookConfigured(): boolean {
  return !!process.env.EMAIL_WEBHOOK_URL;
}
