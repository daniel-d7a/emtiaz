---
name: emtiaz-authz
description: Use when adding or changing any API endpoint, query, or screen that reads or writes student, teacher, parent, or admin data — especially enrollments, lesson locks, attachments, grades, groups, rosters, or soft deletes. Enforces the docs/security.md invariants before the change ships.
---

# Emtiaz authorization

Read `docs/security.md` (matrix + content rules) and the relevant ADR before touching access. Role alone never grants access.

## Workflow

1. Name the actor, the resource, and the relation that must hold (owner, enrollee, linked parent, admin).
2. Choose the gate: `@Public()` for genuinely public data, `@Roles(...)` for the role, plus an ownership/enrollment/link check in the service.
3. Write the denial case first: wrong role → 403, wrong owner → 403, missing or soft-deleted row → 404.
4. Implement with the existing helper shape (`assertCourseAccess` in `backend/src/modules/teacher/teacher.service.ts`, enrollment/unlock checks in `student.service.ts`, `parent_students` in `parent.service.ts`).
5. Update the matrix in `docs/security.md` whenever a new action appears.
6. Run `npm test` in `backend/`.

## Invariants

- **Soft delete and suspension.** List/detail queries filter `deleted_at IS NULL`; suspended (`is_active = false`) gets 403. The global `AuthGuard` verifies the session against the DB on every request.
- **Students.** In a course only through `group_students → groups.course_id`. Lesson read/complete requires enrollment and unlock (`group_lesson_access`, falling back to `groups.unlock_all_by_default`). Quiz reads resolve the quiz's course (lesson, module, or course) and apply the same check; submissions additionally require the quiz to belong to the target group's course.
- **Progress** counts only currently unlocked lessons, so locking cannot push it over 100%.
- **Attachments.** Teacher owner or admin; student enrolled and lesson unlocked. Group files are only for that group; master files (no group) for any enrolled group. Teacher uploads must stay under `courses/<courseId>/lessons/<lessonId>/`; avatars under `avatars/<userId>/`.
- **Parents** are read-only and require a `parent_students` row. They cannot call student writes, curriculum, lessons, quizzes, or attachments.
- **Admin** may read teacher courses/groups but does not call teacher mutation endpoints.
- **CSV exports** go through `frontend/src/lib/csv.ts` (formula-injection escaping, RFC-4180 quoting, UTF-8 BOM).

## Done when

The diff names each gate it relies on; specs cover both the allowed and denied path; `docs/security.md` matches the new behaviour.
