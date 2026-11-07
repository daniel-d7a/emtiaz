# 02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine

**What to build:** Implement the student homework view and submission endpoints (`GET /api/student/groups/:groupId/lessons/:lessonId/homework`, `POST /api/student/groups/:groupId/homework/:homeworkId/submit`), enforcing 10MB file upload limits (without charging against teacher plan storage) and late flag calculation. Implement the teacher grading drawer endpoint (`GET /api/teacher/groups/:groupId/homework/:homeworkId/submissions`) returning aggregate roster metrics, and the grading action endpoint (`POST /api/teacher/groups/:groupId/homework/:homeworkId/submissions/:studentId/grade`) supporting `Save Grade` (`GRADED`) and `Request Revision` (`REVISION_REQUESTED`). Student resubmission must increment `revisionCount` and revert status to `SUBMITTED`. Dispatch in-app notifications via `NotificationsService.sendInApp`.

**Blocked by:** [01: Homework Schema, Migrations, Shared Contracts & Teacher Homework CRUD](01-homework-schema-shared-contracts-and-teacher-crud.md).

**Status:** done

- [x] Implement `GET /api/student/groups/:groupId/lessons/:lessonId/homework` returning assignment details, group due date, and the student's submission.
- [x] Implement `POST /api/student/groups/:groupId/homework/:homeworkId/submit` supporting text, external links, or file uploads ($\le$ 10MB); auto-evaluate `isLate = submittedAt > dueDate` when due date is present.
- [x] Support student resubmission after `REVISION_REQUESTED`, incrementing `revisionCount`, updating `submittedAt`, and resetting status to `SUBMITTED`.
- [x] Implement `GET /api/teacher/groups/:groupId/homework/:homeworkId/submissions` calculating aggregate roster metrics (*totalEnrolled, submitted, graded, pendingReview, revisionRequested, notSubmitted, late*) and returning each student's submission.
- [x] Implement `POST /api/teacher/groups/:groupId/homework/:homeworkId/submissions/:studentId/grade` for teachers to set `score` ($\le$ `maxScore`), add `teacherFeedback`, mark `GRADED`, or request revision `REVISION_REQUESTED`.
- [x] Dispatch in-app notifications on assignment, grading, and revision requests to student and linked parents.
- [x] Add integration tests in `backend/src/modules/student/student.spec.ts` and `backend/src/modules/teacher/teacher.spec.ts` covering submission, grading, resubmission, and notification dispatch.
