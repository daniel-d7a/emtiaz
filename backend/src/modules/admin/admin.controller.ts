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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { ZodBodyPipe, SetUserStatusDto, AdminEnrollDto, TaxonomyCreateDto, TaxonomyUpdateDto, NotificationSettingsDto } from '../../lib/schemas';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MonthlySummaryService } from '../notifications/monthly-summary.service';

@Controller()
export class AdminController {
  constructor(
    private admin: AdminService,
    private notificationSettings: NotificationSettingsService,
    private notifications: NotificationsService,
    private monthlySummary: MonthlySummaryService,
  ) {}

  @Get('api/admin/overview')
  @Roles('ADMIN')
  overview() {
    return this.admin.overview();
  }

  @Get('api/admin/teachers')
  @Roles('ADMIN')
  teachers(
    @Query()
    q: { status?: 'ACTIVE' | 'SUSPENDED'; search?: string; subjectId?: string; limit?: string },
  ) {
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
      limit?: string;
    },
  ) {
    return this.admin.listStudents(q);
  }

  @Get('api/admin/parents')
  @Roles('ADMIN')
  parents(
    @Query() q: { status?: 'ACTIVE' | 'SUSPENDED'; search?: string; limit?: string },
  ) {
    return this.admin.listParents(q);
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
      limit?: string;
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
  async setUserStatus(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body(new ZodBodyPipe(SetUserStatusDto))
    dto: z.infer<typeof SetUserStatusDto>,
  ) {
    await this.admin.audit(req.user!.id, 'user.status', 'user', userId, {
      isActive: dto.isActive,
    });
    return this.admin.setUserStatus(userId, dto.isActive, dto);
  }

  @Delete('api/admin/users/:userId')
  @Roles('ADMIN')
  async deleteUser(@Req() req: Request, @Param('userId') userId: string) {
    await this.admin.audit(req.user!.id, 'user.delete', 'user', userId);
    return this.admin.deleteUser(userId);
  }

  @Post('api/admin/students/:studentId/enroll')
  @Roles('ADMIN')
  async enroll(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Body(new ZodBodyPipe(AdminEnrollDto))
    dto: z.infer<typeof AdminEnrollDto>,
  ) {
    await this.admin.audit(req.user!.id, 'student.enroll', 'group', dto.groupId, {
      studentId,
    });
    return this.admin.adminEnroll(studentId, dto.groupId);
  }

  @Get('api/admin/audit')
  @Roles('ADMIN')
  auditLog(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.admin.listAudit(Number(limit) || 100, { action, actorId });
  }

  @Get('api/admin/notification-settings')
  @Roles('ADMIN')
  getNotificationSettings() {
    return this.notificationSettings.get();
  }

  @Get('api/admin/notifications')
  @Roles('ADMIN')
  recentNotifications(@Query('limit') limit?: string) {
    return this.notifications.recent(Number(limit) || 50);
  }

  @Post('api/admin/notifications/monthly-summary')
  @Roles('ADMIN')
  sendMonthlySummary() {
    return this.monthlySummary.run();
  }

  @Patch('api/admin/notification-settings')
  @Roles('ADMIN')
  async updateNotificationSettings(
    @Req() req: Request,
    @Body(new ZodBodyPipe(NotificationSettingsDto))
    dto: z.infer<typeof NotificationSettingsDto>,
  ) {
    await this.admin.audit(req.user!.id, 'settings.notifications', 'settings', 'global', dto);
    return this.notificationSettings.update(dto);
  }

  // ---------- Taxonomy ----------

  @Get('api/admin/taxonomy/grades')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  grades() {
    return this.admin.listGrades();
  }

  @Post('api/admin/taxonomy/grades')
  @Roles('ADMIN')
  createGrade(@Body(new ZodBodyPipe(TaxonomyCreateDto)) dto: z.infer<typeof TaxonomyCreateDto>) {
    return this.admin.createGrade(dto.name, dto.displayOrder);
  }

  @Put('api/admin/taxonomy/grades/:id')
  @Roles('ADMIN')
  updateGrade(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(TaxonomyUpdateDto))
    dto: z.infer<typeof TaxonomyUpdateDto>,
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
  createCategory(@Body(new ZodBodyPipe(TaxonomyCreateDto)) dto: z.infer<typeof TaxonomyCreateDto>) {
    return this.admin.createCategory(dto.name);
  }

  @Put('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(z.object({ name: z.string().trim().min(1).max(80) })))
    dto: { name: string },
  ) {
    return this.admin.updateCategory(id, dto.name);
  }

  @Delete('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }
}
