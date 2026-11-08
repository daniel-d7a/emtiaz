# Ticket 02: URL Sanitization, Stored XSS Defense & CSV Injection Hardening (VULN-03, VULN-08, VULN-09)

## Overview & Background
- Stored XSS risk (`VULN-03`): `SubmitHomeworkDto.url`, `CreateHomeworkDto.url`, and `UpdateHomeworkDto.url` permitted any arbitrary string (such as `javascript:...`), which were subsequently rendered directly into `<a href={...}>` in web components (`HomeworkGrading.tsx`, `LessonHomeworkCard.tsx`) and passed to `Linking.openURL(...)` in the mobile app (`Lesson.tsx`).
- CSV Formula Injection bypass (`VULN-08`): `frontend/src/lib/csv.ts` tested formula prefixes without trimming leading whitespace, allowing bypasses like `"   =1+1"` or command pipes `"|calc"`.
- PostgreSQL unhandled crash on negative query limit (`VULN-09`): `inbox.controller.ts` and `notifications.service.ts` passed unvalidated query limits allowing negative integers to crash PostgreSQL with a 500 error.

## Scope of Work

### 1. Schema-Level URL Sanitization
In `backend/src/lib/schemas.ts`:
- Define `safeHttpUrl`:
  ```ts
  export const safeHttpUrl = z
    .string()
    .trim()
    .max(2000)
    .regex(/^https?:\/\//i, { message: 'Must be an http or https URL' });
  ```
- Update `CreateHomeworkDto.url`, `UpdateHomeworkDto.url`, and `SubmitHomeworkDto.url` to use `safeHttpUrl.optional().nullable()`.

### 2. Client-Side Link Sanitization (Web & Mobile Defense-in-Depth)
- In `frontend/src/pages/teacher/HomeworkGrading.tsx`:
  - Validate submission/homework URLs before rendering `<a href={url}>`. Only render valid `http://` or `https://` URLs; otherwise render text or safe fallback.
- In `frontend/src/pages/student/LessonHomeworkCard.tsx`:
  - Validate URLs before rendering in `<a href={hw.url}>`.
- In `mobile/src/screens/Lesson.tsx`:
  - Check `url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://')` before calling `Linking.openURL(url)`.

### 3. CSV Formula Injection Regex Hardening
In `frontend/src/lib/csv.ts`:
- Trim leading whitespace before testing formula characters and add pipe `|`:
  ```ts
  const trimmed = text.trimStart();
  const safe = /^[=+\-@\t\r|]/.test(trimmed) ? `'${text}` : text;
  ```
- In `frontend/src/lib/csv.spec.ts`:
  - Add tests verifying leading whitespace with formula characters (e.g. `"   =SUM(A1)"` and `"  -1+2"`) and pipe commands (e.g. `"|cmd"`).

### 4. Query Limit Clamping in Inbox & Notifications
In `backend/src/modules/notifications/inbox.controller.ts`:
- Clamp `limit` param: `Math.max(1, Math.min(Number(limit) || 30, 100))`.
In `backend/src/modules/notifications/notifications.service.ts`:
- In `inbox(userId, limit = 30)`:
  - Clamp limit: `Math.max(1, Math.min(limit, 100))`.

### 5. Verification
- Run tests in backend and frontend:
  - `cd backend && npm run typecheck && npm test`
  - `cd frontend && npm run typecheck && npm test`
  - `cd mobile && npm run typecheck`
