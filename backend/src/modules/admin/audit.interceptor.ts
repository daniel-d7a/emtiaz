import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, from, mergeMap, throwError, type Observable } from 'rxjs';
import type { Request } from 'express';
import { AdminService } from './admin.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE = /password|token|secret|authorization|cookie|api[-_]?key/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth limit]';
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE.test(key) ? '[redacted]' : sanitize(item, depth + 1),
    ]),
  );
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly admin: AdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user?.id || !MUTATING.has(req.method)) return next.handle();
    const res = context.switchToHttp().getResponse();
    const endpoint = req.route?.path ?? req.path;
    const action = `${req.method} ${endpoint}`;
    const write = (responseType: 'success' | 'error', httpStatus: number) =>
      this.admin.audit(
        req.user!.id,
        action,
        'endpoint',
        null,
        {
          httpStatus,
          query: sanitize(req.query),
          body: sanitize(req.body),
        },
        { endpoint, responseType },
      );
    return next.handle().pipe(
      mergeMap(async (value) => {
        await write('success', res.statusCode);
        return value;
      }),
      catchError((error) =>
        from(write('error', error?.status ?? 500)).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }
}
