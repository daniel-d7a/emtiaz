# 04: Frontend Teacher Homework Management, Due Dates & Grading Drawer UI

**What to build:** Build the Teacher web UI for managing homework on lessons, setting cohort due dates in group settings, and grading student submissions via an interactive grading drawer with aggregate metrics, file/link/text review, score input, teacher feedback textarea, and `Save Grade` / `Request Revision` actions.

**Blocked by:** [01: Homework Schema, Migrations, Shared Contracts & Teacher Homework CRUD](01-homework-schema-shared-contracts-and-teacher-crud.md), [02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine](02-student-submission-revisions-and-grading-engine.md), [03: Gradebook Integration & Parent Portal Homework Backend](03-gradebook-and-parent-portal-homework-backend.md).

**Status:** done

- [x] Add Homework assignment builder to Teacher Lesson edit view (title, instructions, max score, reference file upload or link input).
- [x] Add cohort due date picker and visibility toggle in Group schedule / lesson management.
- [x] Create "Homework Submissions" roster page & grading drawer displaying roster stats (*Total, Submitted, Graded, Pending, Revision Requested, Overdue*), student list with status badges, submission viewer, score input, feedback textarea, and `Save Grade` / `Request Revision` actions.
- [x] Update Group Gradebook table in Teacher view to render dynamic homework columns and scores.
- [x] Add bilingual Arabic & English i18n keys to `frontend/src/lib/i18n.tsx` with RTL layout support.
- [x] Verify with unit/component tests in `frontend/src/`.
