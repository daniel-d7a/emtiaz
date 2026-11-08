import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import { auth } from '../../auth/auth';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { OnboardingService } from './onboarding.service';
import { ZodBodyPipe, CheckAvailabilityDto, TeacherSignupDto, StudentSignupDto, ParentSignupDto, UpdateMeDto, ChangePasswordDto, JoinEntryDto } from '../../lib/schemas';
import { toWebHeaders } from '../../auth/web-headers';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { ParentService } from '../parent/parent.service';

@Controller()
export class OnboardingController {
  constructor(
    private onboarding: OnboardingService,
    private parents: ParentService,
  ) {}

  /** Authenticated students join a group by code (past signup). */
  @Roles('STUDENT')
  @Post('api/onboarding/join/:joinCode')
  async join(
    @Param('joinCode') joinCode: string,
    @Req() req: Request,
    @Body(new ZodBodyPipe(JoinEntryDto)) dto: z.infer<typeof JoinEntryDto>,
  ) {
    // @ts-expect-error user attached by guard
    return this.onboarding.joinByCode(req.user.id, joinCode, dto.entryCode);
  }
  @Public()
  @Post('api/onboarding/check-availability')
  async checkAvailability(
    @Body(new ZodBodyPipe(CheckAvailabilityDto))
    dto: z.infer<typeof CheckAvailabilityDto>,
  ) {
    return this.onboarding.checkAvailability(dto);
  }

  @Public()
  @Post('api/onboarding/teacher')
  async registerTeacher(
    @Body(new ZodBodyPipe(TeacherSignupDto))
    dto: z.infer<typeof TeacherSignupDto>,
  ) {
    const user = await this.onboarding.createTeacher(dto);
    return { user, status: 'ok' };
  }

  @Public()
  @Post('api/onboarding/student')
  async registerStudent(
    @Body(new ZodBodyPipe(StudentSignupDto))
    dto: z.infer<typeof StudentSignupDto>,
  ) {
    const user = await this.onboarding.createStudent(dto);
    return { user, status: 'ok' };
  }

  @Public()
  @Post('api/onboarding/parent')
  async registerParent(
    @Body(new ZodBodyPipe(ParentSignupDto))
    dto: z.infer<typeof ParentSignupDto>,
  ) {
    const user = await this.onboarding.createParent(dto);
    return { user, status: 'ok' };
  }

  @Get('api/me')
  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
  meGet(@Req() req: Request) {
    return this.onboarding.me(req.user!.id);
  }

  @Patch('api/me')
  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
  me(
    @Req() req: Request,
    @Body(new ZodBodyPipe(UpdateMeDto)) dto: z.infer<typeof UpdateMeDto>,
  ) {
    return this.onboarding.updateMe(req.user!.id, dto);
  }

  @Post('api/me/change-password')
  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
  async changePassword(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodBodyPipe(ChangePasswordDto)) dto: z.infer<typeof ChangePasswordDto>,
  ) {
    const result = await this.onboarding.changePassword(
      req.user!.id,
      dto,
      toWebHeaders(req.headers),
    );
    const cookies = result.headers?.getSetCookie?.() ?? result.headers?.get('set-cookie');
    if (cookies) {
      res.setHeader('set-cookie', cookies);
    }
    return { ok: true };
  }

  /** Redirects to a fresh signed URL for the caller's avatar. */
  @Get('api/me/avatar')
  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
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
  @Get('api/onboarding/categories')
  listOnboardingCategories() {
    return this.onboarding.listCategories();
  }

  @Public()
  @Get('api/onboarding/grades')
  listOnboardingGrades(@Query('country') country?: string) {
    return this.onboarding.listGrades(country);
  }

  @Public()
  @Get('api/public/grades')
  listPublicGrades(@Query('country') country?: string) {
    return this.onboarding.listGrades(country);
  }

  @Public()
  @Get('api/health')
  async health() {
    try {
      await db.execute(sql`select 1`);
      return { ok: true, db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: 'down' });
    }
  }
}
