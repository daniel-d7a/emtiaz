# Ticket 03: Session Revocation, Gateway AuthGuard Enforcement & CSPRNG (VULN-04, VULN-06, VULN-07, VULN-10, VULN-11, VULN-13)

## Overview & Background
- Session persistence post admin password reset (`VULN-04`): When an admin resets a user's password, existing Better-Auth sessions in PostgreSQL were not cleared, allowing attackers with active cookies to remain signed in.
- Gateway `mustChangePassword` bypass (`VULN-06`): `backend/src/auth/auth.guard.ts` checked `isActive` but omitted `mustChangePassword`, meaning compromised or temporary accounts could invoke protected REST APIs directly without changing password.
- Weak PRNG for temporary passwords (`VULN-07`): `generateTemporaryPassword` used `Math.random()`, giving low entropy (~23 bits).
- Concurrent sessions kept on self-service password change (`VULN-11`): `backend/src/modules/onboarding/onboarding.service.ts` had `revokeOtherSessions: false`.
- Docker Compose secret default (`VULN-10`) and missing HSTS (`VULN-13`).

## Scope of Work

### 1. Immediate Session Revocation on Admin Password Reset
In `backend/src/modules/admin/admin.service.ts`:
- In `resetUserPassword(adminId, userId, dto)`:
  - Revoke all active sessions for the user:
    ```ts
    await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
    ```

### 2. CSPRNG for Temporary Password Generation
In `backend/src/modules/admin/admin.service.ts`:
- Replace `generateTemporaryPassword()`:
  - Use `crypto.randomBytes` or `crypto.randomInt` from `node:crypto`.
  - Generate a 12-character high-entropy temporary password containing uppercase, lowercase, numbers, and symbols (or e.g. `Emtiaz#` prefix followed by 10 CSPRNG characters).
  - Guarantee high entropy (>60 bits).

### 3. Revoke Concurrent Sessions on Self-Service Password Change
In `backend/src/modules/onboarding/onboarding.service.ts`:
- In `changePassword`:
  - Set `revokeOtherSessions: true`.

### 4. Gateway Enforcement of `mustChangePassword` in AuthGuard
In `backend/src/auth/auth.guard.ts`:
- If `session.user.mustChangePassword === true`:
  - Allow only:
    - `POST /api/me/change-password`
    - `GET /api/me`
    - `POST /api/auth/sign-out`
    - Public endpoints (`isPublic`)
  - For all other endpoints, throw `new ForbiddenException('Password change required')`.
- Ensure tests and existing endpoints work as expected.

### 5. Infrastructure Security Hardening
In `docker-compose.yml`:
- Update `BETTER_AUTH_SECRET`: Add comment / note and use `${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET must be set in production}` or secure documentation note so default cannot be accidentally deployed.
In `web/Caddyfile`:
- In the `header` block, add:
  ```caddy
  Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  ```

### 6. Verification
- Test in `backend/src/modules/admin/admin.service.spec.ts` (or integration test) that session revocation is executed.
- Test that `AuthGuard` rejects protected routes when `mustChangePassword` is true, but permits `/api/me/change-password`.
- Ensure `cd backend && npm run typecheck && npm test` passes.
- Ensure `cd frontend && npm run typecheck && npm test` passes.
