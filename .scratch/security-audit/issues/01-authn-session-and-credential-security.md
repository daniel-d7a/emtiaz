# 01: Authentication, Session Management & Credential Security

**Type:** audit
**Status:** claimed
**Blocked by:** None (can start immediately)

## Objective

Audit all authentication mechanisms, session management, credential storage, lockout protections, and password reset workflows across backend and client applications.

## Verification Checklist

1. **Session & Cookie Security**:
   - Verify Better-Auth session cookie configuration: `httpOnly`, `secure` (in production), `sameSite: 'lax'`, and appropriate `maxAge`.
   - Verify `AuthGuard` verifies session against database on every request (ignoring in-memory stale cookie caches so deleted or suspended users are locked out immediately).
   - Verify session revocation on password change, password reset, and user suspension/deletion.
2. **Credential Storage & Password Policies**:
   - Verify password hashing algorithm (Argon2 / Scrypt via Better-Auth) and salt generation.
   - Verify passwords are never logged, serialized, or exposed in API responses or audit metadata (checked by `AuditInterceptor` redaction).
   - Verify `mustChangePassword` enforcement on bulk-created users and admin-reset accounts before accessing protected screens.
3. **Brute Force & Rate Limiting**:
   - Audit `login-lockout.ts`: Verify lockout triggers after `LOGIN_LOCKOUT_MAX` failures within `LOGIN_LOCKOUT_WINDOW_MS` with `429 Too Many Requests`.
   - Verify lockout state is shared via Redis (`REDIS_URL`) or per-process in memory.
   - Verify global IP throttling and Better-Auth rate limits on sign-in and sign-up endpoints.
