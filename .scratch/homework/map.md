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

## Next Step

Synthesize all decisions into `.scratch/homework/spec.md` (`to-spec`), then slice into vertical implementation tickets (`to-tickets`).

## Out of scope

- AI auto-grading of student homework files/text (tracked under future AI ideas).
- Plagiarism checking services.
