import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { StorageModule } from '../storage/storage.module';
import { ParentModule } from '../parent/parent.module';

@Module({
  imports: [StorageModule, ParentModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
