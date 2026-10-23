import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller()
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('api/admin/overview')
  @Roles('ADMIN')
  overview() {
    return this.admin.overview();
  }

  @Get('api/admin/teachers')
  @Roles('ADMIN')
  teachers(@Query() q: { status?: 'ACTIVE' | 'SUSPENDED'; search?: string }) {
    return this.admin.listTeachers(q);
  }

  @Get('api/admin/students')
  @Roles('ADMIN')
  students(
    @Query()
    q: {
      gradeId?: string;
      courseId?: string;
      groupId?: string;
      teacherId?: string;
      search?: string;
    },
  ) {
    return this.admin.listStudents(q);
  }

  @Get('api/admin/courses')
  @Roles('ADMIN')
  courses(
    @Query()
    q: {
      courseType?: 'ACADEMIC' | 'GENERAL';
      gradeId?: string;
      categoryId?: string;
      teacherId?: string;
    },
  ) {
    return this.admin.listCourses(q);
  }

  @Get('api/admin/groups')
  @Roles('ADMIN')
  async groups() {
    const courses = await this.admin.listCourses({});
    return courses.flatMap((c) => c.groups);
  }

  @Patch('api/admin/users/:userId/status')
  @Roles('ADMIN')
  setUserStatus(
    @Param('userId') userId: string,
    @Body() dto: { isActive: boolean; revokeSessions?: boolean },
  ) {
    return this.admin.setUserStatus(userId, dto.isActive, dto);
  }

  @Post('api/admin/students/:studentId/enroll')
  @Roles('ADMIN')
  enroll(
    @Param('studentId') studentId: string,
    @Body() dto: { groupId: string },
  ) {
    return this.admin.adminEnroll(studentId, dto.groupId);
  }

  // ---------- Taxonomy ----------

  @Get('api/admin/taxonomy/grades')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  grades() {
    return this.admin.listGrades();
  }

  @Post('api/admin/taxonomy/grades')
  @Roles('ADMIN')
  createGrade(@Body() dto: { name: string; displayOrder?: number }) {
    return this.admin.createGrade(dto.name, dto.displayOrder);
  }

  @Put('api/admin/taxonomy/grades/:id')
  @Roles('ADMIN')
  updateGrade(
    @Param('id') id: string,
    @Body() dto: { name?: string; displayOrder?: number },
  ) {
    return this.admin.updateGrade(id, dto);
  }

  @Delete('api/admin/taxonomy/grades/:id')
  @Roles('ADMIN')
  deleteGrade(@Param('id') id: string) {
    return this.admin.deleteGrade(id);
  }

  @Get('api/admin/taxonomy/categories')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  categories() {
    return this.admin.listCategories();
  }

  @Post('api/admin/taxonomy/categories')
  @Roles('ADMIN')
  createCategory(@Body() dto: { name: string }) {
    return this.admin.createCategory(dto.name);
  }

  @Put('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  updateCategory(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.admin.updateCategory(id, dto.name);
  }

  @Delete('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }
}
