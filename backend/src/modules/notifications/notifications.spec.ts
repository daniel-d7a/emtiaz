import { NotificationsService } from './notifications.service';
import { whatsappCloudConfigured } from './whatsapp-cloud.sender';
import { WhatsAppSender } from './whatsapp-sender';
import { EmailSender } from './email-sender';
import { logger } from '../../lib/logger';

function service(sender: WhatsAppSender, email: EmailSender = { send: jest.fn() }) {
  return new NotificationsService(sender, email);
}

describe('NotificationsService', () => {
  it('skips sending when the recipient has no phone number', async () => {
    const send = jest.fn();
    await service({ send }).sendWhatsApp('', 'hi');
    expect(send).not.toHaveBeenCalled();
  });

  it('never lets a sender failure bubble into the primary flow', async () => {
    const send = jest.fn().mockRejectedValue(new Error('provider down'));
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    await expect(service({ send }).sendWhatsApp('+96890000000', 'hi')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('email', () => {
  it('skips empty recipients and swallows provider failures', async () => {
    const email = { send: jest.fn().mockRejectedValue(new Error('smtp down')) };
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    await service({ send: jest.fn() }, email).sendEmail('', 'Hi', 'Body');
    expect(email.send).not.toHaveBeenCalled();
    await expect(service({ send: jest.fn() }, email).sendEmail('a@b.om', 'Hi', 'Body')).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('whatsappCloudConfigured', () => {
  const keys = ['WHATSAPP_CLOUD_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('is false without credentials and true with both', () => {
    delete process.env.WHATSAPP_CLOUD_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(whatsappCloudConfigured()).toBe(false);
    process.env.WHATSAPP_CLOUD_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
    expect(whatsappCloudConfigured()).toBe(true);
  });
});
