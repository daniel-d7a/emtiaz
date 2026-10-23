import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, RolesGuard } from './auth/auth.guard';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
