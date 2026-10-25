/** Swap point for a real email provider (Resend, SES, Postmark, SMTP gateway…). */
export interface EmailSender {
  send(to: string, subject: string, body: string, type?: string): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
