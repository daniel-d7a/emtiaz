# 06: Mobile Student Lesson Homework & Parent Portal Support

**What to build:** Add Homework support to the Expo mobile app across the student lesson viewer and the parent monitoring screen.

**Blocked by:** [01: Homework Schema, Migrations, Shared Contracts & Teacher Homework CRUD](01-homework-schema-shared-contracts-and-teacher-crud.md), [02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine](02-student-submission-revisions-and-grading-engine.md), [03: Gradebook Integration & Parent Portal Homework Backend](03-gradebook-and-parent-portal-homework-backend.md).

**Status:** done

- [x] In `mobile/src/api.ts`, verify full parity with backend homework endpoints.
- [x] Add Homework section to Student Lesson screen in `mobile/src/screens/` with due date badge, reference file download / link, and text/link submission form.
- [x] Display submission status, grade, teacher feedback, and revision requested status on mobile.
- [x] Add Homework tab / card to Parent screen showing child's upcoming assignments, due dates, scores, and teacher comments.
- [x] Verify `cd mobile && npm run typecheck`.
