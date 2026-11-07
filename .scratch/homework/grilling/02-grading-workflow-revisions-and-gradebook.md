# 02: Define Teacher Grading Workflow, Revision Requests & Gradebook Integration

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Homework & Submission Data Model, Files & Due Dates](01-homework-and-submission-data-model.md)

## Question

How does the teacher grade homework, request revisions, and view submissions in the group gradebook? Specifically:
1. What does the teacher's grading interface look like (list of enrolled students with statuses: `Not Submitted`, `Submitted`, `Late`, `Graded`, `Revision Requested`; preview of file/link/text; score input out of `maxScore`; teacher feedback textarea)?
2. How does the **Revision Request (`REVISION_REQUESTED`)** flow work (can a student resubmit while keeping submission history/turns; does the status revert to `SUBMITTED`; can a teacher cap the number of revisions)?
3. How do graded homework assignments integrate into the Group **Gradebook** (does each homework assignment automatically get a column, or can teachers toggle gradebook inclusion and customize max score weight)?

## Answer

1. **Teacher Grading Drawer & Roster Workflow**:
   - In Teacher Group/Lesson view, a dedicated "Homework Submissions" button opens a grading view with aggregate metrics (*Total Enrolled, Submitted, Graded, Pending Review, Revision Requested, Overdue*).
   - Clicking a student opens a grading drawer showing:
     - Student submission content (text note, external link button, or uploaded file preview/download).
     - Score input (`0` to `maxScore`).
     - Teacher feedback textarea.
     - Two primary actions:
       - **Save Grade**: updates `score`, `teacherFeedback`, sets `status = 'GRADED'`, and sets `gradedAt = now()`.
       - **Request Revision**: requires teacher feedback, sets `status = 'REVISION_REQUESTED'`, clears current score (if any), and notifies student.
2. **Revision Request Lifecycle**:
   - When status becomes `REVISION_REQUESTED`, student receives an in-app notification with teacher feedback and can edit/re-upload their work.
   - Upon resubmission, status transitions back to `SUBMITTED`, `revisionCount` increments by 1, `submittedAt` updates, and `isLate` is re-evaluated against `dueDate`.
   - Once marked `GRADED`, student cannot resubmit unless the teacher clicks "Allow Resubmission" or manually sets `REVISION_REQUESTED`.
3. **Gradebook Integration**:
   - The Group Gradebook endpoint dynamically aggregates homework assignments alongside quizzes and manual grade columns.
   - Each group homework assignment appears as a column showing title, `maxScore`, and each student's score or status badge (`Not Submitted`, `Submitted`, `Late`, `Revision Requested`, `Graded`).
   - Grade percentage computation includes graded homework: `earned += score` and `studentMax += maxScore`.
   - Ungraded submissions or submissions before due date do not penalize the overall grade; zeroed submissions factor in.
