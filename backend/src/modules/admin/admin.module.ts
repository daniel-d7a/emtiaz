import { forwardRef, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { TeacherModule } from '../teacher/teacher.module';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [forwardRef(() => OnboardingModule), forwardRef(() => TeacherModule)],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService],
})
export class AdminModule {}
