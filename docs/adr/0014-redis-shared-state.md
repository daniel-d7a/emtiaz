# ADR-0014: Optional Redis for shared throttling, lockout, and job locks

Date: 2026-10-26

## Context
The API originally kept rate-limit counters and per-account sign-in lockout in
process memory (ADR-0006). That is correct for one container but lets each
replica have its own limits. The monthly parent summary also needs exactly one
run per month, not one per replica.

## Decision
- `REDIS_URL` is optional. Compose sets it; a bare local API can run without it.
- `RedisThrottlerStorage` implements Nest's `ThrottlerStorage` and stores
  counters under `throttle:<name>:<key>` with a separate `:block` key.
- `RedisLoginLockout` stores failures under `login:fail:<email>` and active
  locks under `login:lock:<email>`, both with TTLs. A successful sign-in deletes
  both keys. Without Redis, the existing in-memory `LoginLockout` is used.
- `MonthlySummaryService` acquires `monthly-summary:<YYYY-M>` with
  `SET monthly-summary:<YYYY-M> 1 PX 25h NX`; only the replica that gets the
  key sends that month's summaries.
- Lockout and summary-lock Redis errors fail open so a Redis outage does not
  block sign-in or notifications. Lockout connection errors are logged by the
  API; the summary lock swallows its own connection errors and proceeds.

## Rationale
- Shared state is the smallest change that makes horizontal scaling correct;
  no new service or queue is needed.
- Keys are short-lived and disposable, so Redis persistence/backups are not
  required.
- Keeping the memory implementation as a fallback preserves the one-command
  local workflow.

## Consequences
- With `REDIS_URL` unset, limits and the monthly lock are per process; run one
  API replica or accept that behaviour.
- Flushing Redis resets counters, active lockouts, and the monthly-summary
  marker. A restarted month could send a duplicate summary; this is acceptable
  for a notification.
- Redis is not backed up. It is infrastructure state, not source of truth.
- The API must be able to reach Redis at startup when `REDIS_URL` is set; errors
  are logged by the `ThrottlerRedis` logger.
