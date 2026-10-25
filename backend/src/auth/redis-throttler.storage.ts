import type { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

type RedisLike = {
  pttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  set(key: string, value: string, mode: 'PX', ms: number): Promise<unknown>;
};

/** Shared throttle counters so limits hold across API replicas. */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisLike) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const counter = `throttle:${throttlerName}:${key}`;
    const block = `${counter}:block`;
    const blockedFor = await this.redis.pttl(block);
    if (blockedFor > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockedFor / 1000),
      };
    }

    const totalHits = await this.redis.incr(counter);
    if (totalHits === 1) await this.redis.pexpire(counter, ttl);
    const remaining = await this.redis.pttl(counter);

    let isBlocked = false;
    let timeToBlockExpire = 0;
    if (totalHits > limit && blockDuration > 0) {
      await this.redis.set(block, '1', 'PX', blockDuration);
      isBlocked = true;
      timeToBlockExpire = Math.ceil(blockDuration / 1000);
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(Math.max(remaining, 0) / 1000),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
