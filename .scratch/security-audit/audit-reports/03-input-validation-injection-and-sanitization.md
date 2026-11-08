# 03: Input Validation, SQL Parameterization & Injection Defense

**Type:** audit
**Status:** resolved
**Blocked by:** None

## Objective

Audit all input validation, database query construction, file export sanitization, and XSS defenses across backend, web frontend, and mobile clients.

---

## Executive Summary

A comprehensive application security audit was conducted targeting the input validation pipelines, SQL query composition, CSV serialization, and XSS/content injection controls in the Emtiaz LMS codebase.

### Verified Defensive Controls:
1. **SQL Injection Immunity**: Complete reliance on Drizzle ORM query builders and strictly parameterized `sql` tagged template literals (`$1`, `$2` bind variables). Zero occurrences of `sql.raw(...)` or unsanitized string interpolations in application code across the entire backend.
2. **Universal Request Body Validation**: 100% of write endpoints across all 8 NestJS controllers (`@Body`) enforce strict Zod validation pipes (`new ZodBodyPipe(...)`).
3. **Absence of `dangerouslySetInnerHTML`**: Neither `frontend/src/` nor `mobile/src/` utilizes raw HTML injection; all text interpolations rely on React's automatic contextual encoding.
4. **Strict Video Embed Whitelisting**: Video embedding in `Lesson.tsx` and `Course.tsx` passes exclusively through `shared/embed.ts`, strictly whitelisting YouTube (`youtu.be`, `youtube.com`) and Vimeo (`vimeo.com`) domains and generating canonical embed URLs.
5. **CSV Formula Neutralization**: `frontend/src/lib/csv.ts` neutralizes standard spreadsheet formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending `'` and enforces RFC-4180 quote wrapping.

### Key Vulnerabilities & Architectural Gaps Identified:
1. **HIGH: Stored XSS via Homework & Submission URLs**:
   - `SubmitHomeworkDto.url`, `CreateHomeworkDto.url`, and `UpdateHomeworkDto.url` in `backend/src/lib/schemas.ts` permit arbitrary strings up to 2000 characters without verifying `^https?://` protocol or URL structure.
   - Rendered directly into unescaped `<a href={submission.url}>` in `frontend/src/pages/teacher/HomeworkGrading.tsx:470` and `<a href={hw.url}>` in `frontend/src/pages/student/LessonHomeworkCard.tsx:315`.
   - Also passed directly to React Native `Linking.openURL(hw.url!)` in `mobile/src/screens/Lesson.tsx:257, 316`.
   - Allows students to inject `javascript:...` payloads that execute scripts in the teacher's session upon click (Student-to-Teacher Stored XSS), and teachers to target students.
2. **MEDIUM: CSV Formula Injection Leading-Whitespace Bypass**:
   - The regex `/^[=+\-@\t\r]/.test(text)` in `frontend/src/lib/csv.ts:9` does not account for leading spaces (e.g. `"   =1+1"` or `"  +cmd|' /C calc'!A0"`), nor does it cover the DDE command pipe character `|`. Spreadsheet processors (Microsoft Excel, LibreOffice Calc) trim cell whitespace before evaluating formulas.
3. **MEDIUM: Unvalidated Query Parameters & Missing `ZodQueryPipe`**:
   - There is no `ZodQueryPipe` registered anywhere in the application. Query parameters (`@Query`) across admin, public, student, and notification controllers are received as unvalidated strings or untyped objects, leading to unbounded database queries (e.g. unconstrained `limit` returning full tables in `admin.service.ts:176`) and database crashes (e.g. negative `limit` in `inbox.controller.ts:11` causing PostgreSQL `LIMIT must not be negative` syntax errors).
4. **LOW: Missing UUID Validation on Route Parameters (`@Param`)**:
   - No `@Param` routes enforce `ParseUUIDPipe` or regex validation. Malformed UUIDs directly trigger PostgreSQL error `22P02: invalid input syntax for type uuid`, which leaks unhandled 500 Internal Server Errors due to the lack of an uncaught database exception filter.
5. **LOW: Unbounded Arrays and Record Payloads**:
   - `IdListDto.moduleIds` has no `.max()` limit (`z.array(uuid)`), allowing oversized batch payloads.
   - `QuizSubmitDto.answers` and `GradeQuizAttemptDto.grades` use unbounded `.catchall()` / `z.record()` schemas without key count caps.
   - `CheckAvailabilityDto.email` and `phoneNumber` lack string length caps.
6. **LOW: Missing Content-Security-Policy (CSP) in Production Reverse Proxy**:
   - `web/Caddyfile` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`, but completely omits a `Content-Security-Policy` header for web client assets.

---

## Detailed Audit Findings

### 1. Zod Input Validation & Payload Limits

#### 1.1 Universal Request Body Pipe Enforcement
- **Controller Audit**: All 8 controllers in `backend/src/modules/` were audited for `@Body` usage:
  - `teacher.controller.ts`: 32 `@Body` decorators — 100% use `new ZodBodyPipe(...)`.
  - `admin.controller.ts`: 26 `@Body` decorators — 100% use `new ZodBodyPipe(...)`.
  - `onboarding.controller.ts`: 7 `@Body` decorators — 100% use `new ZodBodyPipe(...)`.
  - `storage.controller.ts`: 7 `@Body` decorators — 100% use `new ZodBodyPipe(...)`.
  - `student.controller.ts`: 2 `@Body` decorators — 100% use `new ZodBodyPipe(...)`.
  - `parent.controller.ts`: 1 `@Body` decorator — 100% use `new ZodBodyPipe(...)`.
  - Zero endpoints use raw, untyped, or unvalidated request bodies.
- **Global Body Limit**: `backend/src/main.ts:37` sets `app.use(json({ limit: '2mb' }), urlencoded({ extended: true }))`, bounding JSON body sizes before reaching route handlers.

#### 1.2 Unbounded Schemas & Missing Array Caps
- **`IdListDto` (`backend/src/lib/schemas.ts:232`)**:
  ```typescript
  export const IdListDto = z.object({ moduleIds: z.array(uuid) });
  ```
  *Gap*: Contains no `.max()` restriction. An attacker can send thousands of module IDs in a single request, resulting in massive PostgreSQL `IN (...)` conditions or CPU spikes in reordering logic.
- **`QuizSubmitDto` (`backend/src/lib/schemas.ts:496-502`)**:
  ```typescript
  export const QuizSubmitDto = z.object({
    groupId: uuid,
    answers: z.object({}).catchall(z.string().min(1).max(5000)),
  });
  ```
  *Gap*: While individual answers are bounded to 5,000 characters, the dictionary has no maximum property count. An attacker can submit 50,000 answer keys.
- **`GradeQuizAttemptDto` (`backend/src/lib/schemas.ts:337-339`)**:
  ```typescript
  export const GradeQuizAttemptDto = z.object({
    grades: z.record(z.string(), z.number().min(0).max(1000)),
  });
  ```
  *Gap*: The `grades` record allows an arbitrary number of key-value pairs without pagination or item caps.
- **`CheckAvailabilityDto` (`backend/src/lib/schemas.ts:47-51`)**:
  ```typescript
  export const CheckAvailabilityDto = z.object({
    email: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    country: z.enum(['OM', 'EG']).optional(),
  });
  ```
  *Gap*: `email` and `phoneNumber` lack string length caps, allowing arbitrary multi-megabyte strings to be queried against the user database up to the 2MB body limit.

#### 1.3 Absence of `ZodQueryPipe` & Unvalidated Query Parameters
- Across all controllers, query parameters are received either through unvalidated `@Query('param')` primitives or untyped query objects:
  - `backend/src/modules/admin/admin.controller.ts:83, 125, 207, 268`: `@Query() q: { search?: string; status?: ...; limit?: string; offset?: string }`.
  - `backend/src/modules/public/public.controller.ts:227`: `@Query() q: { search?: string; teacherId?: string; ... }`.
  - `backend/src/modules/notifications/inbox.controller.ts:10`: `@Query('limit') limit?: string`.
  - `backend/src/modules/student/student.controller.ts:44, 54, 64, 74, 105`: `@Query('groupId') groupId?: string`.
  - `backend/src/modules/teacher/teacher.controller.ts:96, 229`: `@Query('country')`, `@Query('groupId')`.
- Only a single query endpoint (`teacher.controller.ts:494`: `searchStudents`) uses a pipe: `@Query(new ZodBodyPipe(SearchStudentsDto))`. No dedicated `ZodQueryPipe` exists.
- **Negative Integer SQL Crash in Notifications Inbox**:
  - `backend/src/modules/notifications/inbox.controller.ts:10-12`:
    ```typescript
    @Get('api/notifications')
    list(@Req() req: Request, @Query('limit') limit?: string) {
      return this.notifications.inbox(req.user!.id, Number(limit) || 30);
    }
    ```
  - `backend/src/modules/notifications/notifications.service.ts:50-58`:
    ```typescript
    async inbox(userId: string, limit = 30) {
      const rows = await db
        .select()
        .from(inboxNotifications)
        .where(eq(inboxNotifications.userId, userId))
        .orderBy(desc(inboxNotifications.createdAt))
        .limit(Math.min(limit, 100));
    ```
  - If a user passes `?limit=-10`, `Number("-10") || 30` evaluates to `-10`. `Math.min(-10, 100)` remains `-10`. In PostgreSQL, `LIMIT -10` triggers a fatal syntax error: `error: LIMIT must not be negative`, crashing the request with a 500 error.
- **Unbounded Row Fetching in Admin Queries**:
  - `backend/src/modules/admin/admin.service.ts:136, 176`:
    ```typescript
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    ...
    const rows = limit ? await query.limit(limit) : await query;
    ```
  - When `filters.limit` is omitted, `limit` evaluates to `0`, causing `await query` to run without a `LIMIT` clause, pulling the entire teachers, students, or courses table into memory.

#### 1.4 Route Parameter Type Safety (`@Param`)
- Route parameters across all modules (`:courseId`, `:lessonId`, `:groupId`, `:studentId`) are typed as plain strings without `ParseUUIDPipe` or validation regexes.
- Example: `GET /api/teacher/courses/invalid-id/curriculum` executes `eq(modules.courseId, 'invalid-id')`. PostgreSQL driver throws `22P02: invalid input syntax for type uuid: "invalid-id"`. Because no global NestJS ExceptionFilter catches PostgreSQL syntax errors, this results in an unhandled 500 error rather than a 400 Bad Request or 404 Not Found.

---

### 2. SQL Injection Defense (Drizzle ORM & Raw SQL)

#### 2.1 Complete Absence of `sql.raw`
- A repository-wide audit of all TypeScript files in `backend/src/` confirmed **zero usages of `sql.raw(...)`**.
- Dynamic queries in `backend/src/modules/admin/admin.service.ts` build SQL conditions using Drizzle's typed expressions (`eq`, `inArray`, `ilike`, `or`, `and`, `isNull`, `isNotNull`).

#### 2.2 Parameterized `sql` Tagged Template Literals
- All direct SQL executions via `db.execute(...)` utilize Drizzle's `sql` tagged template literal:
  1. `backend/src/lib/group-join.ts:90-113`:
     ```typescript
     await db.execute<{ count: number }>(sql`
       SELECT count(1)::int AS count
       ...
       WHERE c.teacher_id = ${teacherId}
         AND gs.student_id = ${studentId}
     `);
     ```
  2. `backend/src/lib/group-join.ts:117-145`:
     ```typescript
     await db.execute<{ count: number }>(sql`
       SELECT count(DISTINCT s.student_id)::int AS count
       ...
       WHERE c.teacher_id = ${teacherId}
     `);
     ```
  3. `backend/src/modules/teacher/teacher-entitlements.service.ts:101-129, 135-159, 165-175, 458-480, 540-562, 1256-1270`:
     - Queries calculating active student counts, used storage bytes, and active group counts interpolate variables (`${teacherId}`, `${takerTeacherId}`) directly into `sql` template tags.
  4. `backend/src/modules/admin/admin.service.ts:420, 433`:
     ```typescript
     await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
     ```
  5. `backend/src/modules/onboarding/onboarding.controller.ts:134`:
     ```typescript
     await db.execute(sql`select 1`);
     ```
- **Evaluation**: Drizzle's `sql` tag guarantees that any interpolated JavaScript variable `${var}` is extracted into the parameterized values array (`$1`, `$2`, etc.) and sent out-of-band to the PostgreSQL server. No SQL injection vulnerability exists.

#### 2.3 `ILIKE` Pattern Handling
- Text search queries (`admin.service.ts:145-152, 292-296, 524-526`, `public.controller.ts:249`, `teacher.service.ts:2594`) construct patterns with `ilike(col, `%${value}%`)`.
- Drizzle passes the formatted pattern string as a parameter `$1`. SQL injection through quote breakout or union-based attacks is impossible.

---

### 3. CSV Formula Injection Defense

#### 3.1 Serialization Analysis (`frontend/src/lib/csv.ts`)
- Implementation in `frontend/src/lib/csv.ts:1-15`:
  ```typescript
  export function toCsv(rows: unknown[][]): string {
    return rows
      .map((row) =>
        row
          .map((value) => {
            const text = value == null ? '' : String(value);
            // stop spreadsheet formula execution from user-supplied names/phones
            const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
            return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
          })
          .join(','),
      )
      .join('\n');
  }
  ```
- Usage contexts:
  - `frontend/src/pages/teacher/Group.tsx:437`: Gradebook CSV export (student names, quiz/homework scores).
  - `frontend/src/pages/teacher/Group.tsx:887`: Roster CSV export (student names, phone numbers, progress stats).
- **Security Strengths**:
  - Follows RFC-4180 escaping by doubling internal quotes (`""`) and enclosing cells containing quotes, commas, or newlines in double quotes.
  - Neutralizes direct formula triggers starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prepending an apostrophe `'`.

#### 3.2 Vulnerability: Leading Whitespace & Pipe Character Bypass
- **Leading Whitespace**: The regex `/^[=+\-@\t\r]/` only matches if the formula trigger character is the very first character of the cell string.
  - If an attacker registers a student account with a leading space before the payload, e.g.:
    `"   =cmd|' /C calc'!A0"` or `"  +SUM(1+1)"`
  - The regex test evaluates to `false`, leaving the text unmodified.
  - When the exported CSV is opened in Microsoft Excel or LibreOffice Calc, the spreadsheet software trims leading whitespace before interpreting cell contents, resulting in formula execution.
- **Pipe Character `|`**: In LibreOffice Calc and OpenOffice, formula commands can begin with `|` to trigger DDE links. `|` is omitted from the neutralization regex.

---

### 4. XSS & Content Injection Defense

#### 4.1 React JSX & Sanitization Model
- The frontend (`frontend/package.json`) uses React 18.3.1 without third-party markdown renderers (e.g. `marked`, `markdown-it`, `react-markdown`) or HTML parsers.
- All dynamic text values (course titles, lesson instructions, quiz prompts, user names) are rendered as children of React JSX elements (e.g. `<p>{hw.instructions}</p>`, `<p>{q.prompt}</p>`), ensuring automatic contextual text escaping.
- Zero occurrences of `dangerouslySetInnerHTML` exist in `frontend/src/` or `mobile/src/`.

#### 4.2 Video Embed Whitelist Validation
- In `frontend/src/pages/student/Lesson.tsx:173-185` and `frontend/src/pages/public/Course.tsx:88-96`, video embeds are rendered via:
  ```tsx
  {attachment.fileType === 'VIDEO' && (
    videoEmbed ? (
      <iframe src={videoEmbed} ... allowFullScreen />
    ) : (
      <video src={attachmentSrc} controls ... />
    )
  )}
  ```
- `videoEmbed` is generated by `shared/embed.ts:1-20`:
  ```typescript
  export function embedUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host === 'youtu.be') return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
      if (host === 'youtube.com') {
        const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop();
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (host === 'vimeo.com') {
        const id = parsed.pathname.split('/').filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}` : null;
      }
    } catch { return null; }
    return null;
  }
  ```
- **Evaluation**: Verified secure. If a user provides an arbitrary video link (e.g. `https://attacker.com/evil.html`), `embedUrl` returns `null`, falling back to standard `<video>` tag rendering which cannot execute external web scripts.

#### 4.3 High Severity Finding: Stored XSS via Unsanitized Homework & Submission URLs
- **Backend Schema Gap (`backend/src/lib/schemas.ts:260-298`)**:
  - `CreateHomeworkDto`:
    ```typescript
    url: z.string().trim().max(2000).optional().nullable(),
    ```
  - `UpdateHomeworkDto`:
    ```typescript
    url: z.string().trim().max(2000).optional().nullable(),
    ```
  - `SubmitHomeworkDto`:
    ```typescript
    url: z.string().trim().max(2000).optional().nullable(),
    ```
  - Contrast with `AttachDto` (lines 480-486) which properly enforces:
    `url: z.string().trim().max(2000).url().refine((value) => /^https?:\/\//i.test(value))`
- **Client Rendering Vectors**:
  1. **Teacher Grading View (`frontend/src/pages/teacher/HomeworkGrading.tsx:467-479`)**:
     ```tsx
     {submission.url && (
       <a
         href={submission.url}
         target="_blank"
         rel="noreferrer"
       >
         <span>{t('openStudentLink')}</span>
       </a>
     )}
     ```
  2. **Student Lesson View (`frontend/src/pages/student/LessonHomeworkCard.tsx:313-323, 377-387`)**:
     ```tsx
     {hw.url && (
       <a href={hw.url} target="_blank" rel="noreferrer">
         <span>{t('openStudentLink')}</span>
       </a>
     )}
     ...
     {sub.url && (
       <a href={sub.url} target="_blank" rel="noreferrer">
         <span>{t('openSubmittedLink')}</span>
       </a>
     )}
     ```
  3. **Mobile Client Execution (`mobile/src/screens/Lesson.tsx:257, 316`)**:
     ```typescript
     Linking.openURL(hw.url!).catch((e) => ...);
     Linking.openURL(sub.url!).catch((e) => ...);
     ```
- **Exploitation**:
  - A student submits homework via `POST /api/student/homework/:homeworkId/submit` with:
    `{ "url": "javascript:alert(document.cookie)", "attachmentType": "LINK" }`.
  - The backend accepts and persists the submission without validation.
  - When the teacher grades the student's submission in `HomeworkGrading.tsx`, clicking "Open Student Link" triggers execution of the JavaScript payload in the teacher's browser.
  - In the mobile client, unvalidated URLs passed to `Linking.openURL` can trigger execution of arbitrary application schemes (`tel:`, `file:`, Android intent schemes).

#### 4.4 Unsandboxed PDF Iframe Embedding
- In `frontend/src/pages/student/Lesson.tsx:170-172`:
  ```tsx
  {attachment.fileType === 'PDF' && (
    <iframe src={attachmentSrc} title={attachment.title} className="h-[70vh] w-full rounded-xl border border-line" />
  )}
  ```
- If an attachment has `url` configured pointing to a third-party domain hosting a PDF or web page, rendering the external URL directly inside an `<iframe>` without a `sandbox` attribute allows the embedded third-party content to execute scripts, trigger popups, or perform clickjacking within the LMS application interface.

---

## Actionable Remediation Plan

### 1. Resolve Stored XSS via URL Validation (Priority: HIGH)
- **Backend**: Update `CreateHomeworkDto`, `UpdateHomeworkDto`, and `SubmitHomeworkDto` in `backend/src/lib/schemas.ts` to strictly validate URLs:
  ```typescript
  const safeHttpUrl = z
    .string()
    .trim()
    .max(2000)
    .url()
    .refine((v) => /^https?:\/\//i.test(v), {
      message: 'URL must use http or https protocol',
    });
  ```
- **Frontend Safe URL Sanitizer**: Create a helper in `frontend/src/lib/url.ts`:
  ```typescript
  export function sanitizeExternalUrl(url?: string | null): string {
    if (!url) return '#';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return '#';
  }
  ```
  Ensure all `<a href={...}>` and `Linking.openURL(...)` consumers pass URLs through `sanitizeExternalUrl`.

### 2. Remediate CSV Formula Injection (Priority: MEDIUM)
- Update `frontend/src/lib/csv.ts` to trim leading whitespace before checking for formula prefix triggers and include the pipe `|` character:
  ```typescript
  export function toCsv(rows: unknown[][]): string {
    return rows
      .map((row) =>
        row
          .map((value) => {
            const text = value == null ? '' : String(value);
            // Match any formula triggers even if preceded by whitespace
            const safe = /^\s*[=+\-@\t\r|]/.test(text) ? `'${text}` : text;
            return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
          })
          .join(','),
      )
      .join('\n');
  }
  ```
- Add unit test cases in `frontend/src/lib/csv.spec.ts` for `"   =1+1"`, `"  @SUM"`, and `"|calc"`.

### 3. Implement `ZodQueryPipe` & Query Parameter Validation (Priority: MEDIUM)
- Create `ZodQueryPipe` in `backend/src/lib/schemas.ts`:
  ```typescript
  @Injectable()
  export class ZodQueryPipe implements PipeTransform {
    constructor(private readonly schema: z.ZodType) {}
    transform(value: unknown) {
      const parsed = this.schema.safeParse(value ?? {});
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.issues.map((i) => i.message).join('; '));
      }
      return parsed.data;
    }
  }
  ```
- Define Zod schemas for query parameters with integer coercion (e.g. `z.coerce.number().int().min(1).max(200)`), preventing negative limits and unbounded database queries.
- Update `backend/src/modules/notifications/inbox.controller.ts` and `backend/src/modules/admin/admin.controller.ts` to use `ZodQueryPipe`.

### 4. Cap Unbounded Payload Schemas (Priority: LOW)
- In `backend/src/lib/schemas.ts`:
  - `IdListDto`: `moduleIds: z.array(uuid).min(1).max(200)`.
  - `QuizSubmitDto`: refine `answers` with `refine((obj) => Object.keys(obj).length <= 100, { message: 'Too many answers' })`.
  - `CheckAvailabilityDto`: add `.max(255)` on `email` and `.max(30)` on `phoneNumber`.

### 5. Enforce Content Security Policy (CSP) & Iframe Sandboxing (Priority: LOW)
- Add a strict `Content-Security-Policy` header in `web/Caddyfile`:
  ```caddy
  header {
    Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; frame-src 'self' https://www.youtube.com https://player.vimeo.com; connect-src 'self' https:;"
  }
  ```
- Add `sandbox="allow-scripts allow-same-origin"` to `iframe` rendering in `Lesson.tsx`.
