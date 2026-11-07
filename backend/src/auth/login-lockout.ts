import type { NextFunction, Request, Response } from 'express';
import { normalizePhone } from '../lib/phone';

type Attempt = { count: number; firstAt: number; lockedUntil: number };
type LockState = { locked: boolean; retryAfterSec: number };

export type LockoutStore = {
  check(email: string): LockState | Promise<LockState>;
  recordFailure(email: string): void | Promise<void>;
  reset(email: string): void | Promise<void>;
};

type RedisLike = {
  pttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  set(key: string, value: string, mode: 'PX', ms: number): Promise<unknown>;
  del(key: string): Promise<number>;
};

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Per-account failed-sign-in lockout. */
// ponytail: in-memory map is per instance; main.ts uses RedisLoginLockout when REDIS_URL is set
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

  check(key: string): LockState {
    const norm = normalizeIdentifier(key);
    const a = this.attempts.get(norm);
    if (!a) return { locked: false, retryAfterSec: 0 };
    if (a.lockedUntil > this.now()) {
      return { locked: true, retryAfterSec: Math.ceil((a.lockedUntil - this.now()) / 1000) };
    }
    if (a.lockedUntil && a.lockedUntil <= this.now()) this.attempts.delete(norm);
    return { locked: false, retryAfterSec: 0 };
  }

  recordFailure(key: string): void {
    const norm = normalizeIdentifier(key);
    const now = this.now();
    const a = this.attempts.get(norm);
    if (!a || now - a.firstAt > this.windowMs) {
      this.attempts.set(norm, {
        count: 1,
        firstAt: now,
        lockedUntil: this.max <= 1 ? now + this.lockMs : 0,
      });
      return;
    }
    a.count += 1;
    if (a.count >= this.max) a.lockedUntil = now + this.lockMs;
  }

  reset(key: string): void {
    this.attempts.delete(normalizeIdentifier(key));
  }
}

/** Redis-backed lockout so limits hold across API replicas. */
export class RedisLoginLockout {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly lockMs: number;

  constructor(
    private readonly redis: RedisLike,
    opts: { max?: number; windowMs?: number; lockMs?: number } = {},
  ) {
    this.max = opts.max ?? envInt('LOGIN_LOCKOUT_MAX', 5);
    this.windowMs = opts.windowMs ?? envInt('LOGIN_LOCKOUT_WINDOW_MS', 15 * 60_000);
    this.lockMs = opts.lockMs ?? envInt('LOGIN_LOCKOUT_MS', 15 * 60_000);
  }

  async check(email: string): Promise<LockState> {
    const ttl = await this.redis.pttl(this.lockKey(email));
    return ttl > 0
      ? { locked: true, retryAfterSec: Math.ceil(ttl / 1000) }
      : { locked: false, retryAfterSec: 0 };
  }

  async recordFailure(email: string): Promise<void> {
    const key = this.failKey(email);
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.pexpire(key, this.windowMs);
    if (count >= this.max) {
      await this.redis.set(this.lockKey(email), '1', 'PX', this.lockMs);
      await this.redis.del(key);
    }
  }

  async reset(email: string): Promise<void> {
    await this.redis.del(this.failKey(email));
    await this.redis.del(this.lockKey(email));
  }

  private failKey(key: string) {
    return `login:fail:${normalizeIdentifier(key)}`;
  }

  private lockKey(key: string) {
    return `login:lock:${normalizeIdentifier(key)}`;
  }
}

export const normalizeIdentifier = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const phone = normalizePhone(trimmed);
  return phone || trimmed.toLowerCase();
};

export const normalizeEmail = normalizeIdentifier;

/** Express middleware: reject locked accounts and record the outcome of each attempt. */
export function loginLockoutMiddleware(lockout: LockoutStore) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !req.path.startsWith('/sign-in')) return next();
    const body = req.body as { email?: unknown; phoneNumber?: unknown; phone?: unknown } | undefined;
    const identifier = normalizeIdentifier(body?.email ?? body?.phoneNumber ?? body?.phone);
    if (!identifier) return next();

    let state: LockState;
    try {
      state = await lockout.check(identifier);
    } catch {
      return next(); // Redis down: keep serving, IP throttling still applies
    }
    if (state.locked) {
      res.setHeader('Retry-After', String(state.retryAfterSec));
      return res.status(429).json({ message: 'Too many failed sign-in attempts. Try again later.' });
    }

    res.on('finish', () => {
      const action =
        res.statusCode >= 400
          ? lockout.recordFailure(identifier)
          : res.statusCode < 300
            ? lockout.reset(identifier)
            : undefined;
      Promise.resolve(action).catch(() => {});
    });
    next();
  };
}
