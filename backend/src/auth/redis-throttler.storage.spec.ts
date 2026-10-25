import { RedisThrottlerStorage } from './redis-throttler.storage';

function fakeRedis() {
  const counts = new Map<string, number>();
  const blocks = new Map<string, number>();
  return {
    counts,
    blocks,
    pttl: async (key: string) =>
      blocks.has(key) ? blocks.get(key)! : key.endsWith(':block') ? -2 : 60_000,
    incr: async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    pexpire: async () => 1,
    set: async (key: string, _value: string, _mode: string, ms: number) => {
      blocks.set(key, ms);
      return 'OK';
    },
  };
}

describe('RedisThrottlerStorage', () => {
  it('counts hits and blocks past the limit', async () => {
    const redis = fakeRedis();
    const storage = new RedisThrottlerStorage(redis);
    const first = await storage.increment('ip', 60_000, 2, 30_000, 'default');
    expect(first).toMatchObject({ totalHits: 1, isBlocked: false });
    await storage.increment('ip', 60_000, 2, 30_000, 'default');
    const third = await storage.increment('ip', 60_000, 2, 30_000, 'default');
    expect(third).toMatchObject({ totalHits: 3, isBlocked: true, timeToBlockExpire: 30 });
  });

  it('rejects while the block key is live without incrementing', async () => {
    const redis = fakeRedis();
    redis.blocks.set('throttle:default:ip:block', 15_000);
    const storage = new RedisThrottlerStorage(redis);
    const res = await storage.increment('ip', 60_000, 2, 30_000, 'default');
    expect(res).toMatchObject({ isBlocked: true, timeToBlockExpire: 15 });
    expect(redis.counts.get('throttle:default:ip')).toBeUndefined();
  });
});
