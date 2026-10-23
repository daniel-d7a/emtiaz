import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { auth } from './auth/auth';
import { toNodeHandler } from 'better-auth/node';
import { json, urlencoded } from 'express';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(),
    { logger: process.env.NEST_LOG === '1' ? ['error', 'warn'] : false },
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.use(json({ limit: '2mb' }), urlencoded({ extended: true }));
  app.use('/api/auth', toNodeHandler(auth.handler));
  await app.init();
  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(3000);
  console.log('Emtiaz LMS API running on http://localhost:3000');
}

if (require.main === module) {
  bootstrap();
}
