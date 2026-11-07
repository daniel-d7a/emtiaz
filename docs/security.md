# Security model

What the API enforces today. Decisions live in the linked ADRs; this page is
the checklist to keep in mind when adding endpoints or screens.

## Authentication

- Better Auth email/password and phone-number/password sessions, stored in
  PostgreSQL and sent as HTTP-only cookies (`/api/auth/*`). Session lifetime is
  30 days, extended every 24 hours. Phone numbers are normalized before lookup;
  phone-only accounts use a synthetic `<digits>@phone.emtiaz.om` email so email
  sign-in and admin tooling keep working.
- Bulk-added students receive a temporary password equal to their phone digits
  and `must_change_password = true`. The web and mobile apps force those users
  to `/change-password` before any other screen. `POST /api/me/change-password`
  requires the current password and clears the flag.
- The global `AuthGuard` verifies the session against the database on every
  guarded request and ignores Better Auth's 5-minute cookie cache, so a
  suspended or deleted user cannot keep using a cached session.
- Suspended users (`is_active = false`) get `403`. Deleting a user is a soft
  delete that also sets `is_active = false` and revokes sessions while keeping
  `group_students` rows intact (roster, gradebook, attendance, count, and
  notification queries filter `users.deleted_at IS NULL` so restoring a student
  restores their group memberships and grades). Temporarily suspended students
  remain visible in teacher rosters and gradebooks; soft-deleted or suspended
  teachers have their courses and groups hidden from public, student, and parent
  views and blocked from new joins. Courses, groups, and parent-child links are
  soft-deleted too: every non-deleted admin, teacher, student, parent, and
  public query filters `deleted_at`. Admins can restore any soft-deleted row
  from the matching directory; restored users are active again, and restored
  courses/groups return to their owner's lists. Restores are audited.
- Inactive groups (`groups.is_active = false`) are read-only for already-enrolled
  students and linked parents, and reject student writes (`submitQuiz`,
  `markComplete`, `unmarkComplete`) as well as new enrollments (`joinGroupByCode`,
  `bulkAddStudents`, `moveStudent`, `adminEnroll`) until reactivated.
- Sign-in lockout: after `LOGIN_LOCKOUT_MAX` failures (default 5) for the same
  email or phone number within `LOGIN_LOCKOUT_WINDOW_MS` (default 15 min), sign-in
  returns `429` with `Retry-After` for `LOGIN_LOCKOUT_MS` (default 15 min). A
  successful sign-in clears the counter.
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

An `ADMIN` also needs the route's admin permission. `admin_roles` stores a
permission list and `user.admin_role_id` links an admin to one; the global
`AdminPermissionGuard` checks `@RequirePermission(...)`. An admin with no
assigned role keeps full access. Assigning a role never grants teacher, student,
or parent ownership rights.

## Authorization matrix

| Action | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| Global metrics, directories, suspend/delete/restore, taxonomy, audit | with permission | no | no | no |
| Create/edit own courses, modules, lessons, quizzes | no* | owner | no | no |
| Create groups, pacing, roster, announcements, gradebook | no* | owner | no | no |
| Read/write lesson attendance | no | owner | no | no |
| Read group statistics | no* | owner | no | no |
| Search students by phone to add to a roster | no | students only | no | no |
| Join a group by code | no | no | yes | no |
| Generate/read group entry codes | no | owner | no | no |
| Read own groups, curriculum, lessons, quizzes | no | no | enrolled | no |
| Complete/uncomplete a lesson | no | no | enrolled + unlocked | no |
| Submit a quiz | no | no | enrolled + group course | no |
| Grade written quiz answers | no | owner | no | no |
| Read own grades | no | no | enrolled | no |
| Read a linked child's progress, attendance, grades, reports | no | no | no | linked |
| Link/unlink a child by student monitoring code or QR | no | no | no | yes |
| Download lesson attachment | yes | owner | enrolled + unlocked | no |
| Upload/manage attachments | no | owner | no | no |
| Upload own avatar | yes | yes | yes | yes |
| Upload own banner | no | yes | no | no |
| Read own inbox / mark read | yes | yes | yes | yes |
| Public course catalogue/teacher page/course, avatar/banner, sitemap, robots | public | public | public | public |

\* Admin endpoints manage courses/groups only for moderation (soft-delete and
restore); editing course content still belongs to the owning teacher. Admin can
download any attachment and manually enroll a student. Teacher course creation may resolve a missing shared grade or skill
name into the taxonomy; editing or deleting taxonomy entries stays admin-only.

### Teacher Plans & Entitlements

- Students and parents are permanently free; only teachers hold subscription
  entitlements ([ADR-0020](./adr/0020-teacher-plans-and-entitlements.md)).
- Plan upgrades are fulfilled by Administration via WhatsApp (`supportWhatsapp`),
  promo codes, or referral codes — there is no automated payment gateway or
  public billing webhook.
- Expired teachers whose active student count or lesson storage exceeds `Free`
  plan limits enter the Upgrade Gate (blocking teacher workspace mutations except
  viewing plans, redeeming codes, or contacting Administration), while enrolled
  students and linked parents keep normal access.

## Content access rules

- Group entry codes are owner-only. Joining a protected group requires a code that belongs to that group and has remaining uses. Re-joining an existing membership does not consume a use. A use is recorded per `(entry_code, student)` and the counter is incremented only when that student first uses the code.
- A student is "in a course" only through `group_students` → `groups.course_id`.
- Lesson access requires enrollment in that course and an unlocked lesson for
  at least one of the student's groups. `group_lesson_access` overrides the
  group's `unlock_all_by_default`.
- A hidden lesson is absent from curriculum, lesson views, completion writes,
  progress totals, group stats, and gradebook attendance calculations. A hidden
  quiz is absent from curriculum, group stats, and gradebook columns, and is
  rejected by direct reads and submissions for that group; `group_quiz_access`
  stores only per-group visibility, never quiz content.
- Attendance is owner-only for the group's course. Marks are upserted per
  `(lesson, student)` and only for students enrolled in that group; the lesson
  must belong to the group's course. Student attendance percentage across
  Parent, Admin, and Teacher views divides `is_present = true` marks by total
  marked (`is_present` recorded) visible lessons for that student (`0%` when no
  lessons have been marked yet).
- Lesson completion is an upsert only after the enrollment + unlock check.
  Uncompleting is allowed for the student's own completion row.
- Direct quiz reads resolve the quiz's course (lesson, module, or course quiz),
  require enrollment, and require the lesson to be unlocked when the quiz
  belongs to a lesson. Submissions additionally require the quiz to belong to
  the target group's course.
- Written answers are never auto-graded. An attempt with written questions
  stays pending until the course-owning teacher grades every written question;
  grading is owner-only, validates the attempt belongs to that teacher's
  course, and recomputes the score from objective answers plus written grades
  (`0..question.points` each, default 10).
- Attachment download checks the attachment's course and optional group. Master
  files (no group) are visible to any enrolled group in the course; group files
  only to that group; both still require the lesson to be unlocked and visible
  in that group (`StudentService.getLesson` only returns group-scoped attachments
  for the requested `groupId`, or for enrolled groups where that lesson is
  currently visible and unlocked). External
  link materials live on the attachment row and are only returned to readers
  who can see the lesson; deleting a material is owner-only and also deletes
  the stored object when one exists.
- Teachers can only attach objects under
  `courses/<courseId>/lessons/<lessonId>/` and set a course cover under
  `courses/<courseId>/cover/` for a course they own. Avatar keys must stay under
  `avatars/<userId>/`; banner keys under `banners/<userId>/`.
- Parents are read-only and must have a `parent_students` row. They cannot call
  student write endpoints, curriculum, lessons, quizzes, or attachments. Child
  attendance and delivered reports are returned only for linked students.
- Student progress is computed from visible, unlocked lessons only, so locking
  or hiding a lesson cannot produce progress above 100%.

## Storage

- Presigned PUT for uploads (15 min) and presigned GET for downloads (1 hour);
  the API stores object keys, not durable URLs.
- Avatars: images only, max 2 MB. Lesson attachments: max 100 MB. Quiz question
  images: images only, max 5 MB. Uploads are typed from the declared MIME type;
  URL materials are classified as a YouTube video or an external link.
- Replaced/cleared avatars, banners, and course covers are deleted best-effort.
  Client cleanup after a failed save is limited to the caller's own
  `avatars/<userId>/` or `banners/<userId>/` prefix, or a course they own.
  Objects uploaded but never attached still need a bucket lifecycle rule.
- Public teacher avatars and banners are served through a published-teacher
  check, not a public bucket listing. Public catalogue and course detail
  resolve only published courses of a published, active teacher and expose no
  storage keys or lesson content.
- Quiz question images are signed only on quiz payloads after the same
  enrollment/unlock checks; teachers may use only keys under their course's
  `quiz/` prefix.
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
- Parent linking uses the student's unique `monitoring_code` or QR code;
  knowledge of phone number alone does not grant access to student records.
