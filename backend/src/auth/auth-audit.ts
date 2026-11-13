import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { auditLogs, users } from '../db/schema';
import { logger } from '../lib/logger';
import { auth } from './auth';
import { normalizeIdentifier } from './login-lockout';

const ACTIONS = {
  login: { ok: 'auth.login', fail: 'auth.login_failed' },
  register: { ok: 'auth.register', fail: 'auth.register_failed' },
  logout: { ok: 'auth.logout', fail: 'auth.logout_failed' },
} as const;

type AuthKind = keyof typeof ACTIONS;

function authKind(path: string): AuthKind | null {
  if (path.startsWith('/sign-in')) return 'login';
  if (path.startsWith('/sign-up')) return 'register';
  if (path.startsWith('/sign-out')) return 'logout';
  return null;
}

function identifierOf(req: Request): string {
  const body = (req.body ?? {}) as {
    email?: unknown;
    phoneNumber?: unknown;
    phone?: unknown;
  };
  return normalizeIdentifier(body.email ?? body.phoneNumber ?? body.phone);
}

async function findUserId(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  const [user] = identifier.includes('@')
    ? await db.select({ id: users.id }).from(users).where(eq(users.email, identifier)).limit(1)
    : await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phoneNumber, identifier))
        .limit(1);
  return user?.id ?? null;
}

async function findSessionUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user?.id ?? null;
}

/** Audit successful and failed login / register / logout attempts. */
export function authAuditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const kind = authKind(req.path);
    if (req.method !== 'POST' || !kind) return next();

    // Sign-out revokes the session, so resolve its owner before the handler runs.
    const sessionUserId =
      kind === 'logout' ? await findSessionUserId(req).catch(() => null) : null;

    res.on('finish', () => {
      void (async () => {
        try {
          const ok = res.statusCode >= 200 && res.statusCode < 400;
          const actorId =
            sessionUserId ?? (kind === 'logout' ? null : await findUserId(identifierOf(req)));
          if (!actorId) return;
          await db.insert(auditLogs).values({
            actorId,
            action: ok ? ACTIONS[kind].ok : ACTIONS[kind].fail,
            targetType: 'user',
            targetId: actorId,
            endpoint: req.originalUrl.split('?')[0],
            responseType: ok ? 'success' : 'error',
            metadata: {
              httpStatus: res.statusCode,
              ip: req.ip,
              userAgent: req.headers['user-agent'] ?? null,
            },
          });
        } catch (error) {
          logger.warn({ err: error }, 'auth audit write failed');
        }
      })();
    });

    next();
  };
}
