import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { ZodBodyPipe, QuizSubmitDto, JoinGroupDto, SubmitHomeworkDto } from '../../lib/schemas';
import { z } from 'zod';
import { StudentService } from './student.service';

@Controller()
export class StudentController {
  constructor(private students: StudentService) {}

  @Get('api/student/home')
  @Roles('STUDENT')
  home(@Req() req: Request) {
    return this.students.home(req.user!.id);
  }

  @Get('api/student/groups')
  @Roles('STUDENT')
  myGroups(@Req() req: Request) {
    return this.students.myGroups(req.user!.id);
  }

  @Post('api/student/groups/join')
  @Roles('STUDENT')
  join(
    @Req() req: Request,
    @Body(new ZodBodyPipe(JoinGroupDto)) dto: z.infer<typeof JoinGroupDto>,
  ) {
    return this.students.joinByCode(req.user!.id, dto.joinCode, dto.entryCode);
  }

  @Get('api/student/groups/:groupId/curriculum')
  @Roles('STUDENT')
  curriculum(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.students.curriculum(req.user!.id, groupId);
  }

  @Post('api/student/lessons/:lessonId/complete')
  @Roles('STUDENT')
  complete(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.students.markComplete(req.user!.id, lessonId, groupId);
  }

  @Post('api/student/lessons/:lessonId/incomplete')
  @Roles('STUDENT')
  incomplete(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.students.unmarkComplete(req.user!.id, lessonId, groupId);
  }

  @Get('api/student/lessons/:lessonId/quiz')
  @Roles('STUDENT')
  quizByLesson(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.students.getQuizByLesson(req.user!.id, lessonId, groupId);
  }

  @Get('api/student/lessons/:lessonId/view')
  @Roles('STUDENT')
  lessonView(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.students.getLesson(req.user!.id, lessonId, groupId);
  }

  @Get('api/student/groups/:groupId/lessons/:lessonId/homework')
  @Roles('STUDENT')
  lessonHomework(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.students.getLessonHomework(req.user!.id, groupId, lessonId);
  }

  @Post('api/student/groups/:groupId/homework/:homeworkId/submit')
  @Roles('STUDENT')
  submitHomework(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('homeworkId') homeworkId: string,
    @Body(new ZodBodyPipe(SubmitHomeworkDto)) dto: z.infer<typeof SubmitHomeworkDto>,
  ) {
    return this.students.submitHomework(req.user!.id, groupId, homeworkId, dto);
  }

  @Get('api/student/quizzes/:quizId')
  @Roles('STUDENT')
  quiz(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.students.getQuiz(req.user!.id, quizId, groupId);
  }

  @Get('api/student/groups/:groupId/quizzes/:quizId')
  @Roles('STUDENT')
  groupQuiz(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.students.getGroupQuiz(req.user!.id, groupId, quizId);
  }

  @Post('api/student/quizzes/:quizId/submit')
  @Roles('STUDENT')
  submit(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Body(new ZodBodyPipe(QuizSubmitDto))
    dto: z.infer<typeof QuizSubmitDto>,
  ) {
    return this.students.submitQuiz(
      req.user!.id,
      quizId,
      dto.groupId,
      dto.answers,
    );
  }

  @Get('api/student/groups/:groupId/grades')
  @Roles('STUDENT')
  grades(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.students.myGrades(req.user!.id, groupId);
  }
}
