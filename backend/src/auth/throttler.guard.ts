import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Global rate limit, disabled under Jest so test suites are not throttled. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return process.env.NODE_ENV === 'test';
  }
}
