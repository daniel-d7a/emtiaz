# 03: Gradebook Integration & Parent Portal Homework Backend

**What to build:** Integrate graded homework assignments dynamically into the teacher and student Gradebook overviews (`GET /api/teacher/groups/:groupId/gradebook` and `GET /api/student/groups/:groupId/gradebook`), factoring earned scores into the overall grade percentage calculation alongside quizzes and manual columns. Expose the Parent homework endpoint (`GET /api/parent/children/:studentId/homework`) returning all upcoming and completed homework for linked children with urgency flags for deadlines within 24 hours.

**Blocked by:** [02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine](02-student-submission-revisions-and-grading-engine.md).

**Status:** ready-for-agent

- [ ] Update `teacher.service.ts` gradebook overview to include visible group homework assignments as columns with `id`, `title`, `maxScore`, and each student's score or submission status.
- [ ] Incorporate graded homework scores into `earned += score` and `studentMax += maxScore` in teacher and student grade percentage calculations.
- [ ] Implement `GET /api/parent/children/:studentId/homework` ensuring strict parent-child authorization check, returning homework list, due dates, statuses, scores, and teacher comments.
- [ ] Add urgency helper returning `isUrgent: boolean` if an assignment is unsubmitted and due within 24 hours or overdue.
- [ ] Write integration tests in `backend/src/modules/teacher/teacher.spec.ts` and `backend/src/modules/parent/parent.spec.ts` verifying gradebook percentage math, parent-child security boundaries, and urgency calculations.
