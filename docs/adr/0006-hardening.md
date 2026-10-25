# ADR-0006: Baseline HTTP hardening (Helmet, IP throttling, auth rate limits)

Date: 2026-10-25

## Decision
- `helmet()` on all responses (API only, default headers).
- `@nestjs/throttler` global guard: 300 requests/min per IP, skipped under
  `NODE_ENV=test` so suites are not throttled.
- Better Auth rate limiting: 100/min general, 10/min on
  `/sign-in/email`, `/sign-up/email`, `/sign-in/phone-number`.
- `trust proxy` enabled so the client IP is the forwarded one behind Caddy.

## Rationale
- Credential endpoints are the highest-value attack surface (password
  spraying); the built-in Better Auth limiter covers them without custom code.
- A coarse global limit is enough to stop accidental loops and casual abuse
  while staying invisible for real classroom traffic.
- `trust proxy` is required, otherwise every dockerised request looks like it
  comes from the proxy container and one user could throttle everyone.

## Consequences
- Rate-limit state is in-memory per API instance: fine for one container,
  needs Redis (`@nestjs/throttler` storage) before horizontal scaling.
- Per-account lockout (N failures for a given email) is *not* implemented yet;
  the per-IP limits make spraying slow but a distributed attack could still
  target one account. Add a failure counter + temporary lock when it matters.
- 300/min is a starting value; revisit after real usage data.
