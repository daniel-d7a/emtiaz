# 01: Define Homework & Submission Data Model, Files & Due Dates

**Type:** grilling
**Status:** resolved
**Blocked by:** None (can start immediately)

## Question

What is the exact data model and lifecycle for Homework assignments, per-group due dates, and student submissions? Specifically:
1. What fields belong on the `homework` table (`lessonId`, optional `groupId` override, `title`, `instructions`, `attachmentType`, `r2ObjectKey`, `linkUrl`, `fileSizeBytes`, `mimeType`, `maxScore`, `displayOrder`)?
2. How are cohort-specific due dates and visibility managed (e.g., `group_homework_access` table with `groupId`, `homeworkId`, `dueDate`, `isHidden`)?
3. How are student submissions structured (`homework_submissions` table: `homeworkId`, `groupId`, `studentId`, `content`, `r2ObjectKey`, `linkUrl`, `fileSizeBytes`, `mimeType`, `status`: `'SUBMITTED' | 'GRADED' | 'REVISION_REQUESTED'`, `submittedAt`, `isLate`)?
4. How do file uploads for homework assignments and submissions count toward teacher or student storage quotas?

## Answer

1. **`homework` table (Master Curriculum & Group Overrides)**:
   - Fields: `id` (uuid PK), `lessonId` (FK `lessons.id`, cascade), `groupId` (nullable FK `groups.id`, cascade — null = master course assignment, populated = group-specific override), `title`, `instructions`, `attachmentType` (`NONE` | `PDF` | `DOC` | `IMAGE` | `LINK`), `r2ObjectKey`, `url`, `fileSizeBytes`, `mimeType`, `maxScore` (integer, default 10), `displayOrder` (integer default 0), `createdAt`.
2. **`group_homework_access` table (Cohort Pacing & Due Dates)**:
   - Fields: `id` (uuid PK), `groupId` (FK `groups.id`, cascade), `homeworkId` (FK `homework.id`, cascade), `dueDate` (nullable timestamp), `isHidden` (boolean default false).
   - Unique constraint on `(groupId, homeworkId)`.
3. **`homework_submissions` table (Student Submissions)**:
   - Fields: `id` (uuid PK), `homeworkId` (FK `homework.id`, cascade), `groupId` (FK `groups.id`, cascade), `studentId` (FK `users.id`, cascade), `content` (text for student notes), `attachmentType` (`NONE` | `PDF` | `DOC` | `IMAGE` | `LINK`), `r2ObjectKey`, `url`, `fileSizeBytes`, `mimeType`, `status` (`SUBMITTED` | `GRADED` | `REVISION_REQUESTED`), `isLate` (boolean, evaluated as `submittedAt > dueDate` when `dueDate` is present), `submittedAt` (timestamp default now), `score` (nullable integer $\le$ `maxScore`), `teacherFeedback` (nullable text), `gradedAt` (nullable timestamp).
   - Unique constraint on `(homeworkId, groupId, studentId)`.
4. **Storage Quota Accounting**:
   - Teacher homework reference files count toward the teacher's `Lesson Storage Usage` quota.
   - Student submission uploads are capped at 10 MB per file, stored with student metadata, and do not consume the teacher's plan storage quota.
