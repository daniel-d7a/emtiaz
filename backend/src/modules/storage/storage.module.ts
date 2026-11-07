import { forwardRef, Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
  imports: [forwardRef(() => TeacherModule)],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
