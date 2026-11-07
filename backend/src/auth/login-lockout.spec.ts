import { LoginLockout, RedisLoginLockout, loginLockoutMiddleware } from './login-lockout';

describe('LoginLockout', () => {
  it('locks after N failures and clears on success', () => {
    let now = 0;
    const lock = new LoginLockout({ max: 3, windowMs: 1000, lockMs: 5000, now: () => now });
    lock.recordFailure('A@Example.com');
    lock.recordFailure('a@example.com');
    expect(lock.check('a@example.com').locked).toBe(false);
    lock.recordFailure('a@example.com');
    const locked = lock.check('a@example.com');
    expect(locked.locked).toBe(true);
    expect(locked.retryAfterSec).toBe(5);

    now = 5000;
    expect(lock.check('a@example.com').locked).toBe(false);

    lock.recordFailure('a@example.com');
    lock.reset('a@example.com');
    expect(lock.check('a@example.com').locked).toBe(false);
  });

  it('forgets failures outside the window', () => {
    let now = 0;
    const lock = new LoginLockout({ max: 2, windowMs: 1000, lockMs: 5000, now: () => now });
    lock.recordFailure('a@example.com');
    now = 2000;
    lock.recordFailure('a@example.com');
    expect(lock.check('a@example.com').locked).toBe(false);
  });
});

describe('loginLockoutMiddleware', () => {
  async function run(lock: LoginLockout, status: number) {
    const listeners: Record<string, () => void> = {};
    const req = { method: 'POST', path: '/sign-in/email', body: { email: 'a@example.com' } } as any;
    const res = {
      statusCode: status,
      setHeader: jest.fn(),
      status(code: number) { this.statusCode = code; return this; },
      json: jest.fn(),
      on(event: string, cb: () => void) { listeners[event] = cb; },
    } as any;
    const next = jest.fn();
    await loginLockoutMiddleware(lock)(req, res, next);
    return { res, next, finish: () => listeners.finish?.() };
  }

  it('blocks a locked account with 429 and Retry-After', async () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    lock.recordFailure('a@example.com');
    const { res, next } = await run(lock, 200);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '10');
  });

  it('ignores non sign-in auth requests', async () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    lock.recordFailure('a@example.com');
    const listeners: Record<string, () => void> = {};
    const req = { method: 'POST', path: '/sign-up/email', body: { email: 'a@example.com' } } as any;
    const res = { on(event: string, cb: () => void) { listeners[event] = cb; } } as any;
    const next = jest.fn();
    await loginLockoutMiddleware(lock)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('records failures and resets on success', async () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    const failed = await run(lock, 401);
    failed.finish();
    expect(lock.check('a@example.com').locked).toBe(true);

    const other = new LoginLockout({ max: 1, lockMs: 10_000 });
    const ok = await run(other, 200);
    ok.finish();
    expect(other.check('a@example.com').locked).toBe(false);
  });

  it('locks out phone sign-in attempts on /sign-in/phone-number', async () => {
    const lock = new LoginLockout({ max: 2, lockMs: 10_000 });
    const listeners: Record<string, () => void> = {};
    const req = {
      method: 'POST',
      path: '/sign-in/phone-number',
      body: { phoneNumber: '+96891234567' },
    } as any;
    const res = {
      statusCode: 401,
      setHeader: jest.fn(),
      status(code: number) { this.statusCode = code; return this; },
      json: jest.fn(),
      on(event: string, cb: () => void) { listeners[event] = cb; },
    } as any;
    const next = jest.fn();

    // 1st failure
    await loginLockoutMiddleware(lock)(req, res, next);
    listeners.finish?.();
    expect(lock.check('+96891234567').locked).toBe(false);

    // 2nd failure
    await loginLockoutMiddleware(lock)(req, res, next);
    listeners.finish?.();
    expect(lock.check('+96891234567').locked).toBe(true);

    // 3rd attempt should be blocked with 429
    const blockedRes = {
      statusCode: 200,
      setHeader: jest.fn(),
      status(code: number) { this.statusCode = code; return this; },
      json: jest.fn(),
      on(event: string, cb: () => void) { listeners[event] = cb; },
    } as any;
    const blockedNext = jest.fn();
    await loginLockoutMiddleware(lock)(req, blockedRes, blockedNext);
    expect(blockedNext).not.toHaveBeenCalled();
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.setHeader).toHaveBeenCalledWith('Retry-After', '10');
  });
});

describe('RedisLoginLockout', () => {
  function fakeRedis() {
    const counts = new Map<string, number>();
    const locks = new Map<string, number>();
    return {
      counts,
      locks,
      pttl: async (key: string) => locks.get(key) ?? -2,
      incr: async (key: string) => {
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return next;
      },
      pexpire: async () => 1,
      set: async (key: string, _value: string, _mode: string, ms: number) => {
        locks.set(key, ms);
        return 'OK';
      },
      del: async (key: string) => {
        counts.delete(key);
        locks.delete(key);
        return 1;
      },
    };
  }

  it('locks after N failures and reports the remaining time', async () => {
    const redis = fakeRedis();
    const lock = new RedisLoginLockout(redis, { max: 2, windowMs: 60_000, lockMs: 30_000 });
    await lock.recordFailure('A@Example.com');
    expect((await lock.check('a@example.com')).locked).toBe(false);
    await lock.recordFailure('a@example.com');
    const state = await lock.check('a@example.com');
    expect(state).toEqual({ locked: true, retryAfterSec: 30 });
  });

  it('clears failures on success', async () => {
    const redis = fakeRedis();
    const lock = new RedisLoginLockout(redis, { max: 2, windowMs: 60_000, lockMs: 30_000 });
    await lock.recordFailure('a@example.com');
    await lock.reset('a@example.com');
    expect((await lock.check('a@example.com')).locked).toBe(false);
  });
});
