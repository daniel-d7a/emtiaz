import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { StudentService } from './student.service';

@Controller()
export class StudentController {
  constructor(private students: StudentService) {}

  @Get('api/student/groups')
  @Roles('STUDENT')
  myGroups(@Req() req: Request) {
    return this.students.myGroups(req.user!.id);
  }

  @Post('api/student/groups/join')
  @Roles('STUDENT')
  join(
    @Req() req: Request,
    @Body() dto: { joinCode: string },
  ) {
    return this.students.joinByCode(req.user!.id, dto.joinCode);
  }

  @Get('api/student/groups/:groupId/curriculum')
  @Roles('STUDENT')
  curriculum(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.students.curriculum(req.user!.id, groupId);
  }

  @Post('api/student/lessons/:lessonId/complete')
  @Roles('STUDENT')
  complete(@Req() req: Request, @Param('lessonId') lessonId: string) {
    return this.students.markComplete(req.user!.id, lessonId);
  }

  @Post('api/student/lessons/:lessonId/incomplete')
  @Roles('STUDENT')
  incomplete(@Req() req: Request, @Param('lessonId') lessonId: string) {
    return this.students.unmarkComplete(req.user!.id, lessonId);
  }

  @Get('api/student/lessons/:lessonId/quiz')
  @Roles('STUDENT')
  quizByLesson(@Req() req: Request, @Param('lessonId') lessonId: string) {
    return this.students.getQuizByLesson(req.user!.id, lessonId);
  }

  @Get('api/student/quizzes/:quizId')
  @Roles('STUDENT')
  quiz(@Req() req: Request, @Param('quizId') quizId: string) {
    return this.students.getQuiz(req.user!.id, quizId);
  }

  @Post('api/student/quizzes/:quizId/submit')
  @Roles('STUDENT')
  submit(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Body() dto: { groupId: string; answers: Record<string, string> },
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
