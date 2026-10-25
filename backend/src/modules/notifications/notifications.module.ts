import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MockWhatsAppSender } from './mock-whatsapp.sender';
import { WhatsAppCloudSender, whatsappCloudConfigured } from './whatsapp-cloud.sender';
import { WHATSAPP_SENDER } from './whatsapp-sender';
import { EMAIL_SENDER } from './email-sender';
import { MockEmailSender } from './mock-email.sender';
import { WebhookEmailSender, emailWebhookConfigured } from './webhook-email.sender';
import { NotificationSettingsService } from './notification-settings.service';
import { InboxController } from './inbox.controller';

@Global()
@Module({
  controllers: [InboxController],
  providers: [
    {
      provide: WHATSAPP_SENDER,
      useClass: whatsappCloudConfigured() ? WhatsAppCloudSender : MockWhatsAppSender,
    },
    {
      provide: EMAIL_SENDER,
      useClass: emailWebhookConfigured() ? WebhookEmailSender : MockEmailSender,
    },
    NotificationSettingsService,
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationSettingsService],
})
export class NotificationsModule {}
