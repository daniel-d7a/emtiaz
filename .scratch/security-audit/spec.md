# Emtiaz Security Audit Report & Remediation Specification

**Status:** ready-for-agent

## Executive Summary

A comprehensive, multi-agent security audit was executed across all five security vectors of the Emtiaz LMS (`backend/`, `frontend/`, `mobile/`, `landing/`, `web/`), evaluating code against [docs/security.md](../../docs/security.md), OWASP Top 10, and the `emtiaz-authz` skill invariants.

The core architecture exhibits exceptionally strong defensive design in multiple areas:
- Zero raw SQL injection vectors (100% parameterization via Drizzle ORM).
- Universal request body validation with Zod pipes on all write endpoints.
- Total absence of raw HTML injection / `dangerouslySetInnerHTML`.
- Strict teacher course isolation across all 54 routes.
- Student cohort lockouts and dynamic lesson pacing.
- Parent read-only boundary enforced through randomized monitoring codes.
- Immediate database session validation ignoring in-memory cookie caches (`disableCookieCache: true`).
- Zero leaked secrets in git history or client bundles.

However, the audit identified **1 Critical, 3 High, 6 Medium, and 3 Low** security vulnerabilities requiring remediation prior to production launch.

---

## Vulnerability Matrix & Findings

| ID | Severity | Vector | Title | File / Location |
|---|---|---|---|---|
| **VULN-01** | **CRITICAL** | Authorization / Storage | Broken Object Level Authorization (IDOR) on Student Homework Submissions | `storage.controller.ts:227` |
| **VULN-02** | **HIGH** | Authorization / Storage | Missing Access Authorization on Homework Reference Files | `storage.controller.ts:214` |
| **VULN-03** | **HIGH** | Input Validation / XSS | Stored XSS via Unsanitized Homework & Submission External URLs | `schemas.ts`, `HomeworkGrading.tsx`, `LessonHomeworkCard.tsx`, `mobile/Lesson.tsx` |
| **VULN-04** | **HIGH** | Authentication / Sessions | Active Sessions Not Revoked on Admin Password Reset | `admin.service.ts:390` |
| **VULN-05** | **MEDIUM** | Authorization / Storage | Arbitrary R2 Object Deletion via Unvalidated Homework S3 Keys | `teacher.service.ts:1346`, `student.service.ts:752` |
| **VULN-06** | **MEDIUM** | Authentication / Gateway | Missing Backend API Enforcement for `mustChangePassword` | `auth.guard.ts:24` |
| **VULN-07** | **MEDIUM** | Authentication / Cryptography | Weak PRNG and Low Entropy in Temporary Password Generator | `admin.service.ts:2075` |
| **VULN-08** | **MEDIUM** | Input Validation / CSV | CSV Formula Injection Bypass via Leading Whitespace & Pipe | `frontend/src/lib/csv.ts:9` |
| **VULN-09** | **MEDIUM** | Input Validation / DoS | Unvalidated Query Parameters & Negative Limit SQL Crash | `inbox.controller.ts:11`, `notifications.service.ts:56` |
| **VULN-10** | **MEDIUM** | Infrastructure / Config | Insecure Default for `BETTER_AUTH_SECRET` in Docker Compose | `docker-compose.yml:95` |
| **VULN-11** | **LOW** | Authentication / Sessions | Self-Service Password Change Leaves Concurrent Sessions Active | `onboarding.service.ts:374` |
| **VULN-12** | **LOW** | Input Validation / 500s | Missing UUID Route Parameter Validation Leaking 500 DB Errors | Global `@Param('id')` routes |
| **VULN-13** | **LOW** | Infrastructure / Transport | Missing HSTS and Web Content-Security-Policy (CSP) | `web/Caddyfile` |

---

## Detailed Vulnerability Analysis & Remediation Plan

### 1. [CRITICAL & HIGH] VULN-01 & VULN-02: Storage BOLA / IDOR Authorization on Homework Endpoints
- **Root Cause**: While lesson attachments (`/api/storage/attachments/:id/file`) call `this.readableAttachment(req.user, id)` to verify teacher ownership or student enrollment and unlock status, the newer routes `GET /api/storage/homework/:id/file` and `GET /api/storage/homework-submissions/:id/file` in `backend/src/modules/storage/storage.controller.ts` have `@Roles('STUDENT', 'TEACHER', 'ADMIN')` but omit any call to verify `req.user`.
- **Impact**: Any authenticated user can download any student's homework submission file or teacher's homework file across the entire database if they obtain or guess the UUID.
- **Remediation**:
  - Implement `readableHomework(user, homeworkId)`:
    - Admin: allowed.
    - Teacher: course owner (`courses.teacherId === user.id`).
    - Student: enrolled in an active group for the course where the lesson is unlocked and homework is not hidden.
    - Parent: linked to an enrolled student where the lesson is unlocked.
  - Implement `readableSubmission(user, submissionId)`:
    - Admin: allowed.
    - Student: submitting student (`submission.studentId === user.id`).
    - Teacher: group/course owner (`courses.teacherId === user.id`).
    - Parent: linked to the submitting student (`parent_student_links`).
  - Wire both helpers into the streaming and download endpoints in `storage.controller.ts`.

---

### 2. [HIGH] VULN-03: Stored XSS via Unsanitized Homework URLs
- **Root Cause**: `SubmitHomeworkDto.url`, `CreateHomeworkDto.url`, and `UpdateHomeworkDto.url` in `backend/src/lib/schemas.ts` permit any string up to 2000 characters without verifying `^https?://`. In `frontend/src/pages/teacher/HomeworkGrading.tsx:470` and `frontend/src/pages/student/LessonHomeworkCard.tsx:315`, these URLs are rendered directly into `<a href={url}>`. In `mobile/src/screens/Lesson.tsx:257`, they are passed directly to `Linking.openURL(url)`.
- **Impact**: A student can submit a `javascript:...` link that executes arbitrary JavaScript in the teacher's browser session upon click.
- **Remediation**:
  - In `backend/src/lib/schemas.ts`, refine URL validation for homework and submissions:
    ```ts
    const safeHttpUrl = z.string().trim().url().regex(/^https?:\/\//i, { message: 'Must be an http or https URL' });
    ```
  - In frontend and mobile link components, add client-side protocol sanitization: check that URLs start with `http://` or `https://` before rendering into `href` or passing to `openURL`.

---

### 3. [HIGH] VULN-04: Session Revocation on Admin Password Reset
- **Root Cause**: `resetUserPassword` in `backend/src/modules/admin/admin.service.ts` updates `account.password` and sets `mustChangePassword = true`, but does not delete active records from the Better-Auth `session` table for that `userId`.
- **Impact**: An attacker who holds an existing valid session cookie retains full access to the account even after an administrator resets the password.
- **Remediation**:
  - In `admin.service.ts:resetUserPassword`:
    ```ts
    await db.delete(sessions).where(eq(sessions.userId, userId));
    ```

---

### 4. [MEDIUM] VULN-05: S3 Key Manipulation & Arbitrary File Deletion
- **Root Cause**: `createHomework`, `updateHomework`, and `submitHomework` accept caller-provided `r2ObjectKey` strings. On deletion or update, `storage.deleteObject(existing.r2ObjectKey)` is called on caller-supplied keys without checking that the key begins with the expected path prefix.
- **Impact**: A malicious user could provide an S3 key belonging to another user or lesson, and then trigger an update or delete to delete victim objects from Cloudflare R2.
- **Remediation**:
  - Enforce strict prefix checking on all `r2ObjectKey` inputs:
    - Teacher homework reference files must start with `courses/${courseId}/lessons/${lessonId}/`.
    - Student homework submission files must start with `homework/${homeworkId}/students/${studentId}/` or `submissions/${submissionId}/`.
  - Validate prefix before writing to DB and before calling `storage.deleteObject`.

---

### 5. [MEDIUM] VULN-06: Backend API Enforcement for `mustChangePassword`
- **Root Cause**: `mustChangePassword` is checked in the frontend SPA (`frontend/src/lib/session.ts`) and mobile app, but the NestJS `AuthGuard` in `backend/src/auth/auth.guard.ts` permits API requests through regardless of the flag.
- **Impact**: A user with `mustChangePassword = true` can make direct REST API requests to mutate data without first changing their temporary password.
- **Remediation**:
  - In `backend/src/auth/auth.guard.ts`, if `session.user.mustChangePassword === true`, permit only:
    - `POST /api/me/change-password`
    - `GET /api/me`
    - `POST /api/auth/sign-out`
  - Reject all other protected API routes with `403 Forbidden` (`MUST_CHANGE_PASSWORD`).

---

### 6. [MEDIUM] VULN-07: Temporary Password Generator CSPRNG Hardening
- **Root Cause**: `generateTemporaryPassword` in `backend/src/modules/admin/admin.service.ts` uses `Math.random()` to pick 4 random characters from a 54-character set (~23 bits of entropy).
- **Impact**: Predictable PRNG and low entropy make temporary passwords susceptible to brute-force or prediction if an attacker knows the reset window.
- **Remediation**:
  - Use `crypto.randomInt` or `crypto.randomBytes`:
    ```ts
    import crypto from 'node:crypto';
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz!@#$%';
    // Generate 12 cryptographically random characters
    ```

---

### 7. [MEDIUM] VULN-08: CSV Formula Injection Leading-Whitespace Bypass
- **Root Cause**: `frontend/src/lib/csv.ts` tests `/^[=+\-@\t\r]/.test(text)`. Spreadsheets trim leading whitespace before evaluating formulas, so inputs like `"   =SUM(A1:A10)"` or `"|cmd"` bypass the check.
- **Impact**: Malicious student names or group titles could execute formulas when exported to CSV and opened in Excel or LibreOffice.
- **Remediation**:
  - Update regex to test trimmed values and include the DDE command pipe:
    ```ts
    const trimmed = text.trimStart();
    if (/^[=+\-@\t\r|]/.test(trimmed)) {
      return `'${text}`;
    }
    ```

---

### 8. [MEDIUM] VULN-09: Unvalidated Query Parameters & PostgreSQL Negative Limit
- **Root Cause**: In `inbox.controller.ts:11`, `Number(limit) || 30` coupled with `Math.min(limit, 100)` in `notifications.service.ts:56` passes negative values (e.g. `?limit=-5`) directly to PostgreSQL `LIMIT -5`, crashing with `500 Internal Server Error`.
- **Impact**: Unhandled server crashes and denial of service.
- **Remediation**:
  - Enforce `Math.max(1, Math.min(Number(limit) || 30, 100))` on all limit query params.

---

### 9. [MEDIUM & LOW] VULN-10, 11, 12, 13: Configuration, Sessions & Transport Hardening
- **VULN-10 (Docker Compose Secret)**: In `docker-compose.yml`, change `${BETTER_AUTH_SECRET:-change-me-in-production}` to enforce a required variable in production.
- **VULN-11 (Revoke Sessions on Password Change)**: In `backend/src/modules/onboarding/onboarding.service.ts:374`, set `revokeOtherSessions: true`.
- **VULN-12 (Route Parameter UUID Validation)**: In `backend/src/lib/pipes/`, introduce a clean `UuidParamPipe` or use `new ParseUUIDPipe()` so malformed UUIDs return `400 Bad Request` instead of unhandled `22P02` 500 errors.
- **VULN-13 (Caddy Headers)**: In `web/Caddyfile`, add `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` and a baseline `Content-Security-Policy`.

---

## Verification Plan

1. **Unit & Integration Tests**:
   - Write integration tests in `backend/src/modules/storage/storage.service.spec.ts` testing homework and submission file authorization (verifying 403 Forbidden for unauthorized students, parents, and teachers).
   - Test admin password reset session deletion in `admin.spec.ts`.
   - Test `mustChangePassword` API-level blocking in `auth.spec.ts`.
   - Test CSV formula escaping with whitespace in `frontend/src/lib/csv.spec.ts`.
   - Test negative limit query sanitization in `inbox.spec.ts`.
2. **Build & Parity**:
   - `cd backend && npm run typecheck && npm test`
   - `cd frontend && npm run typecheck && npm test && npm run build`
   - `cd mobile && npm run typecheck`
