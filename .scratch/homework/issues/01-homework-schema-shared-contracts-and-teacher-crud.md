# 01: Homework Schema, Migrations, Shared Contracts & Teacher Homework CRUD

**What to build:** Add database tables for `homework`, `group_homework_access`, and `homework_submissions`, generate and apply migrations, define all DTO types and client methods across `shared/api.ts`, `frontend/src/lib/api.ts`, and `mobile/src/api.ts`, and implement Teacher Homework CRUD on lessons (`POST /api/teacher/lessons/:lessonId/homework`, `PATCH /api/teacher/homework/:id`, `DELETE /api/teacher/homework/:id`, and `PUT /api/teacher/groups/:groupId/homework/:homeworkId/access`). Teacher file attachments must validate quota via `assertCanUploadStorage`.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Create `homework`, `group_homework_access`, and `homework_submissions` tables in `backend/src/db/schema.ts` with indices and cascade rules.
- [x] Update `backend/src/db/schema.spec.ts` table list and run migrations (`npm run db:generate && npm run db:migrate`).
- [x] Define `HomeworkDto`, `HomeworkSubmissionDto`, `HomeworkRosterSummaryDto`, and related request/response contracts in `shared/api.ts`, `frontend/src/lib/api.ts`, and `mobile/src/api.ts`.
- [x] Implement Teacher CRUD endpoints in `teacher.controller.ts` & `teacher.service.ts` for homework on master lessons and group-scoped overrides, enforcing teacher lesson storage quota check (`assertCanUploadStorage`) on uploaded reference files.
- [x] Implement `PUT /api/teacher/groups/:groupId/homework/:homeworkId/access` to set cohort due date and visibility (`isHidden`).
- [x] Write integration tests in `backend/src/modules/teacher/teacher.spec.ts` verifying homework CRUD, group due date updates, and storage limit enforcement.
