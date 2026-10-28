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
import { RequirePermission } from '../../lib/admin-permissions';
import { ZodBodyPipe, SetUserStatusDto, AdminEnrollDto, TaxonomyCreateDto, TaxonomyUpdateDto, NotificationSettingsDto, CreateTeacherDto, UpdateTeacherDto, CreateStudentDto, UpdateStudentDto, AdminMoveStudentDto, CreateParentDto, UpdateParentDto, AdminParentLinkDto, AdminCreateCourseDto, AdminUpdateCourseDto, AdminRoleDto, AdminRoleUpdateDto, AdminRoleAssignDto } from '../../lib/schemas';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MonthlySummaryService } from '../notifications/monthly-summary.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { effectiveAdminPermissions } from './admin-access';

@Controller()
export class AdminController {
  constructor(
    private admin: AdminService,
    private notificationSettings: NotificationSettingsService,
    private notifications: NotificationsService,
    private monthlySummary: MonthlySummaryService,
    private onboarding: OnboardingService,
  ) {}

  @Get('api/admin/permissions')
  @Roles('ADMIN')
  permissions(@Req() req: Request) {
    return effectiveAdminPermissions(req.user!.id);
  }

  @Get('api/admin/overview')
  @Roles('ADMIN')
  @RequirePermission('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('api/admin/teachers')
  @Roles('ADMIN')
  @RequirePermission('teachers', 'courses')
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
  @RequirePermission('teachers')
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
  @RequirePermission('teachers')
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
  @RequirePermission('students', 'parents')
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
  @RequirePermission('students')
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
  @RequirePermission('students')
  profile(@Param('studentId') studentId: string) {
    return this.admin.studentProfile(studentId);
  }

  @Patch('api/admin/students/:studentId')
  @Roles('ADMIN')
  @RequirePermission('students')
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
  @RequirePermission('students')
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
  @RequirePermission('students')
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
  @RequirePermission('parents')
  parents(
    @Query()
    q: {
      status?: 'ACTIVE' | 'SUSPENDED';
      search?: string;
      name?: string;
      phone?: string;
      deleted?: string;
      limit?: string;
    },
  ) {
    return this.admin.listParents(q);
  }

  @Post('api/admin/parents')
  @Roles('ADMIN')
  @RequirePermission('parents')
  async createParent(
    @Req() req: Request,
    @Body(new ZodBodyPipe(CreateParentDto)) dto: z.infer<typeof CreateParentDto>,
  ) {
    const parent = await this.onboarding.createParent(dto);
    await this.admin.audit(req.user!.id, 'parent.create', 'user', parent.id);
    return parent;
  }

  @Get('api/admin/parents/:parentId')
  @Roles('ADMIN')
  @RequirePermission('parents')
  parentProfile(@Param('parentId') parentId: string) {
    return this.admin.parentProfile(parentId);
  }

  @Patch('api/admin/parents/:parentId')
  @Roles('ADMIN')
  @RequirePermission('parents')
  async updateParent(
    @Req() req: Request,
    @Param('parentId') parentId: string,
    @Body(new ZodBodyPipe(UpdateParentDto)) dto: z.infer<typeof UpdateParentDto>,
  ) {
    await this.admin.audit(req.user!.id, 'parent.update', 'user', parentId, dto);
    return this.admin.updateParent(parentId, dto);
  }

  @Post('api/admin/parent-links')
  @Roles('ADMIN')
  @RequirePermission('parents')
  async linkParentChild(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AdminParentLinkDto)) dto: z.infer<typeof AdminParentLinkDto>,
  ) {
    await this.admin.audit(req.user!.id, 'parent.link.create', 'parent_link', dto.studentId, {
      parentId: dto.parentId,
    });
    return this.admin.linkParentChild(dto.parentId, dto.studentId);
  }

  @Get('api/admin/courses')
  @Roles('ADMIN')
  @RequirePermission('courses')
  courses(
    @Query()
    q: {
      name?: string;
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

  @Post('api/admin/courses')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async createCourse(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AdminCreateCourseDto))
    dto: z.infer<typeof AdminCreateCourseDto>,
  ) {
    const course = await this.admin.createCourse(dto);
    await this.admin.audit(req.user!.id, 'course.create', 'course', course.id);
    return course;
  }

  @Patch('api/admin/courses/:courseId')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async updateCourse(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(AdminUpdateCourseDto))
    dto: z.infer<typeof AdminUpdateCourseDto>,
  ) {
    await this.admin.audit(req.user!.id, 'course.update', 'course', courseId, dto);
    return this.admin.updateCourse(courseId, dto);
  }

  @Get('api/admin/groups')
  @Roles('ADMIN')
  @RequirePermission('courses', 'students')
  groups(@Query() q: { deleted?: string; courseId?: string }) {
    return this.admin.listGroups(q);
  }

  @Get('api/admin/parent-links')
  @Roles('ADMIN')
  @RequirePermission('parents')
  parentLinks(@Query() q: { deleted?: string }) {
    return this.admin.listParentLinks(q);
  }

  @Patch('api/admin/users/:userId/status')
  @Roles('ADMIN')
  @RequirePermission('users')
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
  @RequirePermission('users')
  async deleteUser(@Req() req: Request, @Param('userId') userId: string) {
    await this.admin.audit(req.user!.id, 'user.delete', 'user', userId);
    return this.admin.deleteUser(userId);
  }

  @Post('api/admin/users/:userId/restore')
  @Roles('ADMIN')
  @RequirePermission('users')
  async restoreUser(@Req() req: Request, @Param('userId') userId: string) {
    await this.admin.audit(req.user!.id, 'user.restore', 'user', userId);
    return this.admin.restoreUser(userId);
  }

  @Delete('api/admin/courses/:courseId')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async deleteCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    await this.admin.audit(req.user!.id, 'course.delete', 'course', courseId);
    return this.admin.deleteCourse(courseId);
  }

  @Post('api/admin/courses/:courseId/restore')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async restoreCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    await this.admin.audit(req.user!.id, 'course.restore', 'course', courseId);
    return this.admin.restoreCourse(courseId);
  }

  @Delete('api/admin/groups/:groupId')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async deleteGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    await this.admin.audit(req.user!.id, 'group.delete', 'group', groupId);
    return this.admin.deleteGroup(groupId);
  }

  @Post('api/admin/groups/:groupId/restore')
  @Roles('ADMIN')
  @RequirePermission('courses')
  async restoreGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    await this.admin.audit(req.user!.id, 'group.restore', 'group', groupId);
    return this.admin.restoreGroup(groupId);
  }

  @Delete('api/admin/parent-links/:parentId/:studentId')
  @Roles('ADMIN')
  @RequirePermission('parents')
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
  @RequirePermission('parents')
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
  @RequirePermission('students')
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
  @RequirePermission('audit')
  auditLog(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('actor') actor?: string,
    @Query('target') target?: string,
    @Query('actorRole') actorRole?: string,
    @Query('endpoint') endpoint?: string,
    @Query('responseType') responseType?: string,
  ) {
    return this.admin.listAudit(Number(limit) || 100, {
      action,
      actorId,
      actor,
      target,
      actorRole,
      endpoint,
      responseType,
    });
  }

  @Get('api/admin/errors/tail')
  @Roles('ADMIN')
  @RequirePermission('audit')
  errorTail() {
    return this.admin.errorTail();
  }

  @Get('api/admin/roles')
  @Roles('ADMIN')
  @RequirePermission('roles')
  roles() {
    return this.admin.listAdminRoles();
  }

  @Post('api/admin/roles')
  @Roles('ADMIN')
  @RequirePermission('roles')
  async createRole(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AdminRoleDto)) dto: z.infer<typeof AdminRoleDto>,
  ) {
    const role = await this.admin.createAdminRole(dto.name, dto.permissions);
    await this.admin.audit(req.user!.id, 'role.create', 'admin_role', role.id, dto);
    return role;
  }

  @Patch('api/admin/roles/:roleId')
  @Roles('ADMIN')
  @RequirePermission('roles')
  async updateRole(
    @Req() req: Request,
    @Param('roleId') roleId: string,
    @Body(new ZodBodyPipe(AdminRoleUpdateDto)) dto: z.infer<typeof AdminRoleUpdateDto>,
  ) {
    const role = await this.admin.updateAdminRole(roleId, dto);
    await this.admin.audit(req.user!.id, 'role.update', 'admin_role', roleId, dto);
    return role;
  }

  @Get('api/admin/admins')
  @Roles('ADMIN')
  @RequirePermission('roles')
  admins() {
    return this.admin.listAdmins();
  }

  @Patch('api/admin/admins/:userId/role')
  @Roles('ADMIN')
  @RequirePermission('roles')
  async assignAdminRole(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body(new ZodBodyPipe(AdminRoleAssignDto)) dto: z.infer<typeof AdminRoleAssignDto>,
  ) {
    const user = await this.admin.setAdminRole(userId, dto.roleId);
    await this.admin.audit(req.user!.id, 'role.assign', 'user', userId, dto);
    return user;
  }

  @Get('api/admin/notification-settings')
  @Roles('ADMIN')
  @RequirePermission('notifications', 'settings')
  getNotificationSettings() {
    return this.notificationSettings.get();
  }

  @Get('api/admin/notifications')
  @Roles('ADMIN')
  @RequirePermission('notifications')
  recentNotifications(@Query('limit') limit?: string) {
    return this.notifications.recent(Number(limit) || 50);
  }

  @Post('api/admin/notifications/monthly-summary')
  @Roles('ADMIN')
  @RequirePermission('notifications')
  sendMonthlySummary() {
    return this.monthlySummary.run();
  }

  @Patch('api/admin/notification-settings')
  @Roles('ADMIN')
  @RequirePermission('notifications', 'settings')
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
  @RequirePermission('taxonomy')
  createGrade(@Body(new ZodBodyPipe(TaxonomyCreateDto)) dto: z.infer<typeof TaxonomyCreateDto>) {
    return this.admin.createGrade(dto.name, dto.displayOrder);
  }

  @Put('api/admin/taxonomy/grades/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  updateGrade(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(TaxonomyUpdateDto))
    dto: z.infer<typeof TaxonomyUpdateDto>,
  ) {
    return this.admin.updateGrade(id, dto);
  }

  @Delete('api/admin/taxonomy/grades/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  deleteGrade(@Param('id') id: string) {
    return this.admin.deleteGrade(id);
  }

  @Get('api/admin/taxonomy/semesters')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  semesters() {
    return this.admin.listSemesters();
  }

  @Post('api/admin/taxonomy/semesters')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  createSemester(@Body(new ZodBodyPipe(TaxonomyCreateDto)) dto: z.infer<typeof TaxonomyCreateDto>) {
    return this.admin.createSemester(dto.name, dto.displayOrder);
  }

  @Put('api/admin/taxonomy/semesters/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  updateSemester(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(TaxonomyUpdateDto))
    dto: z.infer<typeof TaxonomyUpdateDto>,
  ) {
    return this.admin.updateSemester(id, dto);
  }

  @Delete('api/admin/taxonomy/semesters/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  deleteSemester(@Param('id') id: string) {
    return this.admin.deleteSemester(id);
  }

  @Get('api/admin/taxonomy/categories')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  categories() {
    return this.admin.listCategories();
  }

  @Post('api/admin/taxonomy/categories')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  createCategory(@Body(new ZodBodyPipe(TaxonomyCreateDto)) dto: z.infer<typeof TaxonomyCreateDto>) {
    return this.admin.createCategory(dto.name);
  }

  @Put('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodBodyPipe(z.object({ name: z.string().trim().min(1).max(80) })))
    dto: { name: string },
  ) {
    return this.admin.updateCategory(id, dto.name);
  }

  @Delete('api/admin/taxonomy/categories/:id')
  @Roles('ADMIN')
  @RequirePermission('taxonomy')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }
}
