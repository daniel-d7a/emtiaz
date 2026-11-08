# Ticket 01: Storage Authorization & Path Integrity (VULN-01, VULN-02, VULN-05)

## Overview & Background
During the security audit, two high/critical authorization issues were uncovered in `backend/src/modules/storage/storage.controller.ts`:
- `GET /api/storage/homework/:id/file` and `GET /api/storage/homework-submissions/:id/file` lacked user authorization verification (`req.user`), allowing any authenticated user to stream/download any student's homework submission file or teacher's homework file (IDOR/BOLA).
- Furthermore, caller-provided `r2ObjectKey` parameters in homework creation, update, and submission (`teacher.service.ts` and `student.service.ts`) were not validated against expected path prefixes, creating a risk of arbitrary object deletion or cross-course file attachment.

## Scope of Work

### 1. Storage Controller Authorization
In `backend/src/modules/storage/storage.controller.ts`:
- Update `GET /api/storage/homework/:id/file` to inject `@Req() req: Request`.
- Implement `readableHomework(user: { id: string; role: string }, homeworkId: string)`:
  - Query the homework row and join/query lesson, course, and enrollment.
  - If `ADMIN`: allow access.
  - If `TEACHER`: must own the course (`course.teacherId === user.id`).
  - If `STUDENT`: must be enrolled in an active group with access to this course, the lesson must be unlocked, and homework not hidden (`homework.is_hidden !== true`).
  - If `PARENT`: must have an active child link (`parent_student_links`) to a student enrolled in the course where the lesson is unlocked.
  - Otherwise throw `ForbiddenException` or `NotFoundException`.
- Update `GET /api/storage/homework-submissions/:id/file` to inject `@Req() req: Request`.
- Implement `readableSubmission(user: { id: string; role: string }, submissionId: string)`:
  - Query the homework submission row, joining homework, lesson, and course.
  - If `ADMIN`: allow access.
  - If `STUDENT`: must be the submitting student (`submission.studentId === user.id`).
  - If `TEACHER`: must own the course (`course.teacherId === user.id`).
  - If `PARENT`: must have an active child link to `submission.studentId`.
  - Otherwise throw `ForbiddenException` or `NotFoundException`.

### 2. Path Prefix Validation for R2 Keys
In `backend/src/modules/teacher/teacher.service.ts`:
- In `createHomework` and `updateHomework`:
  - If `r2ObjectKey` is provided, ensure it starts with `courses/${course.id}/lessons/${lessonId}/` or `courses/${course.id}/`.
  - If invalid prefix, throw `ForbiddenException('Invalid storage key prefix')`.
- In `updateHomework` and `deleteHomework`:
  - Only call `this.storage.deleteObject(key)` if `key.startsWith('courses/${course.id}/')`.
In `backend/src/modules/student/student.service.ts`:
- In `submitHomework`:
  - If `dto.r2ObjectKey` is provided, ensure it starts with `submissions/${homeworkId}/`.
  - If invalid prefix, throw `ForbiddenException('Invalid storage key prefix')`.
  - If deleting a prior submission's file on update, only delete if `existing.r2ObjectKey.startsWith('submissions/${homeworkId}/')`.

### 3. Documentation & Verification
- Update `docs/security.md` reflecting homework and submission storage authorization rules.
- Add or update tests in `backend/src/modules/storage/storage.service.spec.ts` (or controller spec) to assert that unauthorized students/teachers receive `ForbiddenException` or `NotFoundException`.
- Ensure `cd backend && npm run typecheck && npm test` passes.
