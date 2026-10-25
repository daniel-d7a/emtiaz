import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AppThrottlerGuard } from './auth/throttler.guard';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';
import { ParentModule } from './modules/parent/parent.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DatabaseLifecycle } from './db';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    NotificationsModule,
    OnboardingModule,
    StudentModule,
    TeacherModule,
    StorageModule,
    AdminModule,
    ParentModule,
  ],
  providers: [
    DatabaseLifecycle,
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
