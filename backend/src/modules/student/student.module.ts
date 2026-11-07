import { forwardRef, Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StorageModule } from '../storage/storage.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [StorageModule, forwardRef(() => AdminModule)],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
