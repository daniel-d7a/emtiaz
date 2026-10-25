import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MockWhatsAppSender } from './mock-whatsapp.sender';
import { WhatsAppCloudSender, whatsappCloudConfigured } from './whatsapp-cloud.sender';
import { WHATSAPP_SENDER } from './whatsapp-sender';

@Global()
@Module({
  providers: [
    {
      provide: WHATSAPP_SENDER,
      useClass: whatsappCloudConfigured() ? WhatsAppCloudSender : MockWhatsAppSender,
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
