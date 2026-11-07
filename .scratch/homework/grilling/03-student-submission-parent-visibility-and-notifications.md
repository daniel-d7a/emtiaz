# 03: Define Student Submission UX, Parent Visibility & Notifications

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Homework & Submission Data Model, Files & Due Dates](01-homework-and-submission-data-model.md), [02: Define Teacher Grading Workflow, Revision Requests & Gradebook Integration](02-grading-workflow-revisions-and-gradebook.md)

## Question

How do students experience homework, how do parents monitor it, and what notifications are delivered? Specifically:
1. What does the student experience look like in the web and mobile lesson view (Homework section with assignment details, download reference file / open link, upload submission file or paste link or type text, status badge, due date countdown, and late warning)?
2. What does a linked Parent see on web and mobile (child's homework list, submission status, grade, teacher feedback, and overdue alerts)?
3. What in-app and WhatsApp notifications are triggered (when homework is assigned with a due date, when a teacher marks/returns a submission with feedback, and reminder before due date)?

## Answer

1. **Student Submission UX (Web & Mobile)**:
   - On the Lesson screen, underneath video and lesson resources, a dedicated **Homework** card renders:
     - Title, instructions, `maxScore`, and teacher reference file (download button) or link.
     - Due date countdown banner (e.g. "Due in 2 days" or "Overdue").
     - 3-way submission selector: Text note, external URL, or file upload (PDF, DOC/DOCX, PNG/JPEG $\le$ 10MB).
     - Live status badge: `Not Submitted`, `Submitted`, `Late`, `Revision Requested` (with teacher feedback highlighted), or `Graded` (displaying score e.g. `9 / 10` and feedback).
2. **Parent Portal Visibility (Web & Mobile)**:
   - In Parent view (`/parent` on Web and Parent tab on Mobile), under the student's enrolled courses/groups, a **Homework** section lists all assignments.
   - For each assignment, displays: Title, Due Date, Status badge, Score (if graded), and Teacher Feedback.
   - Shows an overdue or urgent attention badge if an assignment is due within 24 hours or past due without a submission.
3. **Notification Triggers**:
   - In-app notification delivered to student and linked parents when:
     1. A teacher assigns/publishes homework with a due date to the student's group.
     2. A teacher marks homework as `GRADED` (with score and feedback) or returns it as `REVISION_REQUESTED` (with feedback).
     3. An automatic reminder 24 hours before the due date if the student has not yet submitted.
