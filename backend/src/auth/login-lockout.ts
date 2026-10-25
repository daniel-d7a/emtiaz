import type { NextFunction, Request, Response } from 'express';

type Attempt = { count: number; firstAt: number; lockedUntil: number };

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Per-account failed-sign-in lockout. */
// ponytail: in-memory map is per instance; move to Redis when running more than one API replica
export class LoginLockout {
  private readonly attempts = new Map<string, Attempt>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly lockMs: number;
  private readonly now: () => number;

  constructor(opts: { max?: number; windowMs?: number; lockMs?: number; now?: () => number } = {}) {
    this.max = opts.max ?? envInt('LOGIN_LOCKOUT_MAX', 5);
    this.windowMs = opts.windowMs ?? envInt('LOGIN_LOCKOUT_WINDOW_MS', 15 * 60_000);
    this.lockMs = opts.lockMs ?? envInt('LOGIN_LOCKOUT_MS', 15 * 60_000);
    this.now = opts.now ?? Date.now;
  }

  check(email: string): { locked: boolean; retryAfterSec: number } {
    const key = normalizeEmail(email);
    const a = this.attempts.get(key);
    if (!a) return { locked: false, retryAfterSec: 0 };
    if (a.lockedUntil > this.now()) {
      return { locked: true, retryAfterSec: Math.ceil((a.lockedUntil - this.now()) / 1000) };
    }
    if (a.lockedUntil && a.lockedUntil <= this.now()) this.attempts.delete(key);
    return { locked: false, retryAfterSec: 0 };
  }

  recordFailure(email: string): void {
    const key = normalizeEmail(email);
    const now = this.now();
    const a = this.attempts.get(key);
    if (!a || now - a.firstAt > this.windowMs) {
      this.attempts.set(key, {
        count: 1,
        firstAt: now,
        lockedUntil: this.max <= 1 ? now + this.lockMs : 0,
      });
      return;
    }
    a.count += 1;
    if (a.count >= this.max) a.lockedUntil = now + this.lockMs;
  }

  reset(email: string): void {
    this.attempts.delete(normalizeEmail(email));
  }
}

export const normalizeEmail = (email: unknown) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

/** Express middleware: reject locked accounts and record the outcome of each attempt. */
export function loginLockoutMiddleware(lockout: LoginLockout) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !req.path.startsWith('/sign-in')) return next();
    const email = normalizeEmail((req.body as { email?: unknown } | undefined)?.email);
    if (!email) return next();

    const state = lockout.check(email);
    if (state.locked) {
      res.setHeader('Retry-After', String(state.retryAfterSec));
      return res.status(429).json({ message: 'Too many failed sign-in attempts. Try again later.' });
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) lockout.recordFailure(email);
      else if (res.statusCode < 300) lockout.reset(email);
    });
    next();
  };
}
