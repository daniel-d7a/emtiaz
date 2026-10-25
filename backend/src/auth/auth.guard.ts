import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from './auth';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { toWebHeaders } from './web-headers';

type AuthSession =
  | {
      session: Record<string, any>;
      user: { id: string; role: string; isActive: boolean } & Record<string, any>;
    }
  | null;

@Injectable()
export class AuthGuard implements CanActivate {
  private reflector = new Reflector();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();

    // cookieCache trusts the signed cookie for up to 5 min even if the
    // session row is gone or the user was suspended — always verify fresh.
    const session: AuthSession = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
      query: { disableCookieCache: true },
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
