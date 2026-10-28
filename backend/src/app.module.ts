import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AdminPermissionGuard } from './modules/admin/admin-permission.guard';
import { AppThrottlerGuard } from './auth/throttler.guard';
import { RedisThrottlerStorage } from './auth/redis-throttler.storage';
import { Redis } from 'ioredis';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';
import { ParentModule } from './modules/parent/parent.module';
import { PublicModule } from './modules/public/public.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DatabaseLifecycle } from './db';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const throttlers = [{ ttl: 60_000, limit: 300 }];
        if (!process.env.REDIS_URL) return { throttlers };
        const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
        redis.on('error', (err) => new Logger('ThrottlerRedis').error(err.message));
        return { throttlers, storage: new RedisThrottlerStorage(redis) };
      },
    }),
    NotificationsModule,
    OnboardingModule,
    StudentModule,
    TeacherModule,
    StorageModule,
    AdminModule,
    ParentModule,
    PublicModule,
  ],
  providers: [
    DatabaseLifecycle,
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AdminPermissionGuard },
  ],
})
export class AppModule {}
