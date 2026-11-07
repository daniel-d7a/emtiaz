import { forwardRef, Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { TeacherEntitlementsService } from './teacher-entitlements.service';
import { StorageModule } from '../storage/storage.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [forwardRef(() => StorageModule), forwardRef(() => AdminModule)],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherEntitlementsService],
  exports: [TeacherService, TeacherEntitlementsService],
})
export class TeacherModule {}
