import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { auth } from './auth/auth';
import { toNodeHandler } from 'better-auth/node';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger, requestId } from './lib/logger';
import { LoginLockout, loginLockoutMiddleware } from './auth/login-lockout';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(),
    { logger: process.env.NEST_LOG === '1' ? ['error', 'warn'] : false },
  );
  app.getHttpAdapter().getInstance().set('trust proxy', 1); // correct client IPs behind Caddy/nginx
  app.use(pinoHttp({ logger, genReqId: requestId }));
  const docsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === '1';
  app.use(
    docsEnabled
      ? helmet({
          contentSecurityPolicy: {
            directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'style-src': ["'self'", "'unsafe-inline'"] },
          },
        })
      : helmet(),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  app.use(json({ limit: '2mb' }), urlencoded({ extended: true }));
  app.enableShutdownHooks();
  app.use('/api/auth', toNodeHandler(auth.handler));
  if (docsEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Emtiaz LMS API')
      .setDescription('Contract for the web and mobile clients')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.init();
  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(3000);
  logger.info('Emtiaz LMS API running on http://localhost:3000');
}

if (require.main === module) {
  bootstrap();
}
