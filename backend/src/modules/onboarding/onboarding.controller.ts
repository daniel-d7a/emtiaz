import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { auth } from '../../auth/auth';
import { Public } from '../../auth/auth.guard';
import { OnboardingService } from './onboarding.service';

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
    @Body()
    dto: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
      specialization?: string;
    },
  ) {
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: 'TEACHER',
        phoneNumber: dto.phoneNumber,
        specialization: dto.specialization,
      },
      returnHeaders: true,
    });
    return { user: data.response.user, status: 'ok' };
  }

  @Public()
  @Post('api/onboarding/student')
  async registerStudent(
    @Body()
    dto: {
      name: string;
      password: string;
      phoneNumber: string;
      email?: string;
      gradeId?: string;
    },
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

  @Public()
  @Get('api/health')
  health() {
    return { ok: true };
  }
}
