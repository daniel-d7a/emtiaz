# 03: Centralized Audit Registry, Domain Event Logging & Admin Dashboard Upgrades

**What to build:** Create `shared/audit-events.ts` as the single typed source of truth defining all domain actions across Curriculum, Quizzes, Cohorts, Homework, Billing, and Auth. Emit structured domain audit events with mandatory `actorId` and `createdAt` timestamp. Upgrade the Admin Audit dashboard in `frontend/src/pages/admin/Audit.tsx` with User ID search, category dropdown filters, color-coded action badges, and an event inspection modal.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Create `shared/audit-events.ts` cataloging all domain actions with category, Arabic/English labels, target type, and payload schema.
- [x] Ensure explicit domain audit emissions in:
  - Curriculum: `course.create`, `course.update`, `course.delete`, `lesson.create`, `lesson.update`, `lesson.delete`.
  - Quizzes: `quiz.create`, `quiz.update`, `quiz.delete`, `quiz.submit`.
  - Cohorts: `group.create`, `group.update`, `group.delete`, `student.enroll`, `student.remove`, `entry_code.generate`, `attendance.mark`.
  - Homework: `homework.create`, `homework.update`, `homework.delete`, `homework.submit`, `homework.grade`, `homework.revision_request`.
- [x] In `backend/src/modules/admin/admin.controller.ts` & `admin.service.ts`:
  - Enhance `GET /api/admin/audit` to support filtering by `userId` (actor ID or target ID) and `category`.
- [x] In `frontend/src/pages/admin/Audit.tsx`:
  - Add User ID search input.
  - Add Category filter dropdown (`All`, `Curriculum`, `Cohorts`, `Quizzes`, `Homework`, `Users & Billing`, `Auth`).
  - Add color-coded badges for action types.
  - Add detail inspection modal to view event metadata diffs.
- [x] Add integration tests in `admin.spec.ts` and component test in `Audit.spec.tsx`.
