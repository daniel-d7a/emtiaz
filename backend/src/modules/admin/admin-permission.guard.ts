import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ADMIN_PERMISSIONS_KEY, type AdminPermission } from '../../lib/admin-permissions';
import { effectiveAdminPermissions } from './admin-access';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  private reflector = new Reflector();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(ADMIN_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) return false;
    if (user.role !== 'ADMIN') return true;
    const granted = await effectiveAdminPermissions(user.id);
    if (required.some((permission) => granted.includes(permission))) return true;
    throw new ForbiddenException('Admin permission required');
  }
}
