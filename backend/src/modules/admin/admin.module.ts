import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [OnboardingModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AdminModule {}
