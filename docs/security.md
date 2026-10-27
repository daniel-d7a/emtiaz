# Security model

What the API enforces today. Decisions live in the linked ADRs; this page is
the checklist to keep in mind when adding endpoints or screens.

## Authentication

- Better Auth email/password sessions, stored in PostgreSQL and sent as
  HTTP-only cookies (`/api/auth/*`). Session lifetime is 30 days, extended
  every 24 hours.
- The global `AuthGuard` verifies the session against the database on every
  guarded request and ignores Better Auth's 5-minute cookie cache, so a
  suspended or deleted user cannot keep using a cached session.
- Suspended users (`is_active = false`) get `403`. Deleting a user is a soft
  delete that also sets `is_active = false`, revokes sessions, and removes group
  memberships; admin/public queries filter `deleted_at`.
- Sign-in lockout: after `LOGIN_LOCKOUT_MAX` failures (default 5) for one email
  inside `LOGIN_LOCKOUT_WINDOW_MS` (default 15 min), sign-in returns `429` with
  `Retry-After` for `LOGIN_LOCKOUT_MS` (default 15 min). A successful sign-in
  clears the counter.
- IP limits: 300 requests/min globally per IP; Better Auth adds 100/min overall
  and 10/min on sign-in/sign-up email and phone sign-in.
- With `REDIS_URL` set, throttle counters and lockout state are shared across
  API replicas; otherwise they are per-process. See
  [ADR-0014](./adr/0014-redis-shared-state.md).
- `trust proxy` is enabled so limits use the forwarded client IP behind Caddy.

## Roles

`ADMIN`, `TEACHER`, `STUDENT`, `PARENT`. `@Roles(...)` is enforced by the global
`RolesGuard`; `@Public()` bypasses auth for explicitly public endpoints.
Every user row has a role, but ownership checks are still required — a role
alone never grants access to another user's course, group, or child.

## Authorization matrix

| Action | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| Global metrics, directories, suspend/delete, taxonomy, audit | yes | no | no | no |
| Create/edit own courses, modules, lessons, quizzes | no* | owner | no | no |
| Create groups, pacing, roster, announcements, gradebook | no* | owner | no | no |
| Join a group by code | no | no | yes | no |
| Read own groups, curriculum, lessons, quizzes | no | no | enrolled | no |
| Complete/uncomplete a lesson | no | no | enrolled + unlocked | no |
| Submit a quiz | no | no | enrolled + group course | no |
| Read own grades | no | no | enrolled | no |
| Read a linked child's progress/grades | no | no | no | linked |
| Link/unlink a child by registered phone | no | no | no | yes |
| Download lesson attachment | yes | owner | enrolled + unlocked | no |
| Upload/manage attachments | no | owner | no | no |
| Upload own avatar | yes | yes | yes | yes |
| Upload own banner | no | yes | no | no |
| Read own inbox / mark read | yes | yes | yes | yes |
| Public course catalogue/teacher page/course, avatar/banner, sitemap, robots | public | public | public | public |

\* Admin endpoints are read-only for courses/groups; admin does not call the
teacher endpoints. Admin can download any attachment and manually enroll a
student.

## Content access rules

- A student is "in a course" only through `group_students` → `groups.course_id`.
- Lesson access requires enrollment in that course and an unlocked lesson for
  at least one of the student's groups. `group_lesson_access` overrides the
  group's `unlock_all_by_default`.
- Lesson completion is an upsert only after the enrollment + unlock check.
  Uncompleting is allowed for the student's own completion row.
- Direct quiz reads resolve the quiz's course (lesson, module, or course quiz),
  require enrollment, and require the lesson to be unlocked when the quiz
  belongs to a lesson. Submissions additionally require the quiz to belong to
  the target group's course.
- Attachment download checks the attachment's course and optional group. Master
  files (no group) are visible to any enrolled group in the course; group files
  only to that group; both still require the lesson to be unlocked.
- Teachers can only attach objects under
  `courses/<courseId>/lessons/<lessonId>/` and set a course cover under
  `courses/<courseId>/cover/` for a course they own. Avatar keys must stay under
  `avatars/<userId>/`; banner keys under `banners/<userId>/`.
- Parents are read-only and must have a `parent_students` row. They cannot call
  student write endpoints, curriculum, lessons, quizzes, or attachments.
- Student progress is computed from unlocked lessons only, so locking a lesson
  cannot produce progress above 100%.

## Storage

- Presigned PUT for uploads (15 min) and presigned GET for downloads (1 hour);
  the API stores object keys, not durable URLs.
- Avatars: images only, max 2 MB. Lesson attachments: max 100 MB. File type is
  classified from the declared MIME type.
- Replaced/cleared avatars, banners, and course covers are deleted best-effort. Objects uploaded but never
  attached still need a bucket lifecycle rule.
- Public teacher avatars and banners are served through a published-teacher
  check, not a public bucket listing. Public catalogue and course detail
  resolve only published courses of a published, active teacher and expose no
  storage keys or lesson content.
- Lesson materials are readable only through the attachment download/file
  endpoints, which repeat the teacher ownership and student enrollment/unlock
  checks. The file endpoint 302s to a short-lived signed URL so inline previews
  do not expose bucket keys.

## Exports

Teacher CSV exports go through `frontend/src/lib/csv.ts`:

- RFC-4180 quoting for commas, quotes, and newlines.
- Any value starting with `=`, `+`, `-`, `@`, tab, or CR is prefixed with an
  apostrophe to stop spreadsheet formula execution.
- Files are UTF-8 with a BOM so Arabic renders correctly in Excel.

## Secrets and configuration

- `BETTER_AUTH_SECRET`, database credentials, and R2 credentials are
  environment variables, never committed.
- `FRONTEND_URL` controls CORS and trusted origins; `BETTER_AUTH_URL` must match
  the public API origin.
- `.env` files are local only. Production should inject secrets through the
  platform or a secret manager.

## Known gaps

- No email verification, password reset, or MFA flow yet.
- No malware scanning for uploaded files; uploads are size/type limited and
  served through presigned URLs.
- Redis is optional. Without it, lockout and throttle counters are per replica;
  losing Redis resets counters and the monthly-summary lock.
- Parent linking trusts knowledge of the student's registered phone number.
  Add an OTP challenge if abuse appears.
