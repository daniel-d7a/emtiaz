import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { Roles } from '../../auth/roles.decorator';
import { ParentLinkDto, ZodBodyPipe } from '../../lib/schemas';
import { ParentService } from './parent.service';

@Controller()
export class ParentController {
  constructor(private readonly parents: ParentService) {}

  @Post('api/parent/link')
  @Roles('PARENT')
  link(@Req() req: Request, @Body(new ZodBodyPipe(ParentLinkDto)) dto: z.infer<typeof ParentLinkDto>) {
    return this.parents.linkByPhone(req.user!.id, dto.phoneNumber);
  }

  @Get('api/parent/students')
  @Roles('PARENT')
  students(@Req() req: Request) {
    return this.parents.myStudents(req.user!.id);
  }

  @Delete('api/parent/students/:studentId')
  @Roles('PARENT')
  unlink(@Req() req: Request, @Param('studentId') studentId: string) {
    return this.parents.unlink(req.user!.id, studentId);
  }

  @Get('api/parent/students/:studentId/groups/:groupId/grades')
  @Roles('PARENT')
  grades(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.parents.grades(req.user!.id, studentId, groupId);
  }
}
