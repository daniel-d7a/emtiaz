# 02: Authorization, RBAC & Multi-Tenant Isolation

**Type:** audit  
**Status:** resolved  
**Blocked by:** None  
**Auditor:** Senior Application Security Auditor  
**Date:** 2026-11-08  
**Target:** NestJS Backend Controller Routes, Service Queries, Guards, Storage Perimeter

---

## 1. Executive Summary

A comprehensive application security audit of role-based access control (RBAC), ownership verification, multi-tenant isolation, and resource perimeter controls was conducted across the Emtiaz LMS backend according to `docs/security.md` and the `emtiaz-authz` skill rules.

### Key Conclusions:
- **Core Tenant Isolation (Strong)**: Teacher curriculum ownership (`assertCourseAccess`, `assertOwnsGroup`), student group enrollment boundaries (`group_students`), and parent child linkages (`assertLinked`) are rigorously enforced across primary domain controllers (`TeacherController`, `StudentController`, `ParentController`, `AdminController`).
- **Administrative Moderation (Strong)**: Every admin endpoint is protected by `@Roles('ADMIN')` and gated with `@RequirePermission(...)` via `AdminPermissionGuard`. Admins cannot directly tamper with teacher course curriculum content.
- **Suspension & Soft-Deletion (Strong)**: Global `AuthGuard` queries the database with `disableCookieCache: true` on every request, immediately rejecting suspended users (`is_active = false`) with `403 Forbidden`. Soft-delete (`deleted_at IS NULL`) is consistently enforced across read/write operations.
- **CRITICAL Vulnerability Identified (IDOR / BOLA in Storage Controller)**:
  - `GET /api/storage/homework/:id/file` fails to authenticate user context or verify enrollment/course ownership, allowing any authenticated user across the LMS to access arbitrary homework attachments by UUID.
  - `GET /api/storage/homework-submissions/:id/file` completely omits access checks, allowing any authenticated user across any role to download another student's uploaded homework submission file by UUID.

---

## 2. Guard Pipeline & Authorization Architecture

The backend implements a multi-tiered defense-in-depth gate structure:

1. **`AuthGuard` (`backend/src/auth/auth.guard.ts`)**:
   - Executes globally for all non-`@Public()` routes.
   - Evaluates session directly against PostgreSQL via Better Auth with `disableCookieCache: true`.
   - Rejects deactivated or suspended accounts (`user.isActive === false`) with `403 Forbidden ('Account suspended')`.
2. **`RolesGuard` (`backend/src/auth/roles.guard.ts`)**:
   - Evaluates `@Roles('ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT')`.
   - Rejects unauthorized roles with `403 Forbidden`.
3. **`AdminPermissionGuard` (`backend/src/modules/admin/admin-permission.guard.ts`)**:
   - Evaluates `@RequirePermission(...)` on administrative actions against `admin_roles.permissions`.
   - Admins without an assigned role maintain super-admin access.
4. **`TeacherEntitlementsGuard` (`backend/src/auth/teacher-entitlements.guard.ts`)**:
   - Enforces workspace upgrade gating when an expired teacher exceeds Free plan quotas.

---

## 3. Findings & Vulnerability Analysis

### Finding 02-SEC-01 (CRITICAL): Broken Object Level Authorization (BOLA / IDOR) on Homework & Submission Files

- **Vulnerable File**: `backend/src/modules/storage/storage.controller.ts` (lines 214–238)
- **Vulnerable Endpoints**:
  - `GET /api/storage/homework/:id/file`
  - `GET /api/storage/homework-submissions/:id/file`
- **Vulnerability Description**:
  Unlike lesson attachments (which call `readableAttachment` enforcing teacher ownership or student enrollment and lesson unlock status), the endpoints serving homework files and student submission files perform **zero ownership or tenant isolation checks**:
  ```typescript
  @Roles('STUDENT', 'TEACHER', 'ADMIN', 'PARENT')
  @Get('api/storage/homework/:id/file')
  async homeworkFile(@Param('id') id: string, @Query('download') download: string | undefined, @Res() res: Response) {
    const [row] = await db.select().from(homework).where(eq(homework.id, id));
    if (!row) throw new NotFoundException('Homework not found');
    if (!row.r2ObjectKey) throw new NotFoundException('Homework has no file');
    res.redirect(302, await this.storage.presignedGet(row.r2ObjectKey, download ? row.title : undefined));
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN', 'PARENT')
  @Get('api/storage/homework-submissions/:id/file')
  async submissionFile(@Param('id') id: string, @Query('download') download: string | undefined, @Res() res: Response) {
    const [row] = await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.id, id));
    if (!row) throw new NotFoundException('Submission not found');
    if (!row.r2ObjectKey) throw new NotFoundException('Submission has no file');
    res.redirect(302, await this.storage.presignedGet(row.r2ObjectKey, download ? 'submission' : undefined));
  }
  ```
- **Impact**:
  1. An enrolled student or outside user with an authenticated session can download homework submission files belonging to any other student in the platform, exposing homework solutions, student personal files, and private evaluations.
  2. Any authenticated student or teacher can access homework assignment files for courses they do not own or are not enrolled in.
- **Remediation**:
  1. In `homeworkFile`: Inject `@Req() req: Request` and verify:
     - `TEACHER`: must own the course (`course.teacherId === user.id`).
     - `STUDENT`: must be enrolled in the course/group (`groupStudents`) and the lesson must be unlocked.
     - `PARENT`: must have an active link to an enrolled student in that group.
     - `ADMIN`: permitted.
  2. In `submissionFile`: Inject `@Req() req: Request` and verify:
     - `STUDENT`: `row.studentId === user.id`.
     - `TEACHER`: must own the group/course for that submission.
     - `PARENT`: must be actively linked to `row.studentId`.
     - `ADMIN`: permitted.

---

### Finding 02-SEC-02 (INFORMATIONAL / ARCHITECTURAL): Shared Taxonomy Read Access

- **File**: `backend/src/modules/admin/admin.controller.ts` (lines 562, 604, 635)
- **Endpoints**:
  - `GET /api/admin/taxonomy/grades`
  - `GET /api/admin/taxonomy/semesters`
  - `GET /api/admin/taxonomy/categories`
- **Analysis**:
  These routes have `@Roles('ADMIN', 'TEACHER', 'STUDENT')` and intentionally lack `@RequirePermission('taxonomy')`. This allows teachers and students to populate dropdown filters (grades, semesters, categories).
- **Status**: By design and read-only. All modifying routes (`POST`, `PUT`, `PATCH`, `DELETE`) strictly enforce `@Roles('ADMIN')` and `@RequirePermission('taxonomy')`.

---

## 4. Verification Checklist & Invariant Audit

### 1. Teacher Isolation (`TeacherController` & `TeacherService`)
- [x] **Controller Guarding**: All 54 endpoints in `TeacherController` enforce `@Roles('TEACHER')`.
- [x] **Course Ownership**: Every course mutation, module mutation, and lesson mutation invokes `assertCourseAccess(user, courseId)`. Teachers cannot read or alter courses owned by another teacher.
- [x] **Group Isolation**: Every group mutation, pacing query, roster query, entry code generation, and statistics query calls `assertOwnsGroup(user, groupId)`, confirming `courses.teacherId === user.id` and `courses.deletedAt IS NULL`.
- [x] **Quiz Ownership**:
  - `updateQuiz`, `deleteQuiz`, and `moveQuiz` resolve the parent course via `quizCourseId` and call `assertCourseAccess`.
  - Image assets in quiz questions are checked via `validateQuizQuestions` to enforce the course prefix (`courses/<courseId>/quiz/`).
  - `gradeQuizAttempt` verifies the attempt belongs to the teacher's course before recording scores or grading written answers.
- [x] **Homework Ownership**:
  - `createHomework` enforces `assertOwnsLesson`.
  - `updateHomework` and `deleteHomework` enforce `assertOwnsHomework`.
  - `setGroupHomeworkAccess`, `getHomeworkSubmissions`, and `gradeHomeworkSubmission` enforce `assertOwnsGroup` and ensure the homework belongs to the group's course.
- [x] **Gradebook & Attendance**:
  - Attendance marking (`setAttendance`) verifies `assertOwnsGroup`, validates lesson course association (`assertLessonInCourse`), and verifies all marked students are enrolled in that group roster.
  - Manual gradebook column and cell operations (`addGradeColumn`, `deleteGradeColumn`, `setGradeCell`) verify `assertOwnsGroup` and check that the target student is actively enrolled.
- [x] **Roster Mutations**:
  - `bulkAdd` checks group ownership, inactive group status, and entitlement limits (`assertCanAddStudents`).
  - `moveStudent` enforces ownership of both source and target groups (`assertOwnsGroup`), checks target group activity, and verifies that both groups belong to the same course.
  - `removeStudent` enforces group ownership.
- [x] **Student Search Boundary**:
  - `searchStudents` strictly limits results to `users.role = 'STUDENT'`, `users.isActive = true`, `users.deletedAt IS NULL`, returning only `id`, `name`, and `phoneNumber`.

---

### 2. Student Access Boundaries (`StudentController` & `StudentService`)
- [x] **Controller Guarding**: All endpoints enforce `@Roles('STUDENT')`.
- [x] **Group Enrollment Boundary**:
  - `curriculum`, `myGrades`, `gradebook`, `lessonHomework`, and `groupQuiz` invoke `assertEnrolled(studentId, groupId)`.
  - Students cannot query curriculum or gradebook data for groups they have not joined.
- [x] **Dynamic Lesson Unlock Enforcement**:
  - `lessonUnlocked` checks per-group overrides in `group_lesson_access`, falling back to `group.unlock_all_by_default`.
  - Hidden lessons (`isHidden = true`) are strictly stripped from curriculum, lesson details, homework lists, and progress counters.
  - `markComplete` verifies enrollment and checks `await this.lessonUnlocked(...)`. Locked lessons reject completion with `403 Forbidden ('Lesson is locked for your group')`.
  - Progress percentages divide completed unlocked lessons by total currently unlocked visible lessons, ensuring progress never exceeds 100%.
- [x] **Quiz Access & Submissions**:
  - `getQuiz` resolves quiz course association (`assertQuizAccess`), verifies enrollment, and ensures that lesson quizzes are unlocked.
  - Quizzes marked hidden (`group_quiz_access.is_hidden = true`) return `403 Forbidden`.
  - `submitQuiz` verifies group enrollment, checks `group.isActive`, verifies `assertQuizInGroupCourse`, verifies quiz visibility and lesson unlock status, and rejects empty answers.
  - Written questions are flagged `pending = true` and cannot be scored by students.
- [x] **Homework Access & Submissions**:
  - `submitHomework` verifies enrollment, active group status, group scoping (`hw.groupId`), lesson unlock status, and visibility.
  - Enforces the 10MB payload size limit on student file submissions.
  - Resubmission is permitted only when status is `SUBMITTED` or `REVISION_REQUESTED`; `GRADED` homework cannot be overwritten.
- [x] **Inactive Group Write Freeze**:
  - Inactive groups (`groups.is_active = false`) permit read access to already enrolled students, but reject all student write operations (`submitQuiz`, `markComplete`, `unmarkComplete`, `submitHomework`) with `400 BadRequestException('Group is inactive')`.
- [x] **Join Codes & Entry Codes**:
  - `joinGroupByCode` verifies `groups.joinCode`, validates active teacher status, checks group active status, and enforces teacher subscription student capacity.
  - For entry-code-protected groups, entry code verification uses an atomic check-and-increment transaction against `max_uses`. Re-joining does not consume an additional use.

---

### 3. Parent Read-Only Perimeter (`ParentController` & `ParentService`)
- [x] **Controller Guarding**: All endpoints enforce `@Roles('PARENT')`.
- [x] **Student Link Verification**:
  - Student linking requires knowledge of the student's random 8-character `monitoringCode`. Knowledge of a student's phone number or name does not grant access.
  - Child data endpoints (`grades`, `getChildHomework`, `myStudents`) invoke `assertLinked(parentId, studentId)` checking `parent_students` with `deleted_at IS NULL`.
  - Unlinked requests fail immediately with `403 Forbidden ('Not linked to this student')`.
- [x] **Zero-Write Perimeter**:
  - Parents have ZERO write access to curriculum, student answers, quiz submissions, homework submissions, attendance, or group configurations.
  - The controller exposes only read-only dashboards (`students`, `grades`, `homework`) and link/unlink actions.

---

### 4. Admin Permissions & Moderation (`AdminController` & `AdminService`)
- [x] **Administrative Role & Permission Guarding**:
  - All administrative routes enforce `@Roles('ADMIN')`.
  - Specific granular permissions (`@RequirePermission(...)`) are enforced on every route:
    - Overview: `overview`
    - Teachers: `teachers`
    - Students: `students`
    - Parents: `parents`
    - Courses: `courses`
    - Roles: `roles`
    - Audit: `audit`
    - Taxonomy mutations: `taxonomy`
    - Plans & Billing: `plans`
    - Notifications: `notifications`, `settings`
- [x] **Curriculum Tampering Prohibition**:
  - Admins can manage course metadata (`AdminUpdateCourseDto`: title, teacherId, courseType, gradeId, semester, categoryId) and execute moderation soft-delete/restore.
  - There are NO admin endpoints for editing modules, lessons, quizzes, questions, or homework content. Course curriculum content remains strictly under teacher ownership.

---

### 5. Soft-Delete & Account Suspension Enforcement
- [x] **Suspension Enforcement**:
  - `AuthGuard` queries the database fresh on every guarded request (`disableCookieCache: true`).
  - If `session.user.isActive === false`, request is rejected with `403 Forbidden ('Account suspended')`.
  - Deleting a user soft-deletes the row (`deleted_at = now()`), sets `is_active = false`, and immediately deletes all records in `session`.
- [x] **Soft-Delete Query Filtering**:
  - Teacher course queries filter `isNull(courses.deletedAt)`.
  - Group queries filter `isNull(groups.deletedAt)`.
  - Student group views join only active, non-deleted teachers and courses (`isNull(courses.deletedAt)`, `isNull(groups.deletedAt)`, `isNull(users.deletedAt)`, `users.isActive = true`).
  - Soft-deleted or suspended teachers have their courses and groups hidden from student home views, catalogues, and join code resolution.
  - Parent links filter `isNull(parentStudents.deletedAt)`. Restoring a parent link restores child visibility.
  - Soft-deleted entities can only be restored via audited admin endpoints (`restoreUser`, `restoreCourse`, `restoreGroup`, `restoreParentLink`).

---

## 5. Verification Test Suite Results

All unit and integration tests across backend modules passed cleanly:
```bash
Test Suites: 18 passed, 18 total
Tests:       234 passed, 234 total
Snapshots:   0 total
Time:        56.031 s
```
TypeScript typechecks succeeded with 0 errors across `backend/`, `frontend/`, and `mobile/`.

---

## 6. Recommendations & Action Items

1. **Immediate Remediation (Finding 02-SEC-01)**:
   Update `backend/src/modules/storage/storage.controller.ts`:
   - Enforce authorization in `homeworkFile` checking course ownership for teachers, enrollment + lesson unlock for students, active link for parents, or admin role.
   - Enforce authorization in `submissionFile` allowing only the student author, course-owning teacher, linked parent, or admin.
2. **Automated Integration Tests**:
   Add integration tests in `storage.service.spec.ts` or a new `storage-authz.spec.ts` asserting that unlinked parents and cross-group students receive `403 Forbidden` when attempting to access `/api/storage/homework/:id/file` and `/api/storage/homework-submissions/:id/file`.
