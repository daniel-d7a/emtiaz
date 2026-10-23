import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from './auth';
import { ROLES_KEY, type Role } from './roles.decorator';
import type { Request } from 'express';

type AuthSession = { session: Record<string, any>; user: { id: string; role: string; isActive: boolean } & Record<string, any> } | null;

declare module 'express' {
  interface Request {
    user?: { id: string; role: string; isActive: boolean } & Record<string, any>;
    session?: Record<string, any>;
  }
}

export function toWebHeaders(headers: Request['headers']): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) h.append(key, v);
  }
  return h;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  private reflector = new Reflector();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();

    const session: AuthSession = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (session) {
      if (!session.user.isActive) {
        throw new ForbiddenException('Account suspended');
      }
      request.user = session.user;
      request.session = session.session;
      return true;
    }

    if (isPublic) return true;
    throw new ForbiddenException();
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  private reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])) {
      return true;
    }
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) return false;
    return required.includes(user.role as Role);
  }
}
