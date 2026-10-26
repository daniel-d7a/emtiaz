# Master Product & Technical Specification: Hybrid Cohort-Based LMS

> **Historical document.** This is the original product brief, not the current
> implementation. It contains repeated drafts and obsolete details (for example
> React Router, Zustand, and a schema without the `PARENT` role). For the
> deployed system use [`docs/architecture.md`](docs/architecture.md), the
> [`docs/security.md`](docs/security.md) model, and the
> [ADRs](docs/README.md). Where this file and the code differ, the code wins.

## 1. Project Overview & Core Philosophy

A lightweight, mobile-first Learning Management System (LMS) tailored for school curriculum teachers (specifically targeting the Oman academic demographic) and freelance instructors teaching general skill-based courses (e.g., English speaking, grammar).

### Core Architectural Pillars
* **Hybrid Course Taxonomy:** Courses can either be tied to an Academic Grade/Semester (School Curriculum) or categorized as General/Skill-based courses.
* **Course vs. Group (Cohort) Separation:** Teachers build a Course's master curriculum once. Under each course, they create multiple **Groups (Cohorts)**. Students enroll into a specific Group via a direct magic invite link or 6-digit code. Teachers control lesson visibility (pacing) and gradebooks per Group.
* **No-Video MVP:** The initial release focuses strictly on structured lessons, downloadable materials (PDFs, Word docs, audio, images), and inline quizzes/assessments. The attachment schema remains polymorphic to support video later without database refactoring.
* **Zero-Friction UX:** Designed to be "parent-proof" and student-friendly. Minimal clicks, inline spreadsheet-like grading, and seamless WhatsApp link sharing.
* **Bilingual & RTL Ready:** Full support for Arabic (RTL) and English (LTR) layouts.

---

## 2. Tech Stack Specification

### Frontend
* **Framework:** React (Vite + TypeScript)
* **Styling:** Tailwind CSS (configured with logical properties for seamless RTL/LTR switching) + Lucide Icons
* **State & Data Fetching:** TanStack Query (React Query) + Zustand (for UI state)
* **Auth Client:** `better-auth/react` (configured with `credentials: 'include'` for session cookies)
* **Routing:** React Router v6+
* **Forms & Validation:** React Hook Form + Zod

### Backend
* **Framework:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM:** **Drizzle ORM** (`drizzle-orm/node-postgres` + `drizzle-kit` for migrations)
* **Authentication:** **Better Auth** using **Database-backed HTTP-Only Cookie Sessions** (integrated via Drizzle adapter, using username/phone-number & email/password plugins + custom `role` fields).
* **File Storage:** **Cloudflare R2** using AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct client-to-R2 presigned uploads and downloads.

---

## 3. User Roles & Core Workflows

### 3.1. Authentication & Session Management (Better Auth)
1. **Session Strategy:** Better Auth manages stateful sessions stored in PostgreSQL (`session` table) and transmitted via secure HTTP-only cookies. NestJS uses a global `AuthGuard` that calls `auth.api.getSession({ headers: request.headers })` to validate requests and attach `user` and `session` objects.
2. **Teacher Self-Registration:** Teachers sign up directly on `/register/teacher` using Full Name, Phone Number, Email, Password, and Specialization. Their role is set to `TEACHER` and they are redirected to the Teacher Studio.
3. **Student Registration & Group Join Flow:**
   * Students can register via `/register/student` (Full Name, Phone Number, Password, optional Grade level).
   * **Magic Group Link Flow (`/join/:joinCode`):** A teacher shares a link (e.g., `https://lms.domain.com/join/OM4829`) on WhatsApp. If the student has an active session, clicking it immediately enrolls them into that Group. If not logged in, they see a 1-step Quick Register/Login card and are automatically placed in the Group upon completion.

### 3.2. Student Platform
* **My Courses / Groups Dashboard:** Displays cards for every Group/Course the student belongs to, showing Course Title, Teacher Name, Group Name, and a visual Progress Bar.
* **Join Group Modal:** A prominent input box where students can type a 6-digit `joinCode` to join a new class at any time.
* **Course & Lesson View:**
  * Displays Modules (Units) and Lessons that are **unlocked for the student's specific Group**.
  * **Lesson Page:** Shows Lesson Title, Teacher Notes/Instructions, a list of downloadable files hosted on Cloudflare R2 (PDFs, worksheets, audio files), and any Group-specific announcements/files.
  * **Inline Quiz Engine:** Directly below the lesson material, students can take the lesson's quiz (Multiple Choice, True/False, Short Answer), submit answers, and immediately view their score + explanations.
  * **Completion Toggle:** "Mark Lesson as Complete" button.
* **My Grades View:** Allows the student to see their quiz scores and any custom manual grades (e.g., "Speaking Test 1", "Homework 2") recorded by the teacher in their Group.

### 3.3. Teacher Platform
* **Course Manager:**
  * Create and edit courses. Select Course Type: `ACADEMIC` (select Grade & Semester) or `GENERAL` (select Category/Skill).
  * **2-Level Curriculum Builder:** Add/reorder `Modules` -> Add/reorder `Lessons`.
  * **Lesson Editor:** Input Lesson Title, text instructions, upload attachments directly to **Cloudflare R2** via presigned PUT URLs (PDF, DOCX, PPTX, MP3, ZIP), and build an optional inline Quiz.
* **Group (Cohort) Command Center:** Inside any course, the teacher can create multiple Groups (e.g., *Grade 10 - Sun/Tue 4PM* or *English Speaking - Batch A*). Clicking a group opens 3 tabs:
  1. **Pacing & Content Tab:** Lists all lessons in the course with an `Unlocked / Locked` toggle switch specific to this group. Also allows uploading a **Group-Specific File/Note** to Cloudflare R2 (e.g., a special homework PDF just for this group).
  2. **Gradebook Matrix Tab:** A spreadsheet-style table:
     * **Rows:** Students enrolled in this group.
     * **Columns:** Auto-graded Lesson Quizzes + **Custom Manual Grade Columns**.
     * **Custom Markings:** Teacher clicks `+ Add Grade Column` (e.g., Title: *"Midterm Exam"*, Max Score: `20`). Teacher types scores directly into cells next to each student; changes auto-save on blur.
  3. **Roster & Invite Tab:**
     * Displays the unique **Shareable Join Link** and **6-Digit Join Code** with a 1-click "Copy for WhatsApp" button.
     * **Bulk Add Students:** Paste a list of student names/phone numbers or add a student manually by phone number.
     * **Move/Remove Student:** Transfer a student to another Group within the same course or remove them.

### 3.4. Admin / Operations Platform
A comprehensive operational command center with global visibility and deep filtering across every entity:
* **Global Overview Metrics:** Total Active Teachers, Total Students, Total Courses (Academic vs. General), Total Active Groups.
* **Teachers Directory & Filter:** View all registered teachers. Filter by status (`ACTIVE`, `SUSPENDED`), subject/category, course count, or search by name/phone. Ability to suspend/activate teachers or inspect their courses.
* **Students Directory & Filter:** View all students. Filter by Grade Level, enrolled Course, specific Group, Teacher, or search by name/phone. Ability to reset passwords, revoke sessions, or manually enroll/remove a student from any Group.
* **Courses & Groups Master Explorer:** View all courses and groups across the platform. Filter by Academic vs. General, Grade, Teacher, or Group status. Admins can inspect any course curriculum or group gradebook.
* **Taxonomy Manager:** CRUD interface to manage Academic Grades (e.g., Grade 5 to Grade 12), Semesters, and General Course Categories (e.g., English Speaking, Grammar, IELTS).

---

## 4. Database Schema (PostgreSQL + Drizzle ORM + Better Auth)

Below is the complete `schema.ts` file using `drizzle-orm/pg-core`, including Better Auth's required core session tables (`users`, `sessions`, `accounts`, `verifications`) and all LMS domain tables.

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum('role', ['ADMIN', 'TEACHER', 'STUDENT']);
export const courseTypeEnum = pgEnum('course_type', ['ACADEMIC', 'GENERAL']);
export const attachmentTypeEnum = pgEnum('attachment_type', [
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO', // Reserved for future phase
]);
export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

// ==========================================
// 2. TAXONOMY TABLES (Grades & Categories)
// ==========================================
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "Grade 10", "Grade 11"
  displayOrder: integer('display_order').notNull().default(0),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "English Speaking", "Grammar"
});

// ==========================================
// 3. BETTER AUTH + USER TABLES (Sessions)
// ==========================================
export const users = pgTable('user', {
  id: text('id').primaryKey(), // Generated by Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneNumber: text('phone_number').unique(), // For phone login / WhatsApp matching
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('STUDENT'),
  isActive: boolean('is_active').notNull().default(true),
  specialization: text('specialization'), // Optional for Teachers
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. COURSES, MODULES & LESSONS
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  courseType: courseTypeEnum('course_type').notNull().default('ACADEMIC'),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  semester: text('semester'), // e.g., "Semester 1", "Semester 2"
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // Teacher notes / instructions
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. GROUPS (COHORTS) & ENROLLMENTS
// ==========================================
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Sun/Tue 4PM Batch"
  joinCode: text('join_code').notNull().unique(), // e.g., "OM4829"
  unlockAllByDefault: boolean('unlock_all_by_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupStudents = pgTable(
  'group_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupStudent: uniqueIndex('unique_group_student_idx').on(
      table.groupId,
      table.studentId,
    ),
  }),
);

export const groupLessonAccess = pgTable(
  'group_lesson_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    isUnlocked: boolean('is_unlocked').notNull().default(true),
  },
  (table) => ({
    uniqueGroupLesson: uniqueIndex('unique_group_lesson_idx').on(
      table.groupId,
      table.lessonId,
    ),
  }),
);

// ==========================================
// 6. CLOUDFLARE R2 LESSON ATTACHMENTS
// ==========================================
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }), // Null = Master Course File; Populated = Specific to one Group only
  title: text('title').notNull(),
  r2ObjectKey: text('r2_object_key').notNull(), // e.g., "courses/{courseId}/lessons/{lessonId}/worksheet.pdf"
  publicOrSignedUrl: text('public_or_signed_url').notNull(),
  fileType: attachmentTypeEnum('file_type').notNull().default('PDF'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 7. QUIZZES, ATTEMPTS & COMPLETION
// ==========================================
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull().default('MCQ'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(), // e.g. ["Option A", "Option B"] for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  answersJson: jsonb('answers_json').notNull(), // Stores student responses
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLessonCompletion: uniqueIndex('unique_lesson_completion_idx').on(
      table.lessonId,
      table.studentId,
    ),
  }),
);

// ==========================================
// 8. CUSTOM GROUP GRADEBOOK (MANUAL MARKINGS)
// ==========================================
export const manualGradeColumns = pgTable('manual_grade_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Speaking Test 1", "Homework 3"
  maxScore: integer('max_score').notNull().default(10),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const manualGradeValues = pgTable(
  'manual_grade_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    columnId: uuid('column_id')
      .notNull()
      .references(() => manualGradeColumns.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    teacherNote: text('teacher_note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCellGrade: uniqueIndex('unique_manual_grade_cell_idx').on(
      table.columnId,
      table.studentId,
    ),
  }),
);
```

---

## 5. Backend Architecture (NestJS + Better Auth + Cloudflare R2)

### 5.1. Better Auth Configuration (`src/auth/auth.ts`)
Configure Better Auth with the Drizzle adapter, custom user attributes (`role`, `phoneNumber`, `gradeId`, `isActive`), and cookie-based sessions:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
   # Master Product & Technical Specification: Hybrid Cohort-Based LMS

## 1. Project Overview & Core Philosophy

A lightweight, mobile-first Learning Management System (LMS) tailored for school curriculum teachers (specifically targeting the Oman academic demographic) and freelance instructors teaching general skill-based courses (e.g., English speaking, grammar).

### Core Architectural Pillars
* **Hybrid Course Taxonomy:** Courses can either be tied to an Academic Grade/Semester (School Curriculum) or categorized as General/Skill-based courses.
* **Course vs. Group (Cohort) Separation:** Teachers build a Course's master curriculum once. Under each course, they create multiple **Groups (Cohorts)**. Students enroll into a specific Group via a direct magic invite link or 6-digit code. Teachers control lesson visibility (pacing) and gradebooks per Group.
* **No-Video MVP:** The initial release focuses strictly on structured lessons, downloadable materials (PDFs, Word docs, audio, images), and inline quizzes/assessments. The attachment schema remains polymorphic to support video later without database refactoring.
* **Zero-Friction UX:** Designed to be "parent-proof" and student-friendly. Minimal clicks, inline spreadsheet-like grading, and seamless WhatsApp link sharing.
* **Bilingual & RTL Ready:** Full support for Arabic (RTL) and English (LTR) layouts.

---

## 2. Tech Stack Specification

### Frontend
* **Framework:** React (Vite + TypeScript)
* **Styling:** Tailwind CSS (configured with logical properties for seamless RTL/LTR switching) + Lucide Icons
* **State & Data Fetching:** TanStack Query (React Query) + Zustand (for UI state)
* **Auth Client:** `better-auth/react` (configured with `credentials: 'include'` for session cookies)
* **Routing:** React Router v6+
* **Forms & Validation:** React Hook Form + Zod

### Backend
* **Framework:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM:** **Drizzle ORM** (`drizzle-orm/node-postgres` + `drizzle-kit` for migrations)
* **Authentication:** **Better Auth** using **Database-backed HTTP-Only Cookie Sessions** (integrated via Drizzle adapter, using username/phone-number & email/password plugins + custom `role` fields).
* **File Storage:** **Cloudflare R2** using AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct client-to-R2 presigned uploads and downloads.

---

## 3. User Roles & Core Workflows

### 3.1. Authentication & Session Management (Better Auth)
1. **Session Strategy:** Better Auth manages stateful sessions stored in PostgreSQL (`session` table) and transmitted via secure HTTP-only cookies. NestJS uses a global `AuthGuard` that calls `auth.api.getSession({ headers: request.headers })` to validate requests and attach `user` and `session` objects.
2. **Teacher Self-Registration:** Teachers sign up directly on `/register/teacher` using Full Name, Phone Number, Email, Password, and Specialization. Their role is set to `TEACHER` and they are redirected to the Teacher Studio.
3. **Student Registration & Group Join Flow:**
   * Students can register via `/register/student` (Full Name, Phone Number, Password, optional Grade level).
   * **Magic Group Link Flow (`/join/:joinCode`):** A teacher shares a link (e.g., `https://lms.domain.com/join/OM4829`) on WhatsApp. If the student has an active session, clicking it immediately enrolls them into that Group. If not logged in, they see a 1-step Quick Register/Login card and are automatically placed in the Group upon completion.

### 3.2. Student Platform
* **My Courses / Groups Dashboard:** Displays cards for every Group/Course the student belongs to, showing Course Title, Teacher Name, Group Name, and a visual Progress Bar.
* **Join Group Modal:** A prominent input box where students can type a 6-digit `joinCode` to join a new class at any time.
* **Course & Lesson View:**
  * Displays Modules (Units) and Lessons that are **unlocked for the student's specific Group**.
  * **Lesson Page:** Shows Lesson Title, Teacher Notes/Instructions, a list of downloadable files hosted on Cloudflare R2 (PDFs, worksheets, audio files), and any Group-specific announcements/files.
  * **Inline Quiz Engine:** Directly below the lesson material, students can take the lesson's quiz (Multiple Choice, True/False, Short Answer), submit answers, and immediately view their score + explanations.
  * **Completion Toggle:** "Mark Lesson as Complete" button.
* **My Grades View:** Allows the student to see their quiz scores and any custom manual grades (e.g., "Speaking Test 1", "Homework 2") recorded by the teacher in their Group.

### 3.3. Teacher Platform
* **Course Manager:**
  * Create and edit courses. Select Course Type: `ACADEMIC` (select Grade & Semester) or `GENERAL` (select Category/Skill).
  * **2-Level Curriculum Builder:** Add/reorder `Modules` -> Add/reorder `Lessons`.
  * **Lesson Editor:** Input Lesson Title, text instructions, upload attachments directly to **Cloudflare R2** via presigned PUT URLs (PDF, DOCX, PPTX, MP3, ZIP), and build an optional inline Quiz.
* **Group (Cohort) Command Center:** Inside any course, the teacher can create multiple Groups (e.g., *Grade 10 - Sun/Tue 4PM* or *English Speaking - Batch A*). Clicking a group opens 3 tabs:
  1. **Pacing & Content Tab:** Lists all lessons in the course with an `Unlocked / Locked` toggle switch specific to this group. Also allows uploading a **Group-Specific File/Note** to Cloudflare R2 (e.g., a special homework PDF just for this group).
  2. **Gradebook Matrix Tab:** A spreadsheet-style table:
     * **Rows:** Students enrolled in this group.
     * **Columns:** Auto-graded Lesson Quizzes + **Custom Manual Grade Columns**.
     * **Custom Markings:** Teacher clicks `+ Add Grade Column` (e.g., Title: *"Midterm Exam"*, Max Score: `20`). Teacher types scores directly into cells next to each student; changes auto-save on blur.
  3. **Roster & Invite Tab:**
     * Displays the unique **Shareable Join Link** and **6-Digit Join Code** with a 1-click "Copy for WhatsApp" button.
     * **Bulk Add Students:** Paste a list of student names/phone numbers or add a student manually by phone number.
     * **Move/Remove Student:** Transfer a student to another Group within the same course or remove them.

### 3.4. Admin / Operations Platform
A comprehensive operational command center with global visibility and deep filtering across every entity:
* **Global Overview Metrics:** Total Active Teachers, Total Students, Total Courses (Academic vs. General), Total Active Groups.
* **Teachers Directory & Filter:** View all registered teachers. Filter by status (`ACTIVE`, `SUSPENDED`), subject/category, course count, or search by name/phone. Ability to suspend/activate teachers or inspect their courses.
* **Students Directory & Filter:** View all students. Filter by Grade Level, enrolled Course, specific Group, Teacher, or search by name/phone. Ability to reset passwords, revoke sessions, or manually enroll/remove a student from any Group.
* **Courses & Groups Master Explorer:** View all courses and groups across the platform. Filter by Academic vs. General, Grade, Teacher, or Group status. Admins can inspect any course curriculum or group gradebook.
* **Taxonomy Manager:** CRUD interface to manage Academic Grades (e.g., Grade 5 to Grade 12), Semesters, and General Course Categories (e.g., English Speaking, Grammar, IELTS).

---

## 4. Database Schema (PostgreSQL + Drizzle ORM + Better Auth)

Below is the complete `schema.ts` file using `drizzle-orm/pg-core`, including Better Auth's required core session tables (`users`, `sessions`, `accounts`, `verifications`) and all LMS domain tables.

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum('role', ['ADMIN', 'TEACHER', 'STUDENT']);
export const courseTypeEnum = pgEnum('course_type', ['ACADEMIC', 'GENERAL']);
export const attachmentTypeEnum = pgEnum('attachment_type', [
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO', // Reserved for future phase
]);
export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

// ==========================================
// 2. TAXONOMY TABLES (Grades & Categories)
// ==========================================
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "Grade 10", "Grade 11"
  displayOrder: integer('display_order').notNull().default(0),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "English Speaking", "Grammar"
});

// ==========================================
// 3. BETTER AUTH + USER TABLES (Sessions)
// ==========================================
export const users = pgTable('user', {
  id: text('id').primaryKey(), // Generated by Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneNumber: text('phone_number').unique(), // For phone login / WhatsApp matching
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('STUDENT'),
  isActive: boolean('is_active').notNull().default(true),
  specialization: text('specialization'), // Optional for Teachers
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. COURSES, MODULES & LESSONS
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  courseType: courseTypeEnum('course_type').notNull().default('ACADEMIC'),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  semester: text('semester'), // e.g., "Semester 1", "Semester 2"
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // Teacher notes / instructions
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. GROUPS (COHORTS) & ENROLLMENTS
// ==========================================
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Sun/Tue 4PM Batch"
  joinCode: text('join_code').notNull().unique(), // e.g., "OM4829"
  unlockAllByDefault: boolean('unlock_all_by_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupStudents = pgTable(
  'group_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupStudent: uniqueIndex('unique_group_student_idx').on(
      table.groupId,
      table.studentId,
    ),
  }),
);

export const groupLessonAccess = pgTable(
  'group_lesson_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    isUnlocked: boolean('is_unlocked').notNull().default(true),
  },
  (table) => ({
    uniqueGroupLesson: uniqueIndex('unique_group_lesson_idx').on(
      table.groupId,
      table.lessonId,
    ),
  }),
);

// ==========================================
// 6. CLOUDFLARE R2 LESSON ATTACHMENTS
// ==========================================
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }), // Null = Master Course File; Populated = Specific to one Group only
  title: text('title').notNull(),
  r2ObjectKey: text('r2_object_key').notNull(), // e.g., "courses/{courseId}/lessons/{lessonId}/worksheet.pdf"
  publicOrSignedUrl: text('public_or_signed_url').notNull(),
  fileType: attachmentTypeEnum('file_type').notNull().default('PDF'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 7. QUIZZES, ATTEMPTS & COMPLETION
// ==========================================
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull().default('MCQ'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(), // e.g. ["Option A", "Option B"] for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  answersJson: jsonb('answers_json').notNull(), // Stores student responses
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLessonCompletion: uniqueIndex('unique_lesson_completion_idx').on(
      table.lessonId,
      table.studentId,
    ),
  }),
);

// ==========================================
// 8. CUSTOM GROUP GRADEBOOK (MANUAL MARKINGS)
// ==========================================
export const manualGradeColumns = pgTable('manual_grade_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Speaking Test 1", "Homework 3"
  maxScore: integer('max_score').notNull().default(10),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const manualGradeValues = pgTable(
  'manual_grade_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    columnId: uuid('column_id')
      .notNull()
      .references(() => manualGradeColumns.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    teacherNote: text('teacher_note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCellGrade: uniqueIndex('unique_manual_grade_cell_idx').on(
      table.columnId,
      table.studentId,
    ),
  }),
);
```

---

## 5. Backend Architecture (NestJS + Better Auth + Cloudflare R2)

### 5.1. Better Auth Configuration (`src/auth/auth.ts`)
Configure Better Auth with the Drizzle adapter, custom user attributes (`role`, `phoneNumber`, `gradeId`, `isActive`), and cookie-based sessions:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT' },
      phoneNumber: { type: 'string', required: false },
      gradeId: { type: 'string', required: false },
      specialization: { type: 'string', required: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
});
```

### 5.2. Cloudflare R2 Storage Service (`src/storage/r2.service.ts`)
To keep the NestJS server fast and lightweight, file uploads use **Cloudflare R2 Presigned URLs**:
1. **Upload Flow:**
   * Teacher selects a file (e.g., `Unit1_Worksheet.pdf`) in the React app.
   * Frontend calls `POST /api/storage/presigned-upload` with `{ fileName, mimeType, fileSize, courseId, lessonId }`.
   * NestJS generates an R2 Object Key (`courses/${courseId}/lessons/${lessonId}/${uuid}-${fileName}`) and returns a `presignedPutUrl` using `@aws-sdk/s3-request-presigner`.
   * Frontend uploads the binary directly to Cloudflare R2 via `PUT`.
   * Frontend calls `POST /api/lessons/:lessonId/attachments` to save the metadata in PostgreSQL via Drizzle.
2. **Download Flow:**
   * Either serve via a custom Cloudflare R2 Public Bucket domain or generate a presigned `GetObjectCommand` URL valid for 1 hour when a student views a lesson.

### 5.3. Core NestJS API Endpoints

#### Auth & Onboarding
* `ALL /api/auth/*` — Handled directly by Better Auth handler mounted in NestJS controller.
* `POST /api/onboarding/teacher` — Registers a teacher account with `role: 'TEACHER'`.
* `POST /api/onboarding/join/:joinCode` — Validates group code and adds current authenticated student to `group_students`.

#### Student Endpoints (`@Roles('STUDENT')`)
* `GET /api/student/groups` — Returns all groups the student is enrolled in, with course metadata and completion percentage.
* `POST /api/student/groups/join` — Enrolls student into a group using `{ joinCode }`.
* `GET /api/student/groups/:groupId/curriculum` — Returns course modules and lessons filtered by `group_lesson_access` (hides locked lessons) and includes group-specific attachments.
* `POST /api/student/lessons/:lessonId/complete` — Marks lesson complete.
* `POST /api/student/quizzes/:quizId/submit` — Auto-grades MCQ/True-False/Short Answer questions and records `quiz_attempts`.
* `GET /api/student/groups/:groupId/grades` — Returns student's quiz scores and manual teacher markings for that group.

#### Teacher Endpoints (`@Roles('TEACHER', 'ADMIN')`)
* `GET /api/teacher/courses` & `POST /api/teacher/courses` — List and create courses (`ACADEMIC` or `GENERAL`).
* `POST /api/teacher/courses/:courseId/modules` — Add/reorder modules.
* `POST /api/teacher/modules/:moduleId/lessons` — Create/edit lessons.
* `POST /api/storage/presigned-upload` — Get Cloudflare R2 upload URL.
* `POST /api/teacher/lessons/:lessonId/attachments` — Attach uploaded R2 file to a lesson (or specific group).
* `POST /api/teacher/lessons/:lessonId/quiz` — Upsert inline quiz and questions.
* `POST /api/teacher/courses/:courseId/groups` — Create a new Group (`joinCode` auto-generated, e.g., `OM-4829`).
* `PATCH /api/teacher/groups/:groupId/lessons/:lessonId/access` — Toggle `isUnlocked` for a specific group.
* `GET /api/teacher/groups/:groupId/gradebook` — Returns full matrix of enrolled students, their quiz scores, and all `manual_grade_columns` + `manual_grade_values`.
* `POST /api/teacher/groups/:groupId/gradebook/columns` — Add a custom marking column.
* `PUT /api/teacher/groups/:groupId/gradebook/cell` — Upsert a student's score in a custom column (called on input blur).
* `POST /api/teacher/groups/:groupId/roster/bulk` — Bulk create/enroll students by phone/name list.

#### Admin Endpoints (`@Roles('ADMIN')`)
* `GET /api/admin/overview` — Global counts (teachers, students, courses, groups).
* `GET /api/admin/teachers` — Paginated/filtered list of all teachers (`?status=ACTIVE&search=...`).
* `PATCH /api/admin/users/:userId/status` — Activate/suspend any user and revoke active sessions in `sessions` table.
* `GET /api/admin/students` — Filter students by `gradeId`, `courseId`, `groupId`, `teacherId`, or search string.
* `GET /api/admin/courses` & `GET /api/admin/groups` — Global explorer with filters for `courseType`, `gradeId`, `categoryId`, `teacherId`.
* `CRUD /api/admin/taxonomy/grades` & `CRUD /api/admin/taxonomy/categories` — Manage grades and general skill categories.

---

## 6. Frontend Route & Component Structure (React)

* `/login` — Unified login (Phone/Email + Password via Better Auth client).
* `/register/teacher` — Teacher self-registration page.
* `/register/student` — Student self-registration page.
* `/join/:joinCode` — WhatsApp Magic Invite landing page (auto-enrolls logged-in students or shows 1-step registration).
* `/student`
  * `/student/dashboard` — Enrolled Groups cards + "Enter 6-Digit Group Code" button.
  * `/student/groups/:groupId` — Linear curriculum view, R2 file download cards, inline Quiz component, and "My Marks" tab.
* `/teacher`
  * `/teacher/dashboard` — List of Teacher's Courses & Quick Group links.
  * `/teacher/courses/:courseId/curriculum` — 2-level Module/Lesson builder + R2 Dropzone uploader + Quiz builder.
  * `/teacher/groups/:groupId` — **Group Command Center** with 3 tabs:
    1. *Pacing & Group Files* (Unlock switches + group R2 upload)
    2. *Gradebook Matrix* (Auto-graded quizzes + inline editable custom grade columns)
    3. *Roster & WhatsApp Invite* (Copy link/code + bulk add students)
* `/admin`
  * `/admin/dashboard` — Global metrics & activity overview.
  * `/admin/teachers` — Filterable teacher directory & status toggles.
  * `/admin/students` — Deep-filter student directory (by Grade, Group, Course, Teacher).
  * `/admin/courses-groups` — Master explorer for all courses and cohorts.
  * `/admin/taxonomy` — Grades & General Categories manager.

---

## 7. Environment Variables (`.env.example`)

```env
# PostgreSQL (Drizzle ORM)
DATABASE_URL="postgresql://postgres:password@localhost:5432/oman_lms"

# Better Auth
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="lms-attachments"
R2_PUBLIC_URL="https://files.yourdomain.com"

# Frontend URL (for CORS & Magic Join Links)
FRONTEND_URL="http://localhost:5173"
```# Master Product & Technical Specification: Hybrid Cohort-Based LMS

## 1. Project Overview & Core Philosophy

A lightweight, mobile-first Learning Management System (LMS) tailored for school curriculum teachers (specifically targeting the Oman academic demographic) and freelance instructors teaching general skill-based courses (e.g., English speaking, grammar).

### Core Architectural Pillars
* **Hybrid Course Taxonomy:** Courses can either be tied to an Academic Grade/Semester (School Curriculum) or categorized as General/Skill-based courses.
* **Course vs. Group (Cohort) Separation:** Teachers build a Course's master curriculum once. Under each course, they create multiple **Groups (Cohorts)**. Students enroll into a specific Group via a direct magic invite link or 6-digit code. Teachers control lesson visibility (pacing) and gradebooks per Group.
* **No-Video MVP:** The initial release focuses strictly on structured lessons, downloadable materials (PDFs, Word docs, audio, images), and inline quizzes/assessments. The attachment schema remains polymorphic to support video later without database refactoring.
* **Zero-Friction UX:** Designed to be "parent-proof" and student-friendly. Minimal clicks, inline spreadsheet-like grading, and seamless WhatsApp link sharing.
* **Bilingual & RTL Ready:** Full support for Arabic (RTL) and English (LTR) layouts.

---

## 2. Tech Stack Specification

### Frontend
* **Framework:** React (Vite + TypeScript)
* **Styling:** Tailwind CSS (configured with logical properties for seamless RTL/LTR switching) + Lucide Icons
* **State & Data Fetching:** TanStack Query (React Query) + Zustand (for UI state)
* **Auth Client:** `better-auth/react` (configured with `credentials: 'include'` for session cookies)
* **Routing:** React Router v6+
* **Forms & Validation:** React Hook Form + Zod

### Backend
* **Framework:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM:** **Drizzle ORM** (`drizzle-orm/node-postgres` + `drizzle-kit` for migrations)
* **Authentication:** **Better Auth** using **Database-backed HTTP-Only Cookie Sessions** (integrated via Drizzle adapter, using username/phone-number & email/password plugins + custom `role` fields).
* **File Storage:** **Cloudflare R2** using AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct client-to-R2 presigned uploads and downloads.

---

## 3. User Roles & Core Workflows

### 3.1. Authentication & Session Management (Better Auth)
1. **Session Strategy:** Better Auth manages stateful sessions stored in PostgreSQL (`session` table) and transmitted via secure HTTP-only cookies. NestJS uses a global `AuthGuard` that calls `auth.api.getSession({ headers: request.headers })` to validate requests and attach `user` and `session` objects.
2. **Teacher Self-Registration:** Teachers sign up directly on `/register/teacher` using Full Name, Phone Number, Email, Password, and Specialization. Their role is set to `TEACHER` and they are redirected to the Teacher Studio.
3. **Student Registration & Group Join Flow:**
   * Students can register via `/register/student` (Full Name, Phone Number, Password, optional Grade level).
   * **Magic Group Link Flow (`/join/:joinCode`):** A teacher shares a link (e.g., `https://lms.domain.com/join/OM4829`) on WhatsApp. If the student has an active session, clicking it immediately enrolls them into that Group. If not logged in, they see a 1-step Quick Register/Login card and are automatically placed in the Group upon completion.

### 3.2. Student Platform
* **My Courses / Groups Dashboard:** Displays cards for every Group/Course the student belongs to, showing Course Title, Teacher Name, Group Name, and a visual Progress Bar.
* **Join Group Modal:** A prominent input box where students can type a 6-digit `joinCode` to join a new class at any time.
* **Course & Lesson View:**
  * Displays Modules (Units) and Lessons that are **unlocked for the student's specific Group**.
  * **Lesson Page:** Shows Lesson Title, Teacher Notes/Instructions, a list of downloadable files hosted on Cloudflare R2 (PDFs, worksheets, audio files), and any Group-specific announcements/files.
  * **Inline Quiz Engine:** Directly below the lesson material, students can take the lesson's quiz (Multiple Choice, True/False, Short Answer), submit answers, and immediately view their score + explanations.
  * **Completion Toggle:** "Mark Lesson as Complete" button.
* **My Grades View:** Allows the student to see their quiz scores and any custom manual grades (e.g., "Speaking Test 1", "Homework 2") recorded by the teacher in their Group.

### 3.3. Teacher Platform
* **Course Manager:**
  * Create and edit courses. Select Course Type: `ACADEMIC` (select Grade & Semester) or `GENERAL` (select Category/Skill).
  * **2-Level Curriculum Builder:** Add/reorder `Modules` -> Add/reorder `Lessons`.
  * **Lesson Editor:** Input Lesson Title, text instructions, upload attachments directly to **Cloudflare R2** via presigned PUT URLs (PDF, DOCX, PPTX, MP3, ZIP), and build an optional inline Quiz.
* **Group (Cohort) Command Center:** Inside any course, the teacher can create multiple Groups (e.g., *Grade 10 - Sun/Tue 4PM* or *English Speaking - Batch A*). Clicking a group opens 3 tabs:
  1. **Pacing & Content Tab:** Lists all lessons in the course with an `Unlocked / Locked` toggle switch specific to this group. Also allows uploading a **Group-Specific File/Note** to Cloudflare R2 (e.g., a special homework PDF just for this group).
  2. **Gradebook Matrix Tab:** A spreadsheet-style table:
     * **Rows:** Students enrolled in this group.
     * **Columns:** Auto-graded Lesson Quizzes + **Custom Manual Grade Columns**.
     * **Custom Markings:** Teacher clicks `+ Add Grade Column` (e.g., Title: *"Midterm Exam"*, Max Score: `20`). Teacher types scores directly into cells next to each student; changes auto-save on blur.
  3. **Roster & Invite Tab:**
     * Displays the unique **Shareable Join Link** and **6-Digit Join Code** with a 1-click "Copy for WhatsApp" button.
     * **Bulk Add Students:** Paste a list of student names/phone numbers or add a student manually by phone number.
     * **Move/Remove Student:** Transfer a student to another Group within the same course or remove them.

### 3.4. Admin / Operations Platform
A comprehensive operational command center with global visibility and deep filtering across every entity:
* **Global Overview Metrics:** Total Active Teachers, Total Students, Total Courses (Academic vs. General), Total Active Groups.
* **Teachers Directory & Filter:** View all registered teachers. Filter by status (`ACTIVE`, `SUSPENDED`), subject/category, course count, or search by name/phone. Ability to suspend/activate teachers or inspect their courses.
* **Students Directory & Filter:** View all students. Filter by Grade Level, enrolled Course, specific Group, Teacher, or search by name/phone. Ability to reset passwords, revoke sessions, or manually enroll/remove a student from any Group.
* **Courses & Groups Master Explorer:** View all courses and groups across the platform. Filter by Academic vs. General, Grade, Teacher, or Group status. Admins can inspect any course curriculum or group gradebook.
* **Taxonomy Manager:** CRUD interface to manage Academic Grades (e.g., Grade 5 to Grade 12), Semesters, and General Course Categories (e.g., English Speaking, Grammar, IELTS).

---

## 4. Database Schema (PostgreSQL + Drizzle ORM + Better Auth)

Below is the complete `schema.ts` file using `drizzle-orm/pg-core`, including Better Auth's required core session tables (`users`, `sessions`, `accounts`, `verifications`) and all LMS domain tables.

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum('role', ['ADMIN', 'TEACHER', 'STUDENT']);
export const courseTypeEnum = pgEnum('course_type', ['ACADEMIC', 'GENERAL']);
export const attachmentTypeEnum = pgEnum('attachment_type', [
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO', // Reserved for future phase
]);
export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

// ==========================================
// 2. TAXONOMY TABLES (Grades & Categories)
// ==========================================
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "Grade 10", "Grade 11"
  displayOrder: integer('display_order').notNull().default(0),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "English Speaking", "Grammar"
});

// ==========================================
// 3. BETTER AUTH + USER TABLES (Sessions)
// ==========================================
export const users = pgTable('user', {
  id: text('id').primaryKey(), // Generated by Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneNumber: text('phone_number').unique(), // For phone login / WhatsApp matching
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('STUDENT'),
  isActive: boolean('is_active').notNull().default(true),
  specialization: text('specialization'), // Optional for Teachers
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. COURSES, MODULES & LESSONS
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  courseType: courseTypeEnum('course_type').notNull().default('ACADEMIC'),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  semester: text('semester'), // e.g., "Semester 1", "Semester 2"
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // Teacher notes / instructions
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. GROUPS (COHORTS) & ENROLLMENTS
// ==========================================
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Sun/Tue 4PM Batch"
  joinCode: text('join_code').notNull().unique(), // e.g., "OM4829"
  unlockAllByDefault: boolean('unlock_all_by_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupStudents = pgTable(
  'group_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupStudent: uniqueIndex('unique_group_student_idx').on(
      table.groupId,
      table.studentId,
    ),
  }),
);

export const groupLessonAccess = pgTable(
  'group_lesson_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    isUnlocked: boolean('is_unlocked').notNull().default(true),
  },
  (table) => ({
    uniqueGroupLesson: uniqueIndex('unique_group_lesson_idx').on(
      table.groupId,
      table.lessonId,
    ),
  }),
);

// ==========================================
// 6. CLOUDFLARE R2 LESSON ATTACHMENTS
// ==========================================
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }), // Null = Master Course File; Populated = Specific to one Group only
  title: text('title').notNull(),
  r2ObjectKey: text('r2_object_key').notNull(), // e.g., "courses/{courseId}/lessons/{lessonId}/worksheet.pdf"
  publicOrSignedUrl: text('public_or_signed_url').notNull(),
  fileType: attachmentTypeEnum('file_type').notNull().default('PDF'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 7. QUIZZES, ATTEMPTS & COMPLETION
// ==========================================
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull().default('MCQ'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(), // e.g. ["Option A", "Option B"] for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  answersJson: jsonb('answers_json').notNull(), // Stores student responses
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLessonCompletion: uniqueIndex('unique_lesson_completion_idx').on(
      table.lessonId,
      table.studentId,
    ),
  }),
);

// ==========================================
// 8. CUSTOM GROUP GRADEBOOK (MANUAL MARKINGS)
// ==========================================
export const manualGradeColumns = pgTable('manual_grade_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Speaking Test 1", "Homework 3"
  maxScore: integer('max_score').notNull().default(10),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const manualGradeValues = pgTable(
  'manual_grade_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    columnId: uuid('column_id')
      .notNull()
      .references(() => manualGradeColumns.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    teacherNote: text('teacher_note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCellGrade: uniqueIndex('unique_manual_grade_cell_idx').on(
      table.columnId,
      table.studentId,
    ),
  }),
);
```

---

## 5. Backend Architecture (NestJS + Better Auth + Cloudflare R2)

### 5.1. Better Auth Configuration (`src/auth/auth.ts`)
Configure Better Auth with the Drizzle adapter, custom user attributes (`role`, `phoneNumber`, `gradeId`, `isActive`), and cookie-based sessions:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT' },
      phoneNumber: { type: 'string', required: false },
      gradeId: { type: 'string', required: false },
      specialization: { type: 'string', required: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
});
```

### 5.2. Cloudflare R2 Storage Service (`src/storage/r2.service.ts`)
To keep the NestJS server fast and lightweight, file uploads use **Cloudflare R2 Presigned URLs**:
1. **Upload Flow:**
   * Teacher selects a file (e.g., `Unit1_Worksheet.pdf`) in the React app.
   * Frontend calls `POST /api/storage/presigned-upload` with `{ fileName, mimeType, fileSize, courseId, lessonId }`.
   * NestJS generates an R2 Object Key (`courses/${courseId}/lessons/${lessonId}/${uuid}-${fileName}`) and returns a `presignedPutUrl` using `@aws-sdk/s3-request-presigner`.
   * Frontend uploads the binary directly to Cloudflare R2 via `PUT`.
   * Frontend calls `POST /api/lessons/:lessonId/attachments` to save the metadata in PostgreSQL via Drizzle.
2. **Download Flow:**
   * Either serve via a custom Cloudflare R2 Public Bucket domain or generate a presigned `GetObjectCommand` URL valid for 1 hour when a student views a lesson.

### 5.3. Core NestJS API Endpoints

#### Auth & Onboarding
* `ALL /api/auth/*` — Handled directly by Better Auth handler mounted in NestJS controller.
* `POST /api/onboarding/teacher` — Registers a teacher account with `role: 'TEACHER'`.
* `POST /api/onboarding/join/:joinCode` — Validates group code and adds current authenticated student to `group_students`.

#### Student Endpoints (`@Roles('STUDENT')`)
* `GET /api/student/groups` — Returns all groups the student is enrolled in, with course metadata and completion percentage.
* `POST /api/student/groups/join` — Enrolls student into a group using `{ joinCode }`.
* `GET /api/student/groups/:groupId/curriculum` — Returns course modules and lessons filtered by `group_lesson_access` (hides locked lessons) and includes group-specific attachments.
* `POST /api/student/lessons/:lessonId/complete` — Marks lesson complete.
* `POST /api/student/quizzes/:quizId/submit` — Auto-grades MCQ/True-False/Short Answer questions and records `quiz_attempts`.
* `GET /api/student/groups/:groupId/grades` — Returns student's quiz scores and manual teacher markings for that group.

#### Teacher Endpoints (`@Roles('TEACHER', 'ADMIN')`)
* `GET /api/teacher/courses` & `POST /api/teacher/courses` — List and create courses (`ACADEMIC` or `GENERAL`).
* `POST /api/teacher/courses/:courseId/modules` — Add/reorder modules.
* `POST /api/teacher/modules/:moduleId/lessons` — Create/edit lessons.
* `POST /api/storage/presigned-upload` — Get Cloudflare R2 upload URL.
* `POST /api/teacher/lessons/:lessonId/attachments` — Attach uploaded R2 file to a lesson (or specific group).
* `POST /api/teacher/lessons/:lessonId/quiz` — Upsert inline quiz and questions.
* `POST /api/teacher/courses/:courseId/groups` — Create a new Group (`joinCode` auto-generated, e.g., `OM-4829`).
* `PATCH /api/teacher/groups/:groupId/lessons/:lessonId/access` — Toggle `isUnlocked` for a specific group.
* `GET /api/teacher/groups/:groupId/gradebook` — Returns full matrix of enrolled students, their quiz scores, and all `manual_grade_columns` + `manual_grade_values`.
* `POST /api/teacher/groups/:groupId/gradebook/columns` — Add a custom marking column.
* `PUT /api/teacher/groups/:groupId/gradebook/cell` — Upsert a student's score in a custom column (called on input blur).
* `POST /api/teacher/groups/:groupId/roster/bulk` — Bulk create/enroll students by phone/name list.

#### Admin Endpoints (`@Roles('ADMIN')`)
* `GET /api/admin/overview` — Global counts (teachers, students, courses, groups).
* `GET /api/admin/teachers` — Paginated/filtered list of all teachers (`?status=ACTIVE&search=...`).
* `PATCH /api/admin/users/:userId/status` — Activate/suspend any user and revoke active sessions in `sessions` table.
* `GET /api/admin/students` — Filter students by `gradeId`, `courseId`, `groupId`, `teacherId`, or search string.
* `GET /api/admin/courses` & `GET /api/admin/groups` — Global explorer with filters for `courseType`, `gradeId`, `categoryId`, `teacherId`.
* `CRUD /api/admin/taxonomy/grades` & `CRUD /api/admin/taxonomy/categories` — Manage grades and general skill categories.

---

## 6. Frontend Route & Component Structure (React)

* `/login` — Unified login (Phone/Email + Password via Better Auth client).
* `/register/teacher` — Teacher self-registration page.
* `/register/student` — Student self-registration page.
* `/join/:joinCode` — WhatsApp Magic Invite landing page (auto-enrolls logged-in students or shows 1-step registration).
* `/student`
  * `/student/dashboard` — Enrolled Groups cards + "Enter 6-Digit Group Code" button.
  * `/student/groups/:groupId` — Linear curriculum view, R2 file download cards, inline Quiz component, and "My Marks" tab.
* `/teacher`
  * `/teacher/dashboard` — List of Teacher's Courses & Quick Group links.
  *# Master Product & Technical Specification: Hybrid Cohort-Based LMS

## 1. Project Overview & Core Philosophy

A lightweight, mobile-first Learning Management System (LMS) tailored for school curriculum teachers (specifically targeting the Oman academic demographic) and freelance instructors teaching general skill-based courses (e.g., English speaking, grammar).

### Core Architectural Pillars
* **Hybrid Course Taxonomy:** Courses can either be tied to an Academic Grade/Semester (School Curriculum) or categorized as General/Skill-based courses.
* **Course vs. Group (Cohort) Separation:** Teachers build a Course's master curriculum once. Under each course, they create multiple **Groups (Cohorts)**. Students enroll into a specific Group via a direct magic invite link or 6-digit code. Teachers control lesson visibility (pacing) and gradebooks per Group.
* **No-Video MVP:** The initial release focuses strictly on structured lessons, downloadable materials (PDFs, Word docs, audio, images), and inline quizzes/assessments. The attachment schema remains polymorphic to support video later without database refactoring.
* **Zero-Friction UX:** Designed to be "parent-proof" and student-friendly. Minimal clicks, inline spreadsheet-like grading, and seamless WhatsApp link sharing.
* **Bilingual & RTL Ready:** Full support for Arabic (RTL) and English (LTR) layouts.

---

## 2. Tech Stack Specification

### Frontend
* **Framework:** React (Vite + TypeScript)
* **Styling:** Tailwind CSS (configured with logical properties for seamless RTL/LTR switching) + Lucide Icons
* **State & Data Fetching:** TanStack Query (React Query) + Zustand (for UI state)
* **Auth Client:** `better-auth/react` (configured with `credentials: 'include'` for session cookies)
* **Routing:** React Router v6+
* **Forms & Validation:** React Hook Form + Zod

### Backend
* **Framework:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM:** **Drizzle ORM** (`drizzle-orm/node-postgres` + `drizzle-kit` for migrations)
* **Authentication:** **Better Auth** using **Database-backed HTTP-Only Cookie Sessions** (integrated via Drizzle adapter, using username/phone-number & email/password plugins + custom `role` fields).
* **File Storage:** **Cloudflare R2** using AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct client-to-R2 presigned uploads and downloads.

---

## 3. User Roles & Core Workflows

### 3.1. Authentication & Session Management (Better Auth)
1. **Session Strategy:** Better Auth manages stateful sessions stored in PostgreSQL (`session` table) and transmitted via secure HTTP-only cookies. NestJS uses a global `AuthGuard` that calls `auth.api.getSession({ headers: request.headers })` to validate requests and attach `user` and `session` objects.
2. **Teacher Self-Registration:** Teachers sign up directly on `/register/teacher` using Full Name, Phone Number, Email, Password, and Specialization. Their role is set to `TEACHER` and they are redirected to the Teacher Studio.
3. **Student Registration & Group Join Flow:**
   * Students can register via `/register/student` (Full Name, Phone Number, Password, optional Grade level).
   * **Magic Group Link Flow (`/join/:joinCode`):** A teacher shares a link (e.g., `https://lms.domain.com/join/OM4829`) on WhatsApp. If the student has an active session, clicking it immediately enrolls them into that Group. If not logged in, they see a 1-step Quick Register/Login card and are automatically placed in the Group upon completion.

### 3.2. Student Platform
* **My Courses / Groups Dashboard:** Displays cards for every Group/Course the student belongs to, showing Course Title, Teacher Name, Group Name, and a visual Progress Bar.
* **Join Group Modal:** A prominent input box where students can type a 6-digit `joinCode` to join a new class at any time.
* **Course & Lesson View:**
  * Displays Modules (Units) and Lessons that are **unlocked for the student's specific Group**.
  * **Lesson Page:** Shows Lesson Title, Teacher Notes/Instructions, a list of downloadable files hosted on Cloudflare R2 (PDFs, worksheets, audio files), and any Group-specific announcements/files.
  * **Inline Quiz Engine:** Directly below the lesson material, students can take the lesson's quiz (Multiple Choice, True/False, Short Answer), submit answers, and immediately view their score + explanations.
  * **Completion Toggle:** "Mark Lesson as Complete" button.
* **My Grades View:** Allows the student to see their quiz scores and any custom manual grades (e.g., "Speaking Test 1", "Homework 2") recorded by the teacher in their Group.

### 3.3. Teacher Platform
* **Course Manager:**
  * Create and edit courses. Select Course Type: `ACADEMIC` (select Grade & Semester) or `GENERAL` (select Category/Skill).
  * **2-Level Curriculum Builder:** Add/reorder `Modules` -> Add/reorder `Lessons`.
  * **Lesson Editor:** Input Lesson Title, text instructions, upload attachments directly to **Cloudflare R2** via presigned PUT URLs (PDF, DOCX, PPTX, MP3, ZIP), and build an optional inline Quiz.
* **Group (Cohort) Command Center:** Inside any course, the teacher can create multiple Groups (e.g., *Grade 10 - Sun/Tue 4PM* or *English Speaking - Batch A*). Clicking a group opens 3 tabs:
  1. **Pacing & Content Tab:** Lists all lessons in the course with an `Unlocked / Locked` toggle switch specific to this group. Also allows uploading a **Group-Specific File/Note** to Cloudflare R2 (e.g., a special homework PDF just for this group).
  2. **Gradebook Matrix Tab:** A spreadsheet-style table:
     * **Rows:** Students enrolled in this group.
     * **Columns:** Auto-graded Lesson Quizzes + **Custom Manual Grade Columns**.
     * **Custom Markings:** Teacher clicks `+ Add Grade Column` (e.g., Title: *"Midterm Exam"*, Max Score: `20`). Teacher types scores directly into cells next to each student; changes auto-save on blur.
  3. **Roster & Invite Tab:**
     * Displays the unique **Shareable Join Link** and **6-Digit Join Code** with a 1-click "Copy for WhatsApp" button.
     * **Bulk Add Students:** Paste a list of student names/phone numbers or add a student manually by phone number.
     * **Move/Remove Student:** Transfer a student to another Group within the same course or remove them.

### 3.4. Admin / Operations Platform
A comprehensive operational command center with global visibility and deep filtering across every entity:
* **Global Overview Metrics:** Total Active Teachers, Total Students, Total Courses (Academic vs. General), Total Active Groups.
* **Teachers Directory & Filter:** View all registered teachers. Filter by status (`ACTIVE`, `SUSPENDED`), subject/category, course count, or search by name/phone. Ability to suspend/activate teachers or inspect their courses.
* **Students Directory & Filter:** View all students. Filter by Grade Level, enrolled Course, specific Group, Teacher, or search by name/phone. Ability to reset passwords, revoke sessions, or manually enroll/remove a student from any Group.
* **Courses & Groups Master Explorer:** View all courses and groups across the platform. Filter by Academic vs. General, Grade, Teacher, or Group status. Admins can inspect any course curriculum or group gradebook.
* **Taxonomy Manager:** CRUD interface to manage Academic Grades (e.g., Grade 5 to Grade 12), Semesters, and General Course Categories (e.g., English Speaking, Grammar, IELTS).

---

## 4. Database Schema (PostgreSQL + Drizzle ORM + Better Auth)

Below is the complete `schema.ts` file using `drizzle-orm/pg-core`, including Better Auth's required core session tables (`users`, `sessions`, `accounts`, `verifications`) and all LMS domain tables.

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum('role', ['ADMIN', 'TEACHER', 'STUDENT']);
export const courseTypeEnum = pgEnum('course_type', ['ACADEMIC', 'GENERAL']);
export const attachmentTypeEnum = pgEnum('attachment_type', [
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO', // Reserved for future phase
]);
export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

// ==========================================
// 2. TAXONOMY TABLES (Grades & Categories)
// ==========================================
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "Grade 10", "Grade 11"
  displayOrder: integer('display_order').notNull().default(0),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "English Speaking", "Grammar"
});

// ==========================================
// 3. BETTER AUTH + USER TABLES (Sessions)
// ==========================================
export const users = pgTable('user', {
  id: text('id').primaryKey(), // Generated by Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneNumber: text('phone_number').unique(), // For phone login / WhatsApp matching
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('STUDENT'),
  isActive: boolean('is_active').notNull().default(true),
  specialization: text('specialization'), // Optional for Teachers
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. COURSES, MODULES & LESSONS
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  courseType: courseTypeEnum('course_type').notNull().default('ACADEMIC'),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  semester: text('semester'), // e.g., "Semester 1", "Semester 2"
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // Teacher notes / instructions
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. GROUPS (COHORTS) & ENROLLMENTS
// ==========================================
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Sun/Tue 4PM Batch"
  joinCode: text('join_code').notNull().unique(), // e.g., "OM4829"
  unlockAllByDefault: boolean('unlock_all_by_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupStudents = pgTable(
  'group_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupStudent: uniqueIndex('unique_group_student_idx').on(
      table.groupId,
      table.studentId,
    ),
  }),
);

export const groupLessonAccess = pgTable(
  'group_lesson_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    isUnlocked: boolean('is_unlocked').notNull().default(true),
  },
  (table) => ({
    uniqueGroupLesson: uniqueIndex('unique_group_lesson_idx').on(
      table.groupId,
      table.lessonId,
    ),
  }),
);

// ==========================================
// 6. CLOUDFLARE R2 LESSON ATTACHMENTS
// ==========================================
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }), // Null = Master Course File; Populated = Specific to one Group only
  title: text('title').notNull(),
  r2ObjectKey: text('r2_object_key').notNull(), // e.g., "courses/{courseId}/lessons/{lessonId}/worksheet.pdf"
  publicOrSignedUrl: text('public_or_signed_url').notNull(),
  fileType: attachmentTypeEnum('file_type').notNull().default('PDF'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 7. QUIZZES, ATTEMPTS & COMPLETION
// ==========================================
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull().default('MCQ'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(), // e.g. ["Option A", "Option B"] for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  answersJson: jsonb('answers_json').notNull(), // Stores student responses
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLessonCompletion: uniqueIndex('unique_lesson_completion_idx').on(
      table.lessonId,
      table.studentId,
    ),
  }),
);

// ==========================================
// 8. CUSTOM GROUP GRADEBOOK (MANUAL MARKINGS)
// ==========================================
export const manualGradeColumns = pgTable('manual_grade_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Speaking Test 1", "Homework 3"
  maxScore: integer('max_score').notNull().default(10),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const manualGradeValues = pgTable(
  'manual_grade_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    columnId: uuid('column_id')
      .notNull()
      .references(() => manualGradeColumns.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    teacherNote: text('teacher_note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCellGrade: uniqueIndex('unique_manual_grade_cell_idx').on(
      table.columnId,
      table.studentId,
    ),
  }),
);
```

---

## 5. Backend Architecture (NestJS + Better Auth + Cloudflare R2)

### 5.1. Better Auth Configuration (`src/auth/auth.ts`)
Configure Better Auth with the Drizzle adapter, custom user attributes (`role`, `phoneNumber`, `gradeId`, `isActive`), and cookie-based sessions:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT' },
      phoneNumber: { type: 'string', required: false },
      gradeId: { type: 'string', required: false },
      specialization: { type: 'string', required: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
});
```

### 5.2. Cloudflare R2 Storage Service (`src/storage/r2.service.ts`)
To keep the NestJS server fast and lightweight, file uploads use **Cloudflare R2 Presigned URLs**:
1. **Upload Flow:**
   * Teacher selects a file (e.g., `Unit1_Worksheet.pdf`) in the React app.
   * Frontend calls `POST /api/storage/presigned-upload` with `{ fileName, mimeType, fileSize, courseId, lessonId }`.
   * NestJS generates an R2 Object Key (`courses/${courseId}/lessons/${lessonId}/${uuid}-${fileName}`) and returns a `presignedPutUrl` using `@aws-sdk/s3-request-presigner`.
   * Frontend uploads the binary directly to Cloudflare R2 via `PUT`.
   * Frontend calls `POST /api/lessons/:lessonId/attachments` to save the metadata in PostgreSQL via Drizzle.
2. **Download Flow:**
   * Either serve via a custom Cloudflare R2 Public Bucket domain or generate a presigned `GetObjectCommand` URL valid for 1 hour when a student views a lesson.

### 5.3. Core NestJS API Endpoints

#### Auth & Onboarding
* `ALL /api/auth/*` — Handled directly by Better Auth handler mounted in NestJS controller.
* `POST /api/onboarding/teacher` — Registers a teacher account with `role: 'TEACHER'`.
* `POST /api/onboarding/join/:joinCode` — Validates group code and adds current authenticated student to `group_students`.

#### Student Endpoints (`@Roles('STUDENT')`)
* `GET /api/student/groups` — Returns all groups the student is enrolled in, with course metadata and completion percentage.
* `POST /api/student/groups/join` — Enrolls student into a group using `{ joinCode }`.
* `GET /api/student/groups/:groupId/curriculum` — Returns course modules and lessons filtered by `group_lesson_access` (hides locked lessons) and includes group-specific attachments.
* `POST /api/student/lessons/:lessonId/complete` — Marks lesson complete.
* `POST /api/student/quizzes/:quizId/submit` — Auto-grades MCQ/True-False/Short Answer questions and records `quiz_attempts`.
* `GET /api/student/groups/:groupId/grades` — Returns student's quiz scores and manual teacher markings for that group.

#### Teacher Endpoints (`@Roles('TEACHER', 'ADMIN')`)
* `GET /api/teacher/courses` & `POST /api/teacher/courses` — List and create courses (`ACADEMIC` or `GENERAL`).
* `POST /api/teacher/courses/:courseId/modules` — Add/reorder modules.
* `POST /api/teacher/modules/:moduleId/lessons` — Create/edit lessons.
* `POST /api/storage/presigned-upload` — Get Cloudflare R2 upload URL.
* `POST /api/teacher/lessons/:lessonId/attachments` — Attach uploaded R2 file to a lesson (or specific group).
* `POST /api/teacher/lessons/:lessonId/quiz` — Upsert inline quiz and questions.
* `POST /api/teacher/courses/:courseId/groups` — Create a new Group (`joinCode` auto-generated, e.g., `OM-4829`).
* `PATCH /api/teacher/groups/:groupId/lessons/:lessonId/access` — Toggle `isUnlocked` for a specific group.
* `GET /api/teacher/groups/:groupId/gradebook` — Returns full matrix of enrolled students, their quiz scores, and all `manual_grade_columns` + `manual_grade_values`.
* `POST /api/teacher/groups/:groupId/gradebook/columns` — Add a custom marking column.
* `PUT /api/teacher/groups/:groupId/gradebook/cell` — Upsert a student's score in a custom column (called on input blur).
* `POST /api/teacher/groups/:groupId/roster/bulk` — Bulk create/enroll students by phone/name list.

#### Admin Endpoints (`@Roles('ADMIN')`)
* `GET /api/admin/overview` — Global counts (teachers, students, courses, groups).
* `GET /api/admin/teachers` — Paginated/filtered list of all teachers (`?status=ACTIVE&search=...`).
* `PATCH /api/admin/users/:userId/status` — Activate/suspend any user and revoke active sessions in `sessions` table.
* `GET /api/admin/students` — Filter students by `gradeId`, `courseId`, `groupId`, `teacherId`, or search string.
* `GET /api/admin/courses` & `GET /api/admin/groups` — Global explorer with filters for `courseType`, `gradeId`, `categoryId`, `teacherId`.
* `CRUD /api/admin/taxonomy/grades` & `CRUD /api/admin/taxonomy/categories` — Manage grades and general skill categories.

---

## 6. Frontend Route & Component Structure (React)

* `/login` — Unified login (Phone/Email + Password via Better Auth client).
* `/register/teacher` — Teacher self-registration page.
* `/register/student` — Student self-registration page.
* `/join/:joinCode` — WhatsApp Magic Invite landing page (auto-enrolls logged-in students or shows 1-step registration).
* `/student`
  * `/student/dashboard` — Enrolled Groups cards + "Enter 6-Digit Group Code" button.
  * `/student/groups/:groupId` — Linear curriculum view, R2 file download cards, inline Quiz component, and "My Marks" tab.
* `/teacher`
  * `/teacher/dashboard` — List of Teacher's Courses & Quick Group links.
  * `/teacher/courses/:courseId/curriculum` — 2-level Module/Lesson builder + R2 Dropzone uploader + Quiz builder.
  * `/teacher/groups/:groupId` — **Group Command Center** with 3 tabs:
    1. *Pacing & Group Files* (Unlock switches + group R2 upload)
    2. *Gradebook Matrix* (Auto-graded quizzes + inline editable custom grade columns)
    3. *Roster & WhatsApp Invite* (Copy link/code + bulk add students)
* `/admin`
  * `/admin/dashboard` — Global metrics & activity overview.
  * `/admin/teachers` — Filterable teacher directory & status toggles.
  * `/admin/students` — Deep-filter student directory (by Grade, Group, Course, Teacher).
  * `/admin/courses-groups` — Master explorer for all courses and cohorts.
  * `/admin/taxonomy` — Grades & General Categories manager.

---

## 7. Environment Variables (`.env.example`)

```env
# PostgreSQL (Drizzle ORM)
DATABASE_URL="postgresql://postgres:password@localhost:5432/oman_lms"

# Better Auth
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="lms-attachments"
R2_PUBLIC_URL="https://files.yourdomain.com"

# Frontend URL (for CORS & Magic Join Links)
FRONTEND_URL="http://localhost:5173"
``` `/teacher/courses/:courseId/curriculum` — 2-level Module/Lesson builder + R2 Dropzone uploader + Quiz builder.
  * `/teacher/groups/:groupId` — **Group Command Center** with 3 tabs:
    1. *Pacing & Group Files* (Unlock switches + group R2 upload)
    2. *Gradebook Matrix* (Auto-graded quizzes + inline editable custom grade columns)
    3. *Roster & WhatsApp Invite* (Copy link/code + bulk add students)
* `/admin`
  * `/admin/dashboard` — Global metrics & activity overview.
  * `/admin/teachers` — Filterable teacher directory & status toggles.
  * `/admin/students` — Deep-filter student directory (by Grade, Group, Course, Teacher).
  * `/admin/courses-groups` — Master explorer for all courses and cohorts.
  * `/admin/taxonomy` — Grades & General Categories manager.

---

## 7. Environment Variables (`.env.example`)

```env
# PostgreSQL (Drizzle ORM)
DATABASE_URL="postgresql://postgres:password@localhost:5432/oman_lms"

# Better Auth
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="lms-attachments"
R2_PUBLIC_URL="https://files.yourdomain.com"

# Frontend URL (for CORS & Magic Join Links)
FRONTEND_URL="http://localhost:5173"
``` enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT' },
      phoneNumber: { type: 'string', required: false },
      gradeId: { type: 'string', required: false },
      specialization: { type: 'string', required: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
});
```

### 5.2. Cloudflare R2 Storage Service (`src/storage/r2.service.ts`)
To keep the NestJS server fast and lightweight, file uploads use **Cloudflare R2 Presigned URLs**:
1. **Upload Flow:**
   * Teacher selects a file (e.g., `Unit1_Worksheet.pdf`) in the React app.
   * Frontend calls `POST /api/storage/presigned-upload` with `{ fileName, mimeType, fileSize, courseId, lessonId }`.
   * NestJS generates an R2 Object Key (`courses/${courseId}/lessons/${lessonId}/${uuid}-${fileName}`) and returns a `presignedPutUrl` using `@aws-sdk/s3-request-presigner`.
   * Frontend uploads the binary directly to Cloudflare R2 via `PUT`.
   * Frontend calls `POST /api/lessons/:lessonId/attachments` to save the metadata in PostgreSQL via Drizzle.
2. **Download Flow:**
   * Either serve via a custom Cloudflare R2 Public Bucket domain or generate a presigned `GetObjectCommand` URL valid for 1 hour when a student views a lesson.

### 5.3. Core NestJS API Endpoints

#### Auth & Onboarding
* `ALL /api/auth/*` — Handled directly by Better Auth handler mounted in NestJS controller.
* `POST /api/onboarding/teacher` — Registers a teacher account with `role: 'TEACHER'`.
* `POST /api/onboarding/join/:joinCode` — Validates group code and adds current authenticated student to `group_students`.

#### Student Endpoints (`@Roles('STUDENT')`)
* `GET /api/student/groups` — Returns all groups the student is enrolled in, with course metadata and completion percentage.
* `POST /api/student/groups/join` — Enrolls student into a group using `{ joinCode }`.
* `GET /api/student/groups/:groupId/curriculum` — Returns course modules and lessons filtered by `group_lesson_access` (hides locked lessons) and includes group-specific attachments.
* `POST /api/student/lessons/:lessonId/complete` — Marks lesson complete.
* `POST /api/student/quizzes/:quizId/submit` — Auto-grades MCQ/True-False/Short Answer questions and records `quiz_attempts`.
* `GET /api/student/groups/:groupId/grades` — Returns student's quiz scores and manual teacher markings for that group.

#### Teacher Endpoints (`@Roles('TEACHER', 'ADMIN')`)
* `GET /api/teacher/courses` & `POST /api/teacher/courses` — List and create courses (`ACADEMIC` or `GENERAL`).
* `POST /api/teacher/courses/:courseId/modules` — Add/reorder modules.
* `POST /api/teacher/modules/:moduleId/lessons` — Create/edit lessons.
* `POST /api/storage/presigned-upload` — Get Cloudflare R2 upload URL.
* `POST /api/teacher/lessons/:lessonId/attachments` — Attach uploaded R2 file to a lesson (or specific group).
* `POST /api/teacher/lessons/:lessonId/quiz` — Upsert inline quiz and questions.
* `POST /api/teacher/courses/:courseId/groups` — Create a new Group (`joinCode` auto-generated, e.g., `OM-4829`).
* `PATCH /api/teacher/groups/:groupId/lessons/:lessonId/access` — Toggle `isUnlocked` for a specific group.
* `GET /api/teacher/groups/:groupId/gradebook` — Returns full matrix of enrolled students, their quiz scores, and all `manual_grade_columns` + `manual_grade_values`.
* `POST /api/teacher/groups/:groupId/gradebook/columns` — Add a custom marking column.
* `PUT /api/teacher/groups/:groupId/gradebook/cell` — Upsert a student's score in a custom column (called on input blur).
* `POST /api/teacher/groups/:groupId/roster/bulk` — Bulk create/enroll students by phone/name list.

#### Admin Endpoints (`@Roles('ADMIN')`)
* `GET /api/admin/overview` — Global counts (teachers, students, courses, groups).
* `GET /api/admin/teachers` — Paginated/filtered list of all teachers (`?status=ACTIVE&search=...`).
* `PATCH /api/admin/users/:userId/status` — Activate/suspend any user and revoke active sessions in `sessions` table.
* `GET /api/admin/students` — Filter students by `gradeId`, `courseId`, `groupId`, `teacherId`, or search string.
* `GET /api/admin/courses` & `GET /api/admin/groups` — Global explorer with filters for `courseType`, `gradeId`, `categoryId`, `teacherId`.
* `CRUD /api/admin/taxonomy/grades` & `CRUD /api/admin/taxonomy/categories` — Manage grades and general skill categories.

---

## 6. Frontend Route & Component Structure (React)

* `/login` — Unified login (Phone/Email + Password via Better Auth client).
* `/register/teacher` — Teacher self-registration page.
* `/register/student` — Student self-registration page.
* `/join/:joinCode` — WhatsApp Magic Invite landing page (auto-enrolls logged-in students or shows 1-step registration).
* `/student`
  * `/student/dashboard` — Enrolled Groups cards + "Enter 6-Digit Group Code" button.
  * `/student/groups/:groupId` — Linear curriculum view, R2 file download cards, inline Quiz component, and "My Marks" tab.
* `/teacher`
  * `/teacher/dashboard` — List of Teacher's Courses & Quick Group links.
  * `/teacher/courses/:courseId/curriculum` — 2-level Module/Lesson builder + R2 Dropzone uploader + Quiz builder.
  * `/teacher/groups/:groupId` — **Group Command Center** with 3 tabs:
    1. *Pacing & Group Files* (Unlock switches + group R2 upload)
    2. *Gradebook Matrix* (Auto-graded quizzes + inline editable custom grade columns)
    3. *Roster & WhatsApp Invite* (Copy link/code + bulk add students)
* `/admin`
  * `/admin/dashboard` — Global metrics & activity overview.
  *# Master Product & Technical Specification: Hybrid Cohort-Based LMS

## 1. Project Overview & Core Philosophy

A lightweight, mobile-first Learning Management System (LMS) tailored for school curriculum teachers (specifically targeting the Oman academic demographic) and freelance instructors teaching general skill-based courses (e.g., English speaking, grammar).

### Core Architectural Pillars
* **Hybrid Course Taxonomy:** Courses can either be tied to an Academic Grade/Semester (School Curriculum) or categorized as General/Skill-based courses.
* **Course vs. Group (Cohort) Separation:** Teachers build a Course's master curriculum once. Under each course, they create multiple **Groups (Cohorts)**. Students enroll into a specific Group via a direct magic invite link or 6-digit code. Teachers control lesson visibility (pacing) and gradebooks per Group.
* **No-Video MVP:** The initial release focuses strictly on structured lessons, downloadable materials (PDFs, Word docs, audio, images), and inline quizzes/assessments. The attachment schema remains polymorphic to support video later without database refactoring.
* **Zero-Friction UX:** Designed to be "parent-proof" and student-friendly. Minimal clicks, inline spreadsheet-like grading, and seamless WhatsApp link sharing.
* **Bilingual & RTL Ready:** Full support for Arabic (RTL) and English (LTR) layouts.

---

## 2. Tech Stack Specification

### Frontend
* **Framework:** React (Vite + TypeScript)
* **Styling:** Tailwind CSS (configured with logical properties for seamless RTL/LTR switching) + Lucide Icons
* **State & Data Fetching:** TanStack Query (React Query) + Zustand (for UI state)
* **Auth Client:** `better-auth/react` (configured with `credentials: 'include'` for session cookies)
* **Routing:** React Router v6+
* **Forms & Validation:** React Hook Form + Zod

### Backend
* **Framework:** NestJS (TypeScript)
* **Database:** PostgreSQL
* **ORM:** **Drizzle ORM** (`drizzle-orm/node-postgres` + `drizzle-kit` for migrations)
* **Authentication:** **Better Auth** using **Database-backed HTTP-Only Cookie Sessions** (integrated via Drizzle adapter, using username/phone-number & email/password plugins + custom `role` fields).
* **File Storage:** **Cloudflare R2** using AWS SDK v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) for direct client-to-R2 presigned uploads and downloads.

---

## 3. User Roles & Core Workflows

### 3.1. Authentication & Session Management (Better Auth)
1. **Session Strategy:** Better Auth manages stateful sessions stored in PostgreSQL (`session` table) and transmitted via secure HTTP-only cookies. NestJS uses a global `AuthGuard` that calls `auth.api.getSession({ headers: request.headers })` to validate requests and attach `user` and `session` objects.
2. **Teacher Self-Registration:** Teachers sign up directly on `/register/teacher` using Full Name, Phone Number, Email, Password, and Specialization. Their role is set to `TEACHER` and they are redirected to the Teacher Studio.
3. **Student Registration & Group Join Flow:**
   * Students can register via `/register/student` (Full Name, Phone Number, Password, optional Grade level).
   * **Magic Group Link Flow (`/join/:joinCode`):** A teacher shares a link (e.g., `https://lms.domain.com/join/OM4829`) on WhatsApp. If the student has an active session, clicking it immediately enrolls them into that Group. If not logged in, they see a 1-step Quick Register/Login card and are automatically placed in the Group upon completion.

### 3.2. Student Platform
* **My Courses / Groups Dashboard:** Displays cards for every Group/Course the student belongs to, showing Course Title, Teacher Name, Group Name, and a visual Progress Bar.
* **Join Group Modal:** A prominent input box where students can type a 6-digit `joinCode` to join a new class at any time.
* **Course & Lesson View:**
  * Displays Modules (Units) and Lessons that are **unlocked for the student's specific Group**.
  * **Lesson Page:** Shows Lesson Title, Teacher Notes/Instructions, a list of downloadable files hosted on Cloudflare R2 (PDFs, worksheets, audio files), and any Group-specific announcements/files.
  * **Inline Quiz Engine:** Directly below the lesson material, students can take the lesson's quiz (Multiple Choice, True/False, Short Answer), submit answers, and immediately view their score + explanations.
  * **Completion Toggle:** "Mark Lesson as Complete" button.
* **My Grades View:** Allows the student to see their quiz scores and any custom manual grades (e.g., "Speaking Test 1", "Homework 2") recorded by the teacher in their Group.

### 3.3. Teacher Platform
* **Course Manager:**
  * Create and edit courses. Select Course Type: `ACADEMIC` (select Grade & Semester) or `GENERAL` (select Category/Skill).
  * **2-Level Curriculum Builder:** Add/reorder `Modules` -> Add/reorder `Lessons`.
  * **Lesson Editor:** Input Lesson Title, text instructions, upload attachments directly to **Cloudflare R2** via presigned PUT URLs (PDF, DOCX, PPTX, MP3, ZIP), and build an optional inline Quiz.
* **Group (Cohort) Command Center:** Inside any course, the teacher can create multiple Groups (e.g., *Grade 10 - Sun/Tue 4PM* or *English Speaking - Batch A*). Clicking a group opens 3 tabs:
  1. **Pacing & Content Tab:** Lists all lessons in the course with an `Unlocked / Locked` toggle switch specific to this group. Also allows uploading a **Group-Specific File/Note** to Cloudflare R2 (e.g., a special homework PDF just for this group).
  2. **Gradebook Matrix Tab:** A spreadsheet-style table:
     * **Rows:** Students enrolled in this group.
     * **Columns:** Auto-graded Lesson Quizzes + **Custom Manual Grade Columns**.
     * **Custom Markings:** Teacher clicks `+ Add Grade Column` (e.g., Title: *"Midterm Exam"*, Max Score: `20`). Teacher types scores directly into cells next to each student; changes auto-save on blur.
  3. **Roster & Invite Tab:**
     * Displays the unique **Shareable Join Link** and **6-Digit Join Code** with a 1-click "Copy for WhatsApp" button.
     * **Bulk Add Students:** Paste a list of student names/phone numbers or add a student manually by phone number.
     * **Move/Remove Student:** Transfer a student to another Group within the same course or remove them.

### 3.4. Admin / Operations Platform
A comprehensive operational command center with global visibility and deep filtering across every entity:
* **Global Overview Metrics:** Total Active Teachers, Total Students, Total Courses (Academic vs. General), Total Active Groups.
* **Teachers Directory & Filter:** View all registered teachers. Filter by status (`ACTIVE`, `SUSPENDED`), subject/category, course count, or search by name/phone. Ability to suspend/activate teachers or inspect their courses.
* **Students Directory & Filter:** View all students. Filter by Grade Level, enrolled Course, specific Group, Teacher, or search by name/phone. Ability to reset passwords, revoke sessions, or manually enroll/remove a student from any Group.
* **Courses & Groups Master Explorer:** View all courses and groups across the platform. Filter by Academic vs. General, Grade, Teacher, or Group status. Admins can inspect any course curriculum or group gradebook.
* **Taxonomy Manager:** CRUD interface to manage Academic Grades (e.g., Grade 5 to Grade 12), Semesters, and General Course Categories (e.g., English Speaking, Grammar, IELTS).

---

## 4. Database Schema (PostgreSQL + Drizzle ORM + Better Auth)

Below is the complete `schema.ts` file using `drizzle-orm/pg-core`, including Better Auth's required core session tables (`users`, `sessions`, `accounts`, `verifications`) and all LMS domain tables.

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. ENUMS
// ==========================================
export const roleEnum = pgEnum('role', ['ADMIN', 'TEACHER', 'STUDENT']);
export const courseTypeEnum = pgEnum('course_type', ['ACADEMIC', 'GENERAL']);
export const attachmentTypeEnum = pgEnum('attachment_type', [
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO', // Reserved for future phase
]);
export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

// ==========================================
// 2. TAXONOMY TABLES (Grades & Categories)
// ==========================================
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "Grade 10", "Grade 11"
  displayOrder: integer('display_order').notNull().default(0),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "English Speaking", "Grammar"
});

// ==========================================
// 3. BETTER AUTH + USER TABLES (Sessions)
// ==========================================
export const users = pgTable('user', {
  id: text('id').primaryKey(), // Generated by Better Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneNumber: text('phone_number').unique(), // For phone login / WhatsApp matching
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('STUDENT'),
  isActive: boolean('is_active').notNull().default(true),
  specialization: text('specialization'), // Optional for Teachers
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// 4. COURSES, MODULES & LESSONS
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  courseType: courseTypeEnum('course_type').notNull().default('ACADEMIC'),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gradeId: uuid('grade_id').references(() => grades.id, { onDelete: 'set null' }),
  semester: text('semester'), // e.g., "Semester 1", "Semester 2"
  categoryId: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // Teacher notes / instructions
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. GROUPS (COHORTS) & ENROLLMENTS
// ==========================================
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Sun/Tue 4PM Batch"
  joinCode: text('join_code').notNull().unique(), // e.g., "OM4829"
  unlockAllByDefault: boolean('unlock_all_by_default').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupStudents = pgTable(
  'group_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupStudent: uniqueIndex('unique_group_student_idx').on(
      table.groupId,
      table.studentId,
    ),
  }),
);

export const groupLessonAccess = pgTable(
  'group_lesson_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    isUnlocked: boolean('is_unlocked').notNull().default(true),
  },
  (table) => ({
    uniqueGroupLesson: uniqueIndex('unique_group_lesson_idx').on(
      table.groupId,
      table.lessonId,
    ),
  }),
);

// ==========================================
// 6. CLOUDFLARE R2 LESSON ATTACHMENTS
// ==========================================
export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }), // Null = Master Course File; Populated = Specific to one Group only
  title: text('title').notNull(),
  r2ObjectKey: text('r2_object_key').notNull(), // e.g., "courses/{courseId}/lessons/{lessonId}/worksheet.pdf"
  publicOrSignedUrl: text('public_or_signed_url').notNull(),
  fileType: attachmentTypeEnum('file_type').notNull().default('PDF'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 7. QUIZZES, ATTEMPTS & COMPLETION
// ==========================================
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull().default('MCQ'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(), // e.g. ["Option A", "Option B"] for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  answersJson: jsonb('answers_json').notNull(), // Stores student responses
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueLessonCompletion: uniqueIndex('unique_lesson_completion_idx').on(
      table.lessonId,
      table.studentId,
    ),
  }),
);

// ==========================================
// 8. CUSTOM GROUP GRADEBOOK (MANUAL MARKINGS)
// ==========================================
export const manualGradeColumns = pgTable('manual_grade_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Speaking Test 1", "Homework 3"
  maxScore: integer('max_score').notNull().default(10),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const manualGradeValues = pgTable(
  'manual_grade_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    columnId: uuid('column_id')
      .notNull()
      .references(() => manualGradeColumns.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    teacherNote: text('teacher_note'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCellGrade: uniqueIndex('unique_manual_grade_cell_idx').on(
      table.columnId,
      table.studentId,
    ),
  }),
);
```

---

## 5. Backend Architecture (NestJS + Better Auth + Cloudflare R2)

### 5.1. Better Auth Configuration (`src/auth/auth.ts`)
Configure Better Auth with the Drizzle adapter, custom user attributes (`role`, `phoneNumber`, `gradeId`, `isActive`), and cookie-based sessions:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT' },
      phoneNumber: { type: 'string', required: false },
      gradeId: { type: 'string', required: false },
      specialization: { type: 'string', required: false },
      isActive: { type: 'boolean', defaultValue: true },
    },
  },
});
```

### 5.2. Cloudflare R2 Storage Service (`src/storage/r2.service.ts`)
To keep the NestJS server fast and lightweight, file uploads use **Cloudflare R2 Presigned URLs**:
1. **Upload Flow:**
   * Teacher selects a file (e.g., `Unit1_Worksheet.pdf`) in the React app.
   * Frontend calls `POST /api/storage/presigned-upload` with `{ fileName, mimeType, fileSize, courseId, lessonId }`.
   * NestJS generates an R2 Object Key (`courses/${courseId}/lessons/${lessonId}/${uuid}-${fileName}`) and returns a `presignedPutUrl` using `@aws-sdk/s3-request-presigner`.
   * Frontend uploads the binary directly to Cloudflare R2 via `PUT`.
   * Frontend calls `POST /api/lessons/:lessonId/attachments` to save the metadata in PostgreSQL via Drizzle.
2. **Download Flow:**
   * Either serve via a custom Cloudflare R2 Public Bucket domain or generate a presigned `GetObjectCommand` URL valid for 1 hour when a student views a lesson.

### 5.3. Core NestJS API Endpoints

#### Auth & Onboarding
* `ALL /api/auth/*` — Handled directly by Better Auth handler mounted in NestJS controller.
* `POST /api/onboarding/teacher` — Registers a teacher account with `role: 'TEACHER'`.
* `POST /api/onboarding/join/:joinCode` — Validates group code and adds current authenticated student to `group_students`.

#### Student Endpoints (`@Roles('STUDENT')`)
* `GET /api/student/groups` — Returns all groups the student is enrolled in, with course metadata and completion percentage.
* `POST /api/student/groups/join` — Enrolls student into a group using `{ joinCode }`.
* `GET /api/student/groups/:groupId/curriculum` — Returns course modules and lessons filtered by `group_lesson_access` (hides locked lessons) and includes group-specific attachments.
* `POST /api/student/lessons/:lessonId/complete` — Marks lesson complete.
* `POST /api/student/quizzes/:quizId/submit` — Auto-grades MCQ/True-False/Short Answer questions and records `quiz_attempts`.
* `GET /api/student/groups/:groupId/grades` — Returns student's quiz scores and manual teacher markings for that group.

#### Teacher Endpoints (`@Roles('TEACHER', 'ADMIN')`)
* `GET /api/teacher/courses` & `POST /api/teacher/courses` — List and create courses (`ACADEMIC` or `GENERAL`).
* `POST /api/teacher/courses/:courseId/modules` — Add/reorder modules.
* `POST /api/teacher/modules/:moduleId/lessons` — Create/edit lessons.
* `POST /api/storage/presigned-upload` — Get Cloudflare R2 upload URL.
* `POST /api/teacher/lessons/:lessonId/attachments` — Attach uploaded R2 file to a lesson (or specific group).
* `POST /api/teacher/lessons/:lessonId/quiz` — Upsert inline quiz and questions.
* `POST /api/teacher/courses/:courseId/groups` — Create a new Group (`joinCode` auto-generated, e.g., `OM-4829`).
* `PATCH /api/teacher/groups/:groupId/lessons/:lessonId/access` — Toggle `isUnlocked` for a specific group.
* `GET /api/teacher/groups/:groupId/gradebook` — Returns full matrix of enrolled students, their quiz scores, and all `manual_grade_columns` + `manual_grade_values`.
* `POST /api/teacher/groups/:groupId/gradebook/columns` — Add a custom marking column.
* `PUT /api/teacher/groups/:groupId/gradebook/cell` — Upsert a student's score in a custom column (called on input blur).
* `POST /api/teacher/groups/:groupId/roster/bulk` — Bulk create/enroll students by phone/name list.

#### Admin Endpoints (`@Roles('ADMIN')`)
* `GET /api/admin/overview` — Global counts (teachers, students, courses, groups).
* `GET /api/admin/teachers` — Paginated/filtered list of all teachers (`?status=ACTIVE&search=...`).
* `PATCH /api/admin/users/:userId/status` — Activate/suspend any user and revoke active sessions in `sessions` table.
* `GET /api/admin/students` — Filter students by `gradeId`, `courseId`, `groupId`, `teacherId`, or search string.
* `GET /api/admin/courses` & `GET /api/admin/groups` — Global explorer with filters for `courseType`, `gradeId`, `categoryId`, `teacherId`.
* `CRUD /api/admin/taxonomy/grades` & `CRUD /api/admin/taxonomy/categories` — Manage grades and general skill categories.

---

## 6. Frontend Route & Component Structure (React)

* `/login` — Unified login (Phone/Email + Password via Better Auth client).
* `/register/teacher` — Teacher self-registration page.
* `/register/student` — Student self-registration page.
* `/join/:joinCode` — WhatsApp Magic Invite landing page (auto-enrolls logged-in students or shows 1-step registration).
* `/student`
  * `/student/dashboard` — Enrolled Groups cards + "Enter 6-Digit Group Code" button.
  * `/student/groups/:groupId` — Linear curriculum view, R2 file download cards, inline Quiz component, and "My Marks" tab.
* `/teacher`
  * `/teacher/dashboard` — List of Teacher's Courses & Quick Group links.
  * `/teacher/courses/:courseId/curriculum` — 2-level Module/Lesson builder + R2 Dropzone uploader + Quiz builder.
  * `/teacher/groups/:groupId` — **Group Command Center** with 3 tabs:
    1. *Pacing & Group Files* (Unlock switches + group R2 upload)
    2. *Gradebook Matrix* (Auto-graded quizzes + inline editable custom grade columns)
    3. *Roster & WhatsApp Invite* (Copy link/code + bulk add students)
* `/admin`
  * `/admin/dashboard` — Global metrics & activity overview.
  * `/admin/teachers` — Filterable teacher directory & status toggles.
  * `/admin/students` — Deep-filter student directory (by Grade, Group, Course, Teacher).
  * `/admin/courses-groups` — Master explorer for all courses and cohorts.
  * `/admin/taxonomy` — Grades & General Categories manager.

---

## 7. Environment Variables (`.env.example`)

```env
# PostgreSQL (Drizzle ORM)
DATABASE_URL="postgresql://postgres:password@localhost:5432/oman_lms"

# Better Auth
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="lms-attachments"
R2_PUBLIC_URL="https://files.yourdomain.com"

# Frontend URL (for CORS & Magic Join Links)
FRONTEND_URL="http://localhost:5173"
``` `/admin/teachers` — Filterable teacher directory & status toggles.
  * `/admin/students` — Deep-filter student directory (by Grade, Group, Course, Teacher).
  * `/admin/courses-groups` — Master explorer for all courses and cohorts.
  * `/admin/taxonomy` — Grades & General Categories manager.

---

## 7. Environment Variables (`.env.example`)

```env
# PostgreSQL (Drizzle ORM)
DATABASE_URL="postgresql://postgres:password@localhost:5432/oman_lms"

# Better Auth
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="lms-attachments"
R2_PUBLIC_URL="https://files.yourdomain.com"

# Frontend URL (for CORS & Magic Join Links)
FRONTEND_URL="http://localhost:5173"
```
