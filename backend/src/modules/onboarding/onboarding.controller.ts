import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import { auth } from '../../auth/auth';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { OnboardingService } from './onboarding.service';
import { ZodBodyPipe, TeacherSignupDto, StudentSignupDto, UpdateMeDto } from '../../lib/schemas';
import { z } from 'zod';

const syntheticPhoneEmail = (phone: string) =>
  `${phone.replace(/[^\d]/g, '')}@phone.emtiaz.om`;

@Controller()
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  /** Authenticated students join a group by code (past signup). */
  @Post('api/onboarding/join/:joinCode')
  async join(@Param('joinCode') joinCode: string, @Req() req: Request) {
    // @ts-expect-error user attached by guard
    return this.onboarding.joinByCode(req.user.id, joinCode);
  }
  @Public()
  @Post('api/onboarding/teacher')
  async registerTeacher(
    @Body(new ZodBodyPipe(TeacherSignupDto))
    dto: z.infer<typeof TeacherSignupDto>,
  ) {
    const subjectCategoryId = (await this.onboarding.ensureCategory(dto.subject)).id;
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: 'TEACHER',
        phoneNumber: dto.phoneNumber,
        subjectCategoryId,
      },
      returnHeaders: true,
    });
    return { user: data.response.user, status: 'ok' };
  }

  @Public()
  @Post('api/onboarding/student')
  async registerStudent(
    @Body(new ZodBodyPipe(StudentSignupDto))
    dto: z.infer<typeof StudentSignupDto>,
  ) {
    const email = dto.email?.trim()
      ? dto.email.trim().toLowerCase()
      : syntheticPhoneEmail(dto.phoneNumber);
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email,
        password: dto.password,
        role: 'STUDENT',
        phoneNumber: dto.phoneNumber,
        gradeId: dto.gradeId,
      },
      returnHeaders: true,
    });
    return { user: data.response.user, status: 'ok' };
  }

  @Patch('api/me')
  @Roles('TEACHER', 'STUDENT', 'ADMIN')
  me(
    @Req() req: Request,
    @Body(new ZodBodyPipe(UpdateMeDto)) dto: z.infer<typeof UpdateMeDto>,
  ) {
    return this.onboarding.updateMe(req.user!.id, dto);
  }

  /** Redirects to a fresh signed URL for the caller's avatar. */
  @Get('api/me/avatar')
  @Roles('TEACHER', 'STUDENT', 'ADMIN')
  async avatar(@Req() req: Request, @Res() res: Response) {
    const url = await this.onboarding.avatarUrl(req.user!.id);
    if (!url) throw new NotFoundException('No avatar');
    res.redirect(302, url);
  }

  /** Public subject list for signup dropdowns & grouping filters. */
  @Public()
  @Get('api/categories')
  listCategories() {
    return this.onboarding.listCategories();
  }

  @Public()
  @Get('api/health')
  health() {
    return { ok: true };
  }
}
