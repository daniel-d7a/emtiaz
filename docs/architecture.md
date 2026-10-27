# Architecture

Current system overview. This is the authoritative description of what is
deployed; [`master_plan.md`](../master_plan.md) is the original product brief
and is historical.

## Surfaces

| Surface | Path | Stack | Served by |
|---|---|---|---|
| Web app | `/` | React 18, Vite 8, Tailwind v4, TanStack Router/Query | Caddy (`web/`) |
| Marketing | `/landing/`, `/landing/teachers` | Static HTML/CSS/JS, bilingual | Caddy (`landing/`) |
| Teacher page | `/t/<slug>` | Web app + public API | Caddy + API |
| Mobile | Expo / React Native | React Navigation native stacks | Expo Go / app stores |
| API | `/api/*` | NestJS 11, Drizzle 1, Better Auth | Caddy → API |

## Runtime topology

```text
browser / phone
      |
      v
Caddy :80 (host :8088)
  ├── /                 -> built React SPA
  ├── /landing/*        -> static marketing pages
  ├── /sitemap.xml      -> API
  ├── /robots.txt       -> API
  └── /api/*            -> Nest API :3000 (host :3100)
                                ├── PostgreSQL 16
                                ├── Redis 7 (optional shared state)
                                └── RustFS (dev) / Cloudflare R2 (prod)
```

Docker Compose runs `web`, `api`, `db`, `redis`, and `rustfs`; a one-shot
`rustfs-init` container creates the bucket. See
[`docker-compose.yml`](../docker-compose.yml).

## Backend modules

| Module | Responsibility |
|---|---|
| `onboarding` | Role signup, `GET/PATCH /api/me`, avatar URL, categories, health |
| `student` | Groups, join-by-code, curriculum, lesson view/completion, quizzes, grades, parent-code rotation |
| `teacher` | Home stats, course/module/lesson CRUD, quizzes, groups (with days), pacing, roster, announcements, gradebook |
| `admin` | Global metrics, directories, suspend/delete, manual enrollment, taxonomy, notifications, audit |
| `parent` | Link/unlink children by student phone, read-only progress, attendance, grades, and delivered reports |
| `public` | Published course catalogue, teacher storefront/course detail, avatar/banner, support contacts, sitemap, robots |
| `storage` | Presigned uploads, attachment records/downloads, avatars, banners |
| `notifications` | In-app inbox, announcements, enrollment notices, monthly parent summaries, channel settings |

Global providers in `app.module.ts`: Redis-backed throttler (when configured),
`AuthGuard`, and `RolesGuard`. Better Auth handles `/api/auth/*` directly; a
login-lockout middleware runs in front of its sign-in routes.

## Identity and data model

There is one authentication identity table, `user`, with a `role` enum:
`ADMIN`, `TEACHER`, `STUDENT`, `PARENT`. Sessions and accounts reference that
row. Role-specific fields live on the same row (`landing_*` for teachers,
`grade_id` and `date_of_birth` for students, `subject_category_id` for teachers). The rationale and the future profile-table option are in
[ADR-0015](./adr/0015-single-user-table.md).

Core relationships:

- `courses.teacher_id → user.id`
- `groups.course_id → courses.id`; `groups.days` holds the display schedule
- `group_students(group_id, student_id)` — enrollment, unique pair
- `group_lesson_access(group_id, lesson_id, is_unlocked)` — per-group pacing;
  absence falls back to `groups.unlock_all_by_default`
- `parent_students(parent_id, student_id)` — many-to-many, unique pair
- `lesson_attachments.lesson_id`, optional `group_id` for group-only files
- `quizzes` target exactly one of lesson, module, or course
- `quiz_attempts(student_id, group_id, quiz_id)` — best score feeds the gradebook
- `lesson_completions(lesson_id, student_id)` — unique pair
- `lesson_attendance(lesson_id, student_id, is_present)` — unique pair
- `parent_reports(parent_id, student_id, message)` — delivered monthly summaries
- `manual_grade_columns` + `manual_grade_values` — teacher-entered columns
- `inbox_notifications.user_id`, `notifications`, `audit_logs.actor_id`
- `notification_settings` — single global row (`id = 'global'`)

Users are soft-deleted (`deleted_at`) and can be suspended (`is_active`).
Domain rows generally cascade from `user` or `course` where history is not
needed; audit and notification history remain.

## Authorization invariants

Full matrix and storage/export rules: [`security.md`](./security.md).

- Students can read/complete a lesson only when enrolled in a group for that
  course and the lesson is unlocked for at least one of those groups.
- Direct quiz reads and submissions enforce the same enrollment/course check;
  lesson quizzes also require the lesson to be unlocked.
- Attachments require the owning teacher, an admin, or an enrolled student in
  the attachment's group (or any enrolled group for master files) with the
  lesson unlocked.
- Group joins are student-only. Parents are read-only and must be linked to the
  student through `parent_students`.
- Progress counts only currently unlocked lessons, so locking a lesson cannot
  push progress above 100%.

## Storage

Uploads are direct-to-object-store using presigned PUT URLs. The API stores
object keys, never permanent URLs. Two S3 clients exist because the endpoint
reachable by the API container differs from the endpoint reachable by the
browser ([ADR-0009](./adr/0009-two-s3-clients.md)). `npm run s3:init` creates
the bucket and sets browser CORS for the configured frontend origins.

- Lesson attachments: `courses/<courseId>/lessons/<lessonId>/…`, max 100 MB.
- Avatars: `avatars/<userId>/…`, images only, max 2 MB; `user.image` holds the
  key and `GET /api/me/avatar` redirects to a fresh presigned GET.
- Published teacher avatars are available publicly at
  `/api/public/teachers/<slug>/avatar`.
- Replaced/cleared avatars are deleted best-effort; orphaned uploads still need
  a bucket lifecycle rule.

## Notifications

- In-app inbox: list, unread count, mark one/all read.
- Teacher announcements notify enrolled students and deduplicated linked
  parents.
- Manual/bulk enrollment and moves notify the student and linked parents.
- Monthly parent summary runs on the 1st, with a Redis `SET NX` lock so only
  one replica sends it. It uses in-app, email, and WhatsApp adapters and stores
  one delivered report per child in `parent_reports`.
- WhatsApp/email adapters are selected by environment; without provider
  configuration they fall back to mock senders. Notification failures are
  logged and never fail the primary action.

## Web app

- Code-based TanStack Router with role guards in `beforeLoad` and query
  prefetching in loaders ([ADR-0008](./adr/0008-tanstack-router.md)).
- TanStack Query owns server state; there is no Zustand store.
- Pages: home, public course catalogue, login/register, join, profile,
  student home/catalogue/group/lesson/quiz, teacher dashboard/new course/
  course groups/course/group/public landing/public course, parent children/
  profile, admin dashboard (teachers, students, parents, courses, notifications,
  taxonomy, audit).
- Arabic-first RTL with an English switch; shared strings live in
  `frontend/src/lib/i18n.tsx`.
- Teachers own a theme in `user.landing_theme` (layout, two colours, marquee,
  Arabic/English fonts) plus a banner key. `ThemeSurface`/`ThemeHero`
  (`frontend/src/components/TeacherTheme.tsx`) apply it to the public page,
  teacher dashboard, and student group view. Missing or invalid values fall back
  to `DESIGN.md` defaults via `normalizeTheme`.
- The profile page is an update flow split into account and public-page
  columns; the public-page column is a live theme preview.

## Mobile app

- Expo / React Native with role-specific React Navigation native stacks
  ([ADR-0013](./adr/0013-mobile-react-navigation.md)).
- Student: home, groups, join, curriculum, lesson, quiz, profile, notifications.
- Teacher: course/group summaries, pacing, roster, announcements, profile,
  notifications.
- Parent: link/unlink children, progress, attendance, grades, delivered reports, notifications.
- Admin remains web-only.
- API base derives from Metro `hostUri` in development; release builds need a
  hardcoded production URL in `mobile/src/api.ts`.

## Landing

`landing/index.html` is the general bilingual marketing page; `landing/teachers.html`
targets teachers. Both share `styles.css` and an inline `data-t` translation
dictionary, so there is no build step. Caddy resolves extensionless page URLs.
Per-teacher pages are not static: `/t/<slug>` is a web route backed by
`GET /api/public/teachers/<slug>`, and published slugs are listed in
`sitemap.xml`. The storefront filters published courses by type and links to
`/t/<slug>/courses/<id>`, backed by
`GET /api/public/teachers/<slug>/courses/<id>` (course image, description,
preview video/link, and an outline of module/lesson titles). `/courses` is a
public catalogue backed by `GET /api/public/courses`, with server-side search
and teacher, specialization, grade, type, and semester filters. It only returns
published courses from published, active teachers, and each card carries its
teacher's theme. Both storefront pages share the teacher theme and a footer with
the teacher's contact details plus the admin-configured platform support
contacts.

## Deployment and operations

- `web/Dockerfile` builds the SPA and copies `landing/` into Caddy.
- Caddy sets security headers, compresses, proxies `/api`, and falls back to
  `index.html` for SPA routes.
- GitHub Actions runs backend/frontend/mobile typecheck, backend/frontend
  tests, the frontend build, and a Compose validation/build.
- Postgres and the object store are backed up by `scripts/backup.sh`; see
  [`runbook-backups.md`](./runbook-backups.md). Redis is ephemeral and is not
  backed up.
- Structured JSON request logs with request IDs are documented in
  [ADR-0010](./adr/0010-structured-logging.md).

## Documentation map

- [`README.md`](./README.md) — docs index and ADR list
- [`security.md`](./security.md) — authorization matrix and hardening
- [`gradebook.md`](./gradebook.md) — quiz vs manual grade columns
- [`runbook-backups.md`](./runbook-backups.md) — backup/restore
- [`adr/`](./adr/) — architecture decisions
