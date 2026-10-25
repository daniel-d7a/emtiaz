import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MockWhatsAppSender } from './mock-whatsapp.sender';
import { WhatsAppCloudSender, whatsappCloudConfigured } from './whatsapp-cloud.sender';
import { WHATSAPP_SENDER } from './whatsapp-sender';
import { EMAIL_SENDER } from './email-sender';
import { MockEmailSender } from './mock-email.sender';
import { WebhookEmailSender, emailWebhookConfigured } from './webhook-email.sender';

@Global()
@Module({
  providers: [
    {
      provide: WHATSAPP_SENDER,
      useClass: whatsappCloudConfigured() ? WhatsAppCloudSender : MockWhatsAppSender,
    },
    {
      provide: EMAIL_SENDER,
      useClass: emailWebhookConfigured() ? WebhookEmailSender : MockEmailSender,
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
