import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { TeacherEntitlementsService } from '../modules/teacher/teacher-entitlements.service';

@Injectable()
export class TeacherEntitlementsGuard implements CanActivate {
  constructor(private readonly entitlementsService: TeacherEntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;

    // Only teachers can be locked out; student, parent, admin, and public routes are never blocked
    if (!user || user.role !== 'TEACHER') {
      return true;
    }

    // Only mutations are blocked by Upgrade Gate; GET requests are permitted
    const method = req.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const path = req.path || req.url;

    // Exempt endpoints:
    // 1. Profile updates (e.g. /api/me)
    // 2. Auth routes
    // 3. Entitlements routes (including code redemption and gifts management)
    if (
      path.startsWith('/api/me') ||
      path.startsWith('/api/auth') ||
      path.startsWith('/api/teacher/entitlements')
    ) {
      return true;
    }

    // Only teacher workspace and storage mutation routes are gated
    if (!path.startsWith('/api/teacher') && !path.startsWith('/api/storage')) {
      return true;
    }

    const entitlements = await this.entitlementsService.getEntitlements(user.id);
    if (entitlements.isLockedOut) {
      throw new HttpException(
        {
          error: 'UPGRADE_GATE_LOCKED',
          message:
            'Your subscription has expired and your usage exceeds Free plan limits. Please upgrade to continue.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
