import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { z } from 'zod';
import { ZodBodyPipe } from '../../lib/schemas';
import {
  AddColumnDto,
  AddGroupDto,
  AddLessonDto,
  AddModuleDto,
  AnnounceDto,
  BulkStudentsDto,
  CreateCourseDto,
  CreateEntryCodeDto,
  CreateHomeworkDto,
  CreateQuizDto,
  GradeHomeworkSubmissionDto,
  GradeQuizAttemptDto,
  GradeCellDto,
  MoveQuizDto,
  IdListDto,
  ReorderModuleItemsDto,
  SearchStudentsDto,
  SetAttendanceDto,
  SetGroupHomeworkAccessDto,
  SetLessonAccessDto,
  ToGroupDto,
  UpdateCourseDto,
  UpdateGroupDto,
  UpdateHomeworkDto,
  UpdateLessonDto,
  UpdateModuleDto,
  UpsertQuizDto,
  RedeemCodeDto,
  RedeemCodeSchema,
} from '../../lib/schemas';
import { TeacherService } from './teacher.service';
import { TeacherEntitlementsService } from './teacher-entitlements.service';

@Controller()
export class TeacherController {
  constructor(
    private teachers: TeacherService,
    private entitlements: TeacherEntitlementsService,
  ) {}

  @Get('api/teacher/entitlements')
  @Roles('TEACHER')
  getEntitlements(@Req() req: Request) {
    return this.entitlements.getEntitlements(req.user!.id);
  }

  @Post('api/teacher/entitlements/redeem-code')
  @Roles('TEACHER')
  redeemCode(
    @Req() req: Request,
    @Body(new ZodBodyPipe(RedeemCodeSchema)) dto: RedeemCodeDto,
  ) {
    return this.entitlements.redeemCode(req.user!.id, dto.code);
  }

  @Post('api/teacher/entitlements/gifts/:id/activate')
  @Roles('TEACHER')
  activateGift(@Req() req: Request, @Param('id') id: string) {
    return this.entitlements.activateSavedGift(req.user!.id, id);
  }

  @Delete('api/teacher/entitlements/gifts/:id')
  @Roles('TEACHER')
  deleteGift(@Req() req: Request, @Param('id') id: string) {
    return this.entitlements.deleteSavedGift(req.user!.id, id);
  }

  // ---------- Courier: courses & curriculum ----------

  @Get('api/teacher/stats')
  @Roles('TEACHER')
  stats(@Req() req: Request) {
    return this.teachers.homeStats(req.user!.id);
  }

  @Get('api/teacher/grades')
  @Roles('TEACHER')
  grades(@Req() req: Request, @Query('country') country?: string) {
    return this.teachers.listGrades(req.user!.id, country);
  }

  @Get('api/teacher/courses')
  @Roles('TEACHER')
  courses(@Req() req: Request) {
    return this.teachers.listCourses(req.user!.id);
  }

  @Post('api/teacher/courses')
  @Roles('TEACHER')
  createCourse(
    @Req() req: Request,
    @Body(new ZodBodyPipe(CreateCourseDto))
    dto: z.infer<typeof CreateCourseDto>,
  ) {
    return this.teachers.createCourse(req.user!.id, dto);
  }

  @Patch('api/teacher/courses/:courseId')
  @Roles('TEACHER')
  updateCourse(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(UpdateCourseDto))
    dto: z.infer<typeof UpdateCourseDto>,
  ) {
    return this.teachers.updateCourse(req.user!, courseId, dto);
  }

  @Get('api/teacher/courses/:courseId/curriculum')
  @Roles('TEACHER')
  curriculum(@Req() req: Request, @Param('courseId') courseId: string) {
    return this.teachers.getCourseCurriculumFor(req.user!, courseId);
  }

  @Post('api/teacher/courses/:courseId/modules')
  @Roles('TEACHER')
  addModule(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(AddModuleDto))
    dto: z.infer<typeof AddModuleDto>,
  ) {
    return this.teachers.addModule(req.user!, courseId, dto.title);
  }

  @Put('api/teacher/courses/:courseId/modules/reorder')
  @Roles('TEACHER')
  reorderModules(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(IdListDto))
    dto: z.infer<typeof IdListDto>,
  ) {
    return this.teachers.reorderModules(req.user!, courseId, dto.moduleIds);
  }

  @Patch('api/teacher/modules/:moduleId')
  @Roles('TEACHER')
  updateModule(
    @Req() req: Request,
    @Param('moduleId') moduleId: string,
    @Body(new ZodBodyPipe(UpdateModuleDto))
    dto: z.infer<typeof UpdateModuleDto>,
  ) {
    return this.teachers.updateModule(req.user!, moduleId, dto);
  }

  @Post('api/teacher/modules/:moduleId/lessons')
  @Roles('TEACHER')
  addLesson(
    @Req() req: Request,
    @Param('moduleId') moduleId: string,
    @Body(new ZodBodyPipe(AddLessonDto))
    dto: z.infer<typeof AddLessonDto>,
  ) {
    return this.teachers.addLesson(req.user!, moduleId, dto);
  }

  @Patch('api/teacher/lessons/:lessonId')
  @Roles('TEACHER')
  updateLesson(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Body(new ZodBodyPipe(UpdateLessonDto))
    dto: z.infer<typeof UpdateLessonDto>,
  ) {
    return this.teachers.updateLesson(req.user!, lessonId, dto);
  }

  @Put('api/teacher/modules/:moduleId/items/reorder')
  @Roles('TEACHER')
  reorderModuleItems(
    @Req() req: Request,
    @Param('moduleId') moduleId: string,
    @Body(new ZodBodyPipe(ReorderModuleItemsDto))
    dto: z.infer<typeof ReorderModuleItemsDto>,
  ) {
    return this.teachers.reorderModuleItems(req.user!, moduleId, dto.items);
  }

  @Delete('api/teacher/modules/:moduleId')
  @Roles('TEACHER')
  deleteModule(@Req() req: Request, @Param('moduleId') moduleId: string) {
    return this.teachers.deleteModule(req.user!, moduleId);
  }

  @Delete('api/teacher/lessons/:lessonId')
  @Roles('TEACHER')
  deleteLesson(@Req() req: Request, @Param('lessonId') lessonId: string) {
    return this.teachers.deleteLesson(req.user!, lessonId);
  }

  // ---------- Homework ----------

  @Post('api/teacher/lessons/:lessonId/homework')
  @Roles('TEACHER')
  createHomework(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Body(new ZodBodyPipe(CreateHomeworkDto))
    dto: z.infer<typeof CreateHomeworkDto>,
  ) {
    return this.teachers.createHomework(req.user!, lessonId, dto);
  }

  @Get('api/teacher/lessons/:lessonId/homework')
  @Roles('TEACHER')
  getLessonHomework(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
  ) {
    return this.teachers.getLessonHomework(req.user!, lessonId);
  }

  @Patch('api/teacher/homework/:id')
  @Roles('TEACHER')
  updateHomework(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodBodyPipe(UpdateHomeworkDto))
    dto: z.infer<typeof UpdateHomeworkDto>,
  ) {
    return this.teachers.updateHomework(req.user!, id, dto);
  }

  @Delete('api/teacher/homework/:id')
  @Roles('TEACHER')
  deleteHomework(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.teachers.deleteHomework(req.user!, id);
  }

  @Put('api/teacher/groups/:groupId/homework/:homeworkId/access')
  @Roles('TEACHER')
  setGroupHomeworkAccess(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('homeworkId') homeworkId: string,
    @Body(new ZodBodyPipe(SetGroupHomeworkAccessDto))
    dto: z.infer<typeof SetGroupHomeworkAccessDto>,
  ) {
    return this.teachers.setGroupHomeworkAccess(req.user!, groupId, homeworkId, dto);
  }

  @Get('api/teacher/groups/:groupId/homework/:homeworkId/submissions')
  @Roles('TEACHER')
  getHomeworkSubmissions(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('homeworkId') homeworkId: string,
  ) {
    return this.teachers.getHomeworkSubmissions(req.user!, groupId, homeworkId);
  }

  @Post('api/teacher/groups/:groupId/homework/:homeworkId/submissions/:studentId/grade')
  @Roles('TEACHER')
  gradeHomeworkSubmission(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('homeworkId') homeworkId: string,
    @Param('studentId') studentId: string,
    @Body(new ZodBodyPipe(GradeHomeworkSubmissionDto))
    dto: z.infer<typeof GradeHomeworkSubmissionDto>,
  ) {
    return this.teachers.gradeHomeworkSubmission(
      req.user!,
      groupId,
      homeworkId,
      studentId,
      dto,
    );
  }

  @Post('api/teacher/lessons/:lessonId/quiz')
  @Roles('TEACHER')
  upsertQuiz(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Body(new ZodBodyPipe(UpsertQuizDto))
    dto: z.infer<typeof UpsertQuizDto>,
  ) {
    return this.teachers.upsertQuiz(req.user!, lessonId, dto);
  }

  @Post('api/teacher/modules/:moduleId/quiz')
  @Roles('TEACHER')
  upsertModuleQuiz(
    @Req() req: Request,
    @Param('moduleId') moduleId: string,
    @Body(new ZodBodyPipe(UpsertQuizDto))
    dto: z.infer<typeof UpsertQuizDto>,
  ) {
    return this.teachers.upsertModuleQuiz(req.user!, moduleId, dto);
  }

  @Post('api/teacher/courses/:courseId/quiz')
  @Roles('TEACHER')
  upsertCourseQuiz(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(UpsertQuizDto))
    dto: z.infer<typeof UpsertQuizDto>,
  ) {
    return this.teachers.upsertCourseQuiz(req.user!, courseId, dto);
  }

  @Post('api/teacher/courses/:courseId/quizzes')
  @Roles('TEACHER')
  createQuiz(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(CreateQuizDto))
    dto: z.infer<typeof CreateQuizDto>,
  ) {
    return this.teachers.createQuiz(req.user!, courseId, dto);
  }

  @Put('api/teacher/quizzes/:quizId')
  @Roles('TEACHER')
  updateQuiz(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Body(new ZodBodyPipe(UpsertQuizDto))
    dto: z.infer<typeof UpsertQuizDto>,
  ) {
    return this.teachers.updateQuiz(req.user!, quizId, dto);
  }

  @Delete('api/teacher/quizzes/:quizId')
  @Roles('TEACHER')
  deleteQuiz(@Req() req: Request, @Param('quizId') quizId: string) {
    return this.teachers.deleteQuiz(req.user!, quizId);
  }

  @Put('api/teacher/quizzes/:quizId/move')
  @Roles('TEACHER')
  moveQuiz(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Body(new ZodBodyPipe(MoveQuizDto)) dto: z.infer<typeof MoveQuizDto>,
  ) {
    return this.teachers.moveQuiz(req.user!, quizId, dto.direction);
  }

  @Get('api/teacher/groups/:groupId/quizzes/:quizId/submissions')
  @Roles('TEACHER')
  quizSubmissions(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.teachers.quizSubmissions(req.user!, groupId, quizId);
  }

  @Put('api/teacher/quiz-attempts/:attemptId/grade')
  @Roles('TEACHER')
  gradeQuizAttempt(
    @Req() req: Request,
    @Param('attemptId') attemptId: string,
    @Body(new ZodBodyPipe(GradeQuizAttemptDto))
    dto: z.infer<typeof GradeQuizAttemptDto>,
  ) {
    return this.teachers.gradeQuizAttempt(req.user!, attemptId, dto.grades);
  }

  // ---------- Groups ----------

  @Post('api/teacher/courses/:courseId/groups')
  @Roles('TEACHER')
  addGroup(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Body(new ZodBodyPipe(AddGroupDto))
    dto: z.infer<typeof AddGroupDto>,
  ) {
    return this.teachers.addGroup(req.user!, courseId, dto);
  }

  @Patch('api/teacher/groups/:groupId')
  @Roles('TEACHER')
  updateGroup(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(UpdateGroupDto))
    dto: z.infer<typeof UpdateGroupDto>,
  ) {
    return this.teachers.updateGroup(req.user!, groupId, dto);
  }

  @Get('api/teacher/groups/:groupId/entry-codes')
  @Roles('TEACHER')
  entryCodes(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.teachers.entryCodes(req.user!, groupId);
  }

  @Post('api/teacher/groups/:groupId/entry-codes')
  @Roles('TEACHER')
  createEntryCode(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(CreateEntryCodeDto))
    dto: z.infer<typeof CreateEntryCodeDto>,
  ) {
    return this.teachers.createEntryCode(req.user!, groupId, dto.maxUses);
  }

  @Get('api/teacher/groups/:groupId/pacing')
  @Roles('TEACHER')
  pacing(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.teachers.groupPacing(req.user!, groupId);
  }

  @Get('api/teacher/groups/:groupId/stats')
  @Roles('TEACHER')
  groupStats(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.teachers.groupStats(req.user!, groupId);
  }

  @Patch('api/teacher/groups/:groupId/lessons/:lessonId/access')
  @Roles('TEACHER')
  setAccess(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('lessonId') lessonId: string,
    @Body(new ZodBodyPipe(SetLessonAccessDto))
    dto: z.infer<typeof SetLessonAccessDto>,
  ) {
    return this.teachers.setLessonAccess(req.user!, groupId, lessonId, dto);
  }

  @Get('api/teacher/groups/:groupId/lessons/:lessonId/attendance')
  @Roles('TEACHER')
  getAttendance(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.teachers.getAttendance(req.user!, groupId, lessonId);
  }

  @Put('api/teacher/groups/:groupId/lessons/:lessonId/attendance')
  @Roles('TEACHER')
  setAttendance(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('lessonId') lessonId: string,
    @Body(new ZodBodyPipe(SetAttendanceDto))
    dto: z.infer<typeof SetAttendanceDto>,
  ) {
    return this.teachers.setAttendance(
      req.user!,
      groupId,
      lessonId,
      dto.records,
    );
  }

  @Patch('api/teacher/groups/:groupId/quizzes/:quizId/visibility')
  @Roles('TEACHER')
  setQuizVisibility(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('quizId') quizId: string,
    @Body(new ZodBodyPipe(z.object({ isHidden: z.boolean() })))
    dto: { isHidden: boolean },
  ) {
    return this.teachers.setQuizVisibility(req.user!, groupId, quizId, dto.isHidden);
  }

  @Get('api/teacher/students/search')
  @Roles('TEACHER')
  searchStudents(
    @Query(new ZodBodyPipe(SearchStudentsDto))
    dto: z.infer<typeof SearchStudentsDto>,
  ) {
    return this.teachers.searchStudents(dto.phone);
  }

  @Get('api/teacher/groups/:groupId/roster')
  @Roles('TEACHER')
  roster(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.teachers.groupRoster(req.user!, groupId);
  }

  @Post('api/teacher/groups/:groupId/announce')
  @Roles('TEACHER')
  announce(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(AnnounceDto))
    dto: z.infer<typeof AnnounceDto>,
  ) {
    return this.teachers.announce(req.user!, groupId, dto.message);
  }

  @Post('api/teacher/groups/:groupId/roster/bulk')
  @Roles('TEACHER')
  bulkAdd(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(BulkStudentsDto))
    dto: z.infer<typeof BulkStudentsDto>,
  ) {
    return this.teachers.bulkAddStudents(req.user!, groupId, dto.students);
  }

  @Post('api/teacher/groups/:groupId/students/:studentId/move')
  @Roles('TEACHER')
  moveStudent(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
    @Body(new ZodBodyPipe(ToGroupDto))
    dto: z.infer<typeof ToGroupDto>,
  ) {
    return this.teachers.moveStudent(
      req.user!,
      studentId,
      groupId,
      dto.toGroupId,
    );
  }

  @Delete('api/teacher/groups/:groupId/students/:studentId')
  @Roles('TEACHER')
  removeStudent(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.teachers.removeStudent(req.user!, groupId, studentId);
  }

  // ---------- Gradebook ----------

  @Get('api/teacher/groups/:groupId/gradebook')
  @Roles('TEACHER')
  gradebook(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.teachers.gradebook(req.user!, groupId);
  }

  @Post('api/teacher/groups/:groupId/gradebook/columns')
  @Roles('TEACHER')
  addColumn(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(AddColumnDto))
    dto: z.infer<typeof AddColumnDto>,
  ) {
    return this.teachers.addGradeColumn(req.user!, groupId, dto);
  }

  @Delete('api/teacher/groups/:groupId/gradebook/columns/:columnId')
  @Roles('TEACHER')
  deleteColumn(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('columnId') columnId: string,
  ) {
    return this.teachers.deleteGradeColumn(req.user!, groupId, columnId);
  }

  @Put('api/teacher/groups/:groupId/gradebook/cell')
  @Roles('TEACHER')
  setCell(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body(new ZodBodyPipe(GradeCellDto))
    dto: z.infer<typeof GradeCellDto>,
  ) {
    return this.teachers.setGradeCell(
      req.user!,
      groupId,
      dto.columnId,
      dto.studentId,
      dto.score,
      dto.note,
    );
  }
}
