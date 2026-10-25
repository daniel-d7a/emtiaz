import { LoginLockout, loginLockoutMiddleware } from './login-lockout';

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
  function run(lock: LoginLockout, status: number) {
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
    loginLockoutMiddleware(lock)(req, res, next);
    return { res, next, finish: () => listeners.finish?.() };
  }

  it('blocks a locked account with 429 and Retry-After', () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    lock.recordFailure('a@example.com');
    const { res, next } = run(lock, 200);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '10');
  });

  it('ignores non sign-in auth requests', () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    lock.recordFailure('a@example.com');
    const listeners: Record<string, () => void> = {};
    const req = { method: 'POST', path: '/sign-up/email', body: { email: 'a@example.com' } } as any;
    const res = { on(event: string, cb: () => void) { listeners[event] = cb; } } as any;
    const next = jest.fn();
    loginLockoutMiddleware(lock)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('records failures and resets on success', () => {
    const lock = new LoginLockout({ max: 1, lockMs: 10_000 });
    const failed = run(lock, 401);
    failed.finish();
    expect(lock.check('a@example.com').locked).toBe(true);

    const other = new LoginLockout({ max: 1, lockMs: 10_000 });
    const ok = run(other, 200);
    ok.finish();
    expect(other.check('a@example.com').locked).toBe(false);
  });
});
