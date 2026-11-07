# 01: Authentication, Session Management & Credential Security

**Type:** audit
**Status:** resolved
**Blocked by:** None (can start immediately)

## Objective

Audit all authentication mechanisms, session management, credential storage, lockout protections, and password reset workflows across backend and client applications.

---

## Executive Summary

A comprehensive source code security audit of the authentication, session lifecycle, credential storage, password workflows, and rate-limiting subsystems in Emtiaz LMS was conducted. 

Key defensive guarantees were verified:
- Robust multi-layered throttling (global NestJS IP rate limiting, Better-Auth endpoint throttling, and account-level brute force lockout).
- Direct PostgreSQL database session re-validation in `AuthGuard` via `disableCookieCache: true`, preventing cached-token bypass when users are suspended or soft-deleted.
- Strong password hashing using `scrypt` with cryptographically secure salts.
- Strict payload sanitization in `AuditInterceptor`, `Pino` logger redactions, and explicit whitelist serializers preventing credential leakage.

However, multiple notable security vulnerabilities and architectural gaps were identified around session revocation upon credential reset, lack of backend enforcement for the `mustChangePassword` flag, and non-cryptographic temporary password generation.

---

## Detailed Audit Findings

### 1. Session & Cookie Security

#### 1.1 Better-Auth Cookie Attributes
- **Configuration Path**: `backend/src/auth/auth.ts` (lines 42–49) and Better-Auth default cookie options (`better-auth/dist/cookies/index.mjs:20–46`).
- **Attributes Verified**:
  - `httpOnly: true`: Defaulted for session cookies, mitigating client-side script access (XSS token theft).
  - `sameSite: "lax"`: Defaulted, mitigating cross-site request forgery (CSRF) on top-level navigations and API calls.
  - `secure`: Automatically set to `true` with `__Secure-` cookie prefix when `NODE_ENV === 'production'` or when `BETTER_AUTH_URL` uses `https://`.
  - `path: "/"`: Standard root cookie path.
  - `maxAge`: Configured to `60 * 60 * 24 * 30` (30 days) in `backend/src/auth/auth.ts:43`, with periodic session rolling via `updateAge: 60 * 60 * 24` (24 hours).
  - `cookieCache.maxAge`: Configured to 300 seconds (5 minutes) in `backend/src/auth/auth.ts:47`.

#### 1.2 `AuthGuard` Database Re-validation vs. Cookie Cache
- **Guaranteed Behavior**:
  - In `backend/src/auth/auth.guard.ts` (lines 31–36), `AuthGuard` explicitly queries Better-Auth with:
    ```typescript
    const session: AuthSession = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
      query: { disableCookieCache: true },
    });
    ```
  - Better-Auth evaluates `!ctx.query?.disableCookieCache` before using client-signed session cookies. By passing `disableCookieCache: true`, every incoming guarded request bypasses the 5-minute cookie cache and validates against the PostgreSQL `session` table directly.
  - Line 39–41: If `!session.user.isActive`, `AuthGuard` throws `ForbiddenException('Account suspended')`.
  - Deletion of a session in PostgreSQL immediately terminates API access on the next request.

#### 1.3 Session Revocation Workflows
- **User Suspension (`setUserStatus`)**:
  - `backend/src/modules/admin/admin.service.ts:418–421`: When `isActive` is set to `false`, the service executes:
    `DELETE FROM session WHERE user_id = ${userId}`.
    *Status*: **Confirmed secure**.
- **User Soft Deletion (`deleteUser`)**:
  - `backend/src/modules/admin/admin.service.ts:430–433`: Sets `isActive: false, deletedAt: new Date()` and executes:
    `DELETE FROM session WHERE user_id = ${userId}`.
    *Status*: **Confirmed secure**.
- **Self-Service Password Change (`changePassword`)**:
  - `backend/src/modules/onboarding/onboarding.service.ts:370–376`: Calls `auth.api.changePassword` with `revokeOtherSessions: false`.
  - *Risk*: When a user changes their password, existing active sessions on other devices or potential attacker sessions are **not revoked**.
- **Admin Password Reset (`resetUserPassword`)**:
  - `backend/src/modules/admin/admin.service.ts:354–405`: Updates `accounts.password` and sets `users.mustChangePassword: true`, but **never deletes session rows** from PostgreSQL.
  - *Vulnerability*: An attacker with an active session retains access even after an admin forces a password reset on a compromised account.

---

### 2. Credential Storage, Cryptography & Password Policies

#### 2.1 Password Hashing Algorithm & Salt Generation
- **Implementation**: Powered by `better-auth/crypto` (invoked directly in `backend/src/modules/admin/admin.service.ts:367` and internally by Better-Auth's email/phone auth flows).
- **Algorithm**: `node:crypto.scrypt` (with fallback to `@noble/hashes/scrypt.js` on non-Node runtimes).
- **Entropy & Salt**: Generates a 16-byte random salt (`crypto.randomBytes(16)`) and derives a 64-byte key (`dkLen: 64`). The stored hash follows the standard `<salt_hex>:<hash_hex>` format.
- *Status*: **Confirmed secure**. Resistant to offline rainbow-table and GPU attacks.

#### 2.2 Password Redaction in Logs, Serializers & Audits
- **Audit Interceptor**:
  - `backend/src/modules/admin/audit.interceptor.ts:12–24`: Defines `const SENSITIVE = /password|token|secret|authorization|cookie|api[-_]?key/i;` and recursively transforms matching properties to `'[redacted]'` for both `req.query` and `req.body`.
  - Response payloads are not recorded in audit logs.
- **Application Logger (Pino)**:
  - `backend/src/lib/logger.ts:9–19`: Configures redactions on paths `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `*.password`, `*.token`, and `*.secret`.
- **Serializers**:
  - `backend/src/lib/serializers.ts:90–121`: `serializeUser` explicitly projects allowed properties (`id`, `name`, `email`, `role`, `isActive`, `mustChangePassword`, etc.). Password hashes reside in the `account` table (`backend/src/db/schema.ts:145–161`) and are never selected or exposed in user serialization routines.

#### 2.3 `mustChangePassword` Enforcement
- **Client-Side Enforcement**:
  - Web client (`frontend/src/lib/session.ts:37`): `requireRole` route guard checks `if (session.user.mustChangePassword) throw redirect({ to: '/change-password' })`.
  - Login page (`frontend/src/pages/Login.tsx:76`): Directs user to `/change-password` upon sign-in.
  - Mobile client (`mobile/App.tsx:294–302`): Blocks navigation tree with full-screen `<ChangePassword />`.
- **Backend API Enforcement Gap**:
  - In `backend/src/auth/auth.guard.ts` (lines 38–45), `AuthGuard` checks `!session.user.isActive`, but does **not** check `session.user.mustChangePassword`.
  - *Vulnerability*: Any API client or automated script holding credentials can access all protected endpoints (`/api/student/*`, `/api/teacher/*`, `/api/me`, etc.) without completing the password change.

#### 2.4 Temporary Password Generation Flaw
- **Location**: `backend/src/modules/admin/admin.service.ts:2075–2082`:
  ```typescript
  function generateTemporaryPassword(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Emtiaz#${rand}`;
  }
  ```
- *Vulnerabilities*:
  1. **Low Entropy**: Only 4 characters selected from 54 options = $54^4 \approx 8,503,056$ possible combinations (~23 bits of entropy).
  2. **Non-CSPRNG**: Employs `Math.random()`, which is predictable and not cryptographically secure.

---

### 3. Brute Force Protection & Rate Limiting

#### 3.1 Account Lockout (`LoginLockout` & `RedisLoginLockout`)
- **Location**: `backend/src/auth/login-lockout.ts` and `backend/src/main.ts:43–44`.
- **Thresholds**:
  - `LOGIN_LOCKOUT_MAX`: Default `5` failed attempts (configurable via env).
  - `LOGIN_LOCKOUT_WINDOW_MS`: Default `15` minutes (`900,000 ms`).
  - `LOGIN_LOCKOUT_MS`: Default `15` minutes (`900,000 ms`).
- **Identifier Normalization**:
  - Lines 120–130: `normalizeIdentifier` handles email casing (`.toLowerCase()`) and E.164 phone normalization via `normalizePhone(trimmed)`.
- **Enforcement**:
  - `loginLockoutMiddleware` intercepts `POST /sign-in*` requests.
  - If locked: Responds with `429 Too Many Requests`, header `Retry-After: <seconds>`, and JSON body `{ message: 'Too many failed sign-in attempts. Try again later.' }`.
  - On response finish (`res.on('finish')`): Status $\ge 400$ increments failure; status $< 300$ resets counter.
- **Unit Test Coverage**: `backend/src/auth/login-lockout.spec.ts` passes all 8 test cases verifying locking, window expiry, reset on success, and phone sign-in lockout.

#### 3.2 Redis Distributed State vs. In-Memory Fallback
- In `backend/src/main.ts:39–43`:
  - When `process.env.REDIS_URL` is configured, an `ioredis` client is created with `maxRetriesPerRequest: 1`.
  - Uses `RedisLoginLockout` which executes atomic Redis commands (`incr`, `pexpire`, `pttl`, `set ... PX`, `del`), sharing lockout state across API replicas.
  - If `REDIS_URL` is omitted, cleanly falls back to in-memory `LoginLockout` (per-process Map).
  - If Redis fails during runtime, errors are logged and requests fail open (`catch { return next(); }`), ensuring IP rate limits remain as backup without dropping service availability.

#### 3.3 Multi-Layered Rate Limiting & Proxy Configuration
1. **Global IP Throttler**:
   - `backend/src/app.module.ts:24–32`: NestJS `ThrottlerModule` enforces 300 requests/minute per IP across all endpoints. Backed by `RedisThrottlerStorage` when Redis is available.
2. **Endpoint-Level IP Throttler**:
   - `backend/src/auth/auth.ts:21–30`: Better-Auth rate limiting enforces:
     - 100 requests/minute overall.
     - 10 requests/minute on `/sign-in/email`.
     - 10 requests/minute on `/sign-up/email`.
     - 10 requests/minute on `/sign-in/phone-number`.
3. **Reverse Proxy Support**:
   - `backend/src/main.ts:21`: `app.getHttpAdapter().getInstance().set('trust proxy', 1);` ensures rate limiters extract the authentic client IP behind Caddy or reverse proxy.

---

## Identified Vulnerabilities & Security Gaps

| ID | Severity | Title | Affected File(s) | Description |
|---|---|---|---|---|
| **VULN-01-01** | **High** | Active Sessions Not Revoked on Admin Password Reset | `backend/src/modules/admin/admin.service.ts:354–405` | When an admin resets a user password, the new hash is written to `accounts` and `mustChangePassword` is set, but existing session records in `session` table are not deleted. An attacker possessing an active session maintains access. |
| **VULN-01-02** | **Medium** | Missing Backend Enforcement for `mustChangePassword` | `backend/src/auth/auth.guard.ts:24–50` | `mustChangePassword` is only enforced on the frontend client routes (`frontend/src/lib/session.ts` and `mobile/App.tsx`). Direct REST API calls to protected endpoints bypass this restriction completely. |
| **VULN-01-03** | **Medium** | Weak PRNG and Low Entropy in Temporary Passwords | `backend/src/modules/admin/admin.service.ts:2075–2082` | `generateTemporaryPassword` uses `Math.random()` and 4 alphanumeric characters (~23 bits entropy), making temporary passwords predictable and vulnerable to brute-force enumeration. |
| **VULN-01-04** | **Low** | Self-Service Password Change Leaves Concurrent Sessions Active | `backend/src/modules/onboarding/onboarding.service.ts:374` | `changePassword` sets `revokeOtherSessions: false`. Users changing their password to secure a compromised account do not revoke active adversary sessions. |
| **VULN-01-05** | **Low** | Bulk Student Initial Password Equals Predictable Phone Digits | `backend/src/modules/teacher/teacher.service.ts:2625–2633` | Bulk-imported students are assigned a temporary password matching their phone number digits. Combined with VULN-01-02, anyone knowing the student's phone number can make authorized API calls prior to password change. |

---

## Recommendations & Remediation Plan

1. **Fix Session Invalidation on Password Reset (`VULN-01-01`)**:
   In `backend/src/modules/admin/admin.service.ts:resetUserPassword`:
   Add session deletion immediately following password update:
   ```typescript
   await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
   ```

2. **Enforce `mustChangePassword` in Backend Guard (`VULN-01-02`)**:
   In `backend/src/auth/auth.guard.ts`:
   Check `session.user.mustChangePassword`. If true, only allow access to `@Public()` endpoints and `POST /api/me/change-password` / `GET /api/auth/get-session` / `POST /api/auth/sign-out`. Reject all other routes with `403 Forbidden` (`Password change required`).

3. **Upgrade Temporary Password Generation (`VULN-01-03`)**:
   Replace `Math.random()` in `generateTemporaryPassword()` with Node's `crypto.randomInt` or `crypto.randomBytes`, and increase random length to at least 10–12 characters with mixed charset (symbols, digits, upper, lower).

4. **Revoke Other Sessions on Password Change (`VULN-01-04`)**:
   In `backend/src/modules/onboarding/onboarding.service.ts:changePassword`:
   Set `revokeOtherSessions: true` in `auth.api.changePassword(...)`.

5. **Provide Secure Initial Credentials for Bulk Students (`VULN-01-05`)**:
   Generate cryptographically secure temporary passwords instead of raw phone digits, or pair with mandatory OTP verification before account activation.
