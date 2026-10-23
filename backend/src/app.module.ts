import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, RolesGuard } from './auth/auth.guard';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { StudentModule } from './modules/student/student.module';

@Module({
  imports: [OnboardingModule, StudentModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
