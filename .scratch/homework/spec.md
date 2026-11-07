# Homework & Submissions Specification

**Status:** implemented

## Problem Statement

In Emtiaz, teachers can create courses with modules, lessons, and quizzes, and run cohort groups. However, there is no first-class Homework system. Teachers cannot assign homework with explicit instructions, reference materials, due dates, or maximum scores; students cannot submit work (text, file uploads, or external links); teachers cannot review, grade, provide feedback, or request revisions; homework grades are absent from the group gradebook; and parents have no visibility into their children's homework deadlines, submission status, or teacher comments.

## Solution

Introduce a comprehensive Homework & Submissions system spanning the database, backend API, web app, and mobile app:

1. **Master Curriculum & Cohort Due Dates**:
   - `homework`: Created on `lessons.id` as part of the master course curriculum (with an optional `groupId` override for group-specific homework). Supports `title`, `instructions`, `attachmentType` (`NONE`, `PDF`, `DOC`, `IMAGE`, `LINK`), reference file (`r2ObjectKey`, `url`, `fileSizeBytes`, `mimeType`), `maxScore` (default 10), and `displayOrder`.
   - `group_homework_access`: Tracks cohort pacing per group (`groupId`, `homeworkId`), with custom `dueDate` (nullable timestamp) and `isHidden` (boolean default false).
2. **Student Submission Lifecycle & Revision Requests**:
   - `homework_submissions`: Unique per `(homeworkId, groupId, studentId)`.
   - Supports 3 submission modes: Text note (`content`), external URL (`url`), or file upload (`r2ObjectKey`, `fileSizeBytes`, `mimeType` $\le$ 10MB).
   - Status transitions:
     - `SUBMITTED`: Student has turned in their work. `isLate` is automatically set if `submittedAt > dueDate`.
     - `GRADED`: Teacher has assigned a score ($\le$ `maxScore`) and optional feedback.
     - `REVISION_REQUESTED`: Teacher requests corrections with required feedback. Student is notified, edits/re-uploads their work, status reverts to `SUBMITTED`, and `revisionCount` increments by 1.
3. **Teacher Grading Workflow & Drawer**:
   - In Teacher Group/Lesson view, a "Homework Submissions" button opens a grading view with aggregate metrics (*Total Enrolled, Submitted, Graded, Pending Review, Revision Requested, Overdue*).
   - Roster table with student submission rows and quick status filters.
   - Grading drawer displays: student submission preview/download, score input, teacher feedback textarea, and two primary action buttons:
     - **Save Grade**: updates score and feedback, sets `status = 'GRADED'`, sets `gradedAt = now()`.
     - **Request Revision**: requires teacher feedback, sets `status = 'REVISION_REQUESTED'`, clears current score, and notifies student.
4. **Dynamic Gradebook Integration**:
   - The Group Gradebook endpoint dynamically aggregates homework assignments alongside quizzes and manual grade columns.
   - Homework columns display assignment title, `maxScore`, and each student's score or status badge (`Not Submitted`, `Submitted`, `Late`, `Revision Requested`, `Graded`).
   - Overall grade percentage calculation incorporates graded homework: `earned += score` and `studentMax += maxScore`. Ungraded submissions before due date do not penalize the overall grade.
5. **Student Lesson Experience (Web & Mobile)**:
   - Dedicated "Homework" card on the lesson screen beneath video/lesson resources.
   - Displays instructions, reference file download / link, max score, and due date countdown banner (e.g., "Due in 2 days" or "Overdue").
   - 3-way submission selector (Text, Link, File Upload $\le$ 10MB).
   - Live status badge, submission preview, and teacher feedback when graded or revision requested.
6. **Parent Portal Visibility (Web & Mobile)**:
   - In Parent Portal (`/parent` on Web and Parent tab on Mobile), each linked student's view includes a **Homework** section showing pending assignments, due dates, submission status, scores, and teacher comments.
   - Displays an overdue or urgent attention badge if an assignment is due within 24 hours or past due without a submission.
7. **In-App Notifications**:
   - Delivered to students and linked parents via `NotificationsService.sendInApp`:
     1. When homework is published/assigned to a group with a due date.
     2. When homework is graded or revision requested with teacher feedback.
     3. Due date reminder 24 hours prior to deadline for unsubmitted students.
8. **Storage Quotas & Authorization**:
   - Teacher homework reference files count toward the teacher's `Lesson Storage Usage` quota via `assertCanUploadStorage`.
   - Student submission uploads are capped at 10 MB per file, validated, stored in R2, and do NOT deduct from teacher plan storage.
   - Authorization strictly verifies course/group ownership for teachers, active enrollment and unlocked lesson status for students, and parent-child link for parents.

## User Stories

1. As a teacher creating or editing a lesson in my course, I want to add a homework assignment with a title, instructions, maximum score, and optional reference file or link, so that students know what assignment to complete.
2. As a teacher scheduling a group, I want to set a specific due date and toggle visibility for each homework assignment in that group, so that different cohorts can pace homework independently.
3. As a student viewing a lesson on web or mobile, I want to see the homework assignment card, download reference materials, and check the due date countdown, so that I know what is expected and when it is due.
4. As a student, I want to submit my homework by typing text, pasting an external link, or uploading a file (up to 10MB), so that I can submit my work in whatever format my teacher requested.
5. As a student who submits after the due date, I want my submission to be accepted but marked with a "Late" badge, so that my teacher knows when it was submitted.
6. As a teacher viewing my group's homework, I want to see a roster of all enrolled students with their submission status (`Not Submitted`, `Submitted`, `Late`, `Graded`, `Revision Requested`), so that I can quickly monitor completion.
7. As a teacher reviewing a student's submission, I want to view their text/link/file, enter a score out of `maxScore`, write constructive feedback, and click "Save Grade", so that the student receives their grade and comments.
8. As a teacher reviewing unsatisfactory work, I want to click "Request Revision" with explanation notes, so that the student is prompted to correct and resubmit their work.
9. As a student whose homework was returned for revision, I want to see the teacher's feedback and resubmit an updated file, link, or text, so that I can improve my grade.
10. As a teacher opening the group Gradebook, I want homework columns to appear alongside quizzes and manual grade columns, with individual student scores contributing to the overall grade percentage.
11. As a parent viewing my child's progress on web or mobile, I want to see a Homework tab with all upcoming and completed homework assignments, grades, and teacher feedback, so that I can support my child's studies.
12. As a parent, I want to see an urgent alert when my child has homework due within 24 hours or an overdue assignment, so that I can remind them.
13. As a student or parent, I want to receive an in-app notification when homework is assigned, graded, or returned for revision, so that I stay informed immediately.

## Data Model

```sql
-- 1. Homework Assignments (Master Course Curriculum & Group Overrides)
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- null = master, populated = group override
  title TEXT NOT NULL,
  instructions TEXT,
  attachment_type attachment_type NOT NULL DEFAULT 'NONE',
  r2_object_key TEXT,
  url TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  max_score INTEGER NOT NULL DEFAULT 10,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX homework_lesson_idx ON homework(lesson_id);
CREATE INDEX homework_group_idx ON homework(group_id);

-- 2. Cohort Homework Access & Due Dates
CREATE TABLE group_homework_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  due_date TIMESTAMP,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX unique_group_homework_access_idx ON group_homework_access(group_id, homework_id);
CREATE INDEX group_homework_group_idx ON group_homework_access(group_id);

-- 3. Student Submissions
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT, -- Text notes / response
  attachment_type attachment_type NOT NULL DEFAULT 'NONE',
  r2_object_key TEXT,
  url TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED', -- 'SUBMITTED' | 'GRADED' | 'REVISION_REQUESTED'
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  revision_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER, -- <= homework.maxScore
  teacher_feedback TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMP
);
CREATE UNIQUE INDEX unique_homework_submission_idx ON homework_submissions(homework_id, group_id, student_id);
CREATE INDEX homework_sub_group_idx ON homework_submissions(group_id);
CREATE INDEX homework_sub_student_idx ON homework_submissions(student_id);
```

## API Contracts (`shared/api.ts`)

```ts
export type HomeworkAttachmentType = 'NONE' | 'PDF' | 'DOC' | 'AUDIO' | 'IMAGE' | 'ARCHIVE' | 'LINK' | 'VIDEO' | 'OTHER';
export type HomeworkSubmissionStatus = 'SUBMITTED' | 'GRADED' | 'REVISION_REQUESTED';

export interface HomeworkDto {
  id: string;
  lessonId: string;
  groupId: string | null;
  title: string;
  instructions: string | null;
  attachmentType: HomeworkAttachmentType;
  r2ObjectKey: string | null;
  url: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  maxScore: number;
  displayOrder: number;
  createdAt: string;
  // Cohort-specific properties when queried in the context of a group:
  dueDate?: string | null;
  isHidden?: boolean;
}

export interface HomeworkSubmissionDto {
  id: string;
  homeworkId: string;
  groupId: string;
  studentId: string;
  studentName?: string;
  content: string | null;
  attachmentType: HomeworkAttachmentType;
  r2ObjectKey: string | null;
  url: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  status: HomeworkSubmissionStatus;
  isLate: boolean;
  revisionCount: number;
  score: number | null;
  maxScore?: number;
  teacherFeedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface HomeworkRosterSummaryDto {
  homework: HomeworkDto;
  stats: {
    totalEnrolled: number;
    submitted: number;
    graded: number;
    pendingReview: number;
    revisionRequested: number;
    notSubmitted: number;
    late: number;
  };
  submissions: Array<{
    studentId: string;
    studentName: string;
    submission: HomeworkSubmissionDto | null;
  }>;
}
```

### Endpoints
- **Teacher**:
  - `POST /api/teacher/lessons/:lessonId/homework` — Create homework on lesson (with optional `groupId`).
  - `PATCH /api/teacher/homework/:id` — Update homework details, reference files, max score.
  - `DELETE /api/teacher/homework/:id` — Delete homework.
  - `PUT /api/teacher/groups/:groupId/homework/:homeworkId/access` — Set cohort due date and visibility.
  - `GET /api/teacher/groups/:groupId/homework/:homeworkId/submissions` — Get roster submissions and aggregate stats.
  - `POST /api/teacher/groups/:groupId/homework/:homeworkId/submissions/:studentId/grade` — Grade or request revision (`{ score?, teacherFeedback, action: 'SAVE_GRADE' | 'REQUEST_REVISION' }`).
- **Student**:
  - `GET /api/student/groups/:groupId/lessons/:lessonId/homework` — Get homework details, group due date, and student's submission.
  - `POST /api/student/groups/:groupId/homework/:homeworkId/submit` — Submit or resubmit homework (`{ content?, attachmentType?, r2ObjectKey?, url?, fileSizeBytes?, mimeType? }`).
- **Parent**:
  - `GET /api/parent/children/:studentId/homework` — List all homework assignments, due dates, statuses, scores, and feedback for the child.
- **Gradebook Update**:
  - `GET /api/teacher/groups/:groupId/gradebook` & `GET /api/student/groups/:groupId/gradebook` — Augmented to include homework columns and reflect earned scores in overall calculation.

## Verification & Testing Plan

1. **Unit & Integration Tests (`backend/src/modules/teacher/teacher.spec.ts` & `backend/src/modules/student/student.spec.ts`)**:
   - Homework CRUD on master lessons and group-scoped overrides.
   - Pacing due dates on `group_homework_access`.
   - Student submission creation, validation (file size $\le$ 10MB), late detection.
   - Teacher grading (`GRADED`) and revision request (`REVISION_REQUESTED`).
   - Student resubmission with incremented `revisionCount` and status transition back to `SUBMITTED`.
   - Gradebook calculation reflecting homework scores in student grade percent.
   - Parent access restricted to linked children only.
   - In-app notifications generated for assignment, grading, and revision requests.
2. **Typecheck & Client Parity**:
   - `cd backend && npm run typecheck && npm test`
   - `cd frontend && npm run typecheck && npm test`
   - `cd mobile && npm run typecheck`
