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
import { ZodBodyPipe, SetUserStatusDto, AdminEnrollDto, TaxonomyCreateDto, TaxonomyUpdateDto, NotificationSettingsDto, CreateTeacherDto, UpdateTeacherDto, CreateStudentDto, UpdateStudentDto, AdminMoveStudentDto } from '../../lib/schemas';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MonthlySummaryService } from '../notifications/monthly-summary.service';
import { OnboardingService } from '../onboarding/onboarding.service';

@Controller()
export class AdminController {
  constructor(
    private admin: AdminService,
    private notificationSettings: NotificationSettingsService,
    private notifications: NotificationsService,
    private monthlySummary: MonthlySummaryService,
    private onboarding: OnboardingService,
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
    q: {
      status?: 'ACTIVE' | 'SUSPENDED';
      search?: string;
      name?: string;
      phone?: string;
      subjectId?: string;
      deleted?: string;
      limit?: string;
    },
  ) {
    return this.admin.listTeachers(q);
  }

  @Post('api/admin/teachers')
  @Roles('ADMIN')
  async createTeacher(
    @Req() req: Request,
    @Body(new ZodBodyPipe(CreateTeacherDto)) dto: z.infer<typeof CreateTeacherDto>,
  ) {
    const teacher = await this.onboarding.createTeacher(dto);
    await this.admin.audit(req.user!.id, 'teacher.create', 'user', teacher.id);
    return teacher;
  }

  @Patch('api/admin/teachers/:teacherId')
  @Roles('ADMIN')
  async updateTeacher(
    @Req() req: Request,
    @Param('teacherId') teacherId: string,
    @Body(new ZodBodyPipe(UpdateTeacherDto)) dto: z.infer<typeof UpdateTeacherDto>,
  ) {
    await this.admin.audit(req.user!.id, 'teacher.update', 'user', teacherId, dto);
    return this.admin.updateTeacher(teacherId, dto);
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
      name?: string;
      phone?: string;
      deleted?: string;
      limit?: string;
    },
  ) {
    return this.admin.listStudents(q);
  }

  @Post('api/admin/students')
  @Roles('ADMIN')
  async createStudent(
    @Req() req: Request,
    @Body(new ZodBodyPipe(CreateStudentDto)) dto: z.infer<typeof CreateStudentDto>,
  ) {
    const student = await this.onboarding.createStudent(dto);
    await this.admin.audit(req.user!.id, 'student.create', 'user', student.id);
    return student;
  }

  @Get('api/admin/students/:studentId')
  @Roles('ADMIN')
  profile(@Param('studentId') studentId: string) {
    return this.admin.studentProfile(studentId);
  }

  @Patch('api/admin/students/:studentId')
  @Roles('ADMIN')
  async updateStudent(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Body(new ZodBodyPipe(UpdateStudentDto)) dto: z.infer<typeof UpdateStudentDto>,
  ) {
    await this.admin.audit(req.user!.id, 'student.update', 'user', studentId, dto);
    return this.admin.updateStudent(studentId, dto);
  }

  @Delete('api/admin/students/:studentId/groups/:groupId')
  @Roles('ADMIN')
  async removeStudentFromGroup(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Param('groupId') groupId: string,
  ) {
    await this.admin.audit(req.user!.id, 'student.group.remove', 'group', groupId, {
      studentId,
    });
    return this.admin.removeStudentFromGroup(studentId, groupId);
  }

  @Patch('api/admin/students/:studentId/groups/:groupId/move')
  @Roles('ADMIN')
  async moveStudentGroup(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(AdminMoveStudentDto))
    dto: z.infer<typeof AdminMoveStudentDto>,
  ) {
    await this.admin.audit(req.user!.id, 'student.group.move', 'group', dto.targetGroupId, {
      studentId,
      fromGroupId: groupId,
    });
    return this.admin.moveStudentGroup(studentId, groupId, dto.targetGroupId);
  }

  @Get('api/admin/parents')
  @Roles('ADMIN')
  parents(
    @Query() q: { status?: 'ACTIVE' | 'SUSPENDED'; search?: string; deleted?: string; limit?: string },
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
      deleted?: string;
      limit?: string;
    },
  ) {
    return this.admin.listCourses(q);
  }

  @Get('api/admin/groups')
  @Roles('ADMIN')
  groups(@Query() q: { deleted?: string; courseId?: string }) {
    return this.admin.listGroups(q);
  }

  @Get('api/admin/parent-links')
  @Roles('ADMIN')
  parentLinks(@Query() q: { deleted?: string }) {
    return this.admin.listParentLinks(q);
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

  @Post('api/admin/users/:userId/restore')
  @Roles('ADMIN')
  async restoreUser(@Req() req: Request, @Param('userId') userId: string) {
    await this.admin.audit(req.user!.id, 'user.restore', 'user', userId);
    return this.admin.restoreUser(userId);
  }

  @Delete('api/admin/courses/:courseId')
  @Roles('ADMIN')
  async deleteCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    await this.admin.audit(req.user!.id, 'course.delete', 'course', courseId);
    return this.admin.deleteCourse(courseId);
  }

  @Post('api/admin/courses/:courseId/restore')
  @Roles('ADMIN')
  async restoreCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    await this.admin.audit(req.user!.id, 'course.restore', 'course', courseId);
    return this.admin.restoreCourse(courseId);
  }

  @Delete('api/admin/groups/:groupId')
  @Roles('ADMIN')
  async deleteGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    await this.admin.audit(req.user!.id, 'group.delete', 'group', groupId);
    return this.admin.deleteGroup(groupId);
  }

  @Post('api/admin/groups/:groupId/restore')
  @Roles('ADMIN')
  async restoreGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    await this.admin.audit(req.user!.id, 'group.restore', 'group', groupId);
    return this.admin.restoreGroup(groupId);
  }

  @Delete('api/admin/parent-links/:parentId/:studentId')
  @Roles('ADMIN')
  async deleteParentLink(
    @Req() req: Request,
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.admin.audit(req.user!.id, 'parent.link.delete', 'parent_link', studentId, {
      parentId,
    });
    return this.admin.deleteParentLink(parentId, studentId);
  }

  @Post('api/admin/parent-links/:parentId/:studentId/restore')
  @Roles('ADMIN')
  async restoreParentLink(
    @Req() req: Request,
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.admin.audit(req.user!.id, 'parent.link.restore', 'parent_link', studentId, {
      parentId,
    });
    return this.admin.restoreParentLink(parentId, studentId);
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
