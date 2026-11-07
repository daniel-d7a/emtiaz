# Homework Feature (`wayfinder:map`)

## Destination

Produce `.scratch/homework/spec.md` (and any required architecture updates) covering teacher homework creation on lessons (files, links, instructions, max score), per-group due dates and late submission handling, student submission workflows (files, links, text), teacher grading with feedback and revision requests, automatic gradebook reflection, parent progress visibility, and student/parent notifications.

## Notes

- **Domain**: Course Curriculum, Group Cohorts, Submissions, Grading & Gradebook.
- **Skills to consult**: `grilling`, `domain-modeling`, `emtiaz-api`, `emtiaz-authz`, `emtiaz-ui`, `emtiaz-mobile`.
- **Standing preferences**:
  - Homework definition lives on `Lesson` (master curriculum); due dates live on the `Group` (cohort pacing).
  - Submissions can contain uploaded files, external links, or text notes.
  - Teachers can score, provide feedback, or return a submission for revision (`REVISION_REQUESTED`).
  - Marked homework grades reflect automatically in the group gradebook.
  - Linked parents have read-only visibility into homework status, grades, and teacher feedback.

## Decisions so far

- [01: Homework & Submission Data Model, Files & Due Dates](grilling/01-homework-and-submission-data-model.md): Master curriculum `homework` table on `lessons.id` with optional `groupId` override; cohort due dates and visibility on `group_homework_access`; student submissions on `homework_submissions` with file/link/text, 10MB limit (not charged against teacher storage), status enum (`SUBMITTED`, `GRADED`, `REVISION_REQUESTED`), and `isLate` flag.
- [02: Define Teacher Grading Workflow, Revision Requests & Gradebook Integration](grilling/02-grading-workflow-revisions-and-gradebook.md): Teacher grading view and student drawer with score, feedback, `GRADED` / `REVISION_REQUESTED` actions; single submission record with `revisionCount` incrementing on student resubmission; dynamic gradebook integration calculating homework score into student grade percentage.
- [03: Define Student Submission UX, Parent Visibility & Notifications](grilling/03-student-submission-parent-visibility-and-notifications.md): Student lesson view card with countdown and 3-way submission; parent portal read-only list with urgency alerts; in-app notification triggers on assignment, grading/revision, and 24h due date reminder.

## Implementation Tickets (Completed)

- [x] [01: Homework Schema, Migrations, Shared Contracts & Teacher Homework CRUD](issues/01-homework-schema-shared-contracts-and-teacher-crud.md)
- [x] [02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine](issues/02-student-submission-revisions-and-grading-engine.md)
- [x] [03: Gradebook Integration & Parent Portal Homework Backend](issues/03-gradebook-and-parent-portal-homework-backend.md)
- [x] [04: Frontend Teacher Homework Management, Due Dates & Grading Drawer UI](issues/04-frontend-teacher-homework-curriculum-due-dates-and-grading-ui.md)
- [x] [05: Frontend Student Lesson Homework Card & Parent Portal UI](issues/05-frontend-student-lesson-homework-and-parent-portal-ui.md)
- [x] [06: Mobile Student Lesson Homework & Parent Portal Support](issues/06-mobile-student-lesson-homework-and-parent-screen.md)

## Status: Complete

## Out of scope

- AI auto-grading of student homework files/text (tracked under future AI ideas).
- Plagiarism checking services.
