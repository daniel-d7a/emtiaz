# 04: Cloudflare R2 Object Storage, Upload Paths & Quotas

**Type:** audit  
**Status:** resolved  
**Blocked by:** None  

---

## Executive Summary

A comprehensive source code security audit of Cloudflare R2 object storage integration, presigned URL generation, file upload authorization, storage quota enforcement, and file download protections was conducted across `backend/src/modules/storage/`, `teacher/`, `student/`, and `onboarding/`.

### Key Findings Summary:
1. **Upload Namespacing & Sanitization**: Presigned upload generation for lesson attachments strictly isolates files to `courses/<courseId>/lessons/<lessonId>/<uuid>-<safeName>`. Filenames are stripped of path separators (`/`, `\`) via `replace(/[^\w.\-]/g, '_')` and prepended with a cryptographically generated UUID, mitigating path traversal attacks (`../../` becomes `.._.._` within a flat key segment).
2. **Quota & File Size Caps**: Storage quota enforcement via `TeacherEntitlementsService.assertCanUploadStorage` is active on lesson attachments and homework reference files. Student homework submissions are capped at 10 MB (`student.service.ts:677`) and correctly excluded from the teacher storage quota calculation. Profile avatars and banners are strictly capped at 2 MB and restricted to image MIME types.
3. **Critical Download Authorization Gaps (BOLA/IDOR)**:
   - **Critical Vulnerability**: `/api/storage/homework-submissions/:id/file` requires authentication but performs **zero authorization checks**. Any authenticated user (student, teacher, parent) can download any other student's submitted homework files across the entire platform.
   - **High Vulnerability**: `/api/storage/homework/:id/file` requires authentication but performs **zero course ownership or enrollment checks**. Any authenticated user can download any homework reference file platform-wide.
   - **Medium Vulnerability**: In `teacher.service.ts` (`createHomework` / `updateHomework`) and `student.service.ts` (`submitHomework`), incoming `r2ObjectKey` inputs lack prefix validation. When homework or submissions are updated/deleted, the backend invokes `storage.deleteObject(...)` on caller-supplied keys, creating an arbitrary object deletion vector.

---

## Detailed Audit Findings

### 1. Upload Path Prefix Integrity & Key Traversal

#### 1.1 Presigned Upload Confinement
- **Source**: `backend/src/modules/storage/storage.controller.ts` (lines 32–49)
- **Implementation**:
  ```typescript
  @Roles('TEACHER')
  @Post('api/storage/presigned-upload')
  async presignedUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(PresignedUploadDto)) dto: z.infer<typeof PresignedUploadDto>,
  ) {
    const course = await this.teacherCourse(req.user!, dto.lessonId);
    if (course.id !== dto.courseId) {
      throw new ForbiddenException('Lesson/course mismatch');
    }
    if (dto.fileSizeBytes && dto.fileSizeBytes > 0) {
      await this.entitlementsService.assertCanUploadStorage(req.user!.id, dto.fileSizeBytes);
    }
    const objectKey = StorageService.buildObjectKey(dto.courseId, dto.lessonId, dto.fileName);
    const uploadUrl = await this.storage.presignedPut(objectKey);
    return { objectKey, uploadUrl };
  }
  ```
- **Verification**:
  - `courseForLesson(dto.lessonId)` joins `lessons -> modules -> courses` and verifies that the lesson belongs to an active, non-deleted course (`courses.deletedAt IS NULL`).
  - Verifies that the caller owns the course (`course.teacherId === req.user!.id` or `ADMIN`).
  - Strict course/lesson matching: `course.id === dto.courseId` prevents supplying mismatched IDs.
  - S3 object key is built via `StorageService.buildObjectKey`:
    ```typescript
    static buildObjectKey(courseId: string, lessonId: string, fileName: string) {
      const safeName = fileName.replace(/[^\w.\-]/g, '_');
      return `courses/${courseId}/lessons/${lessonId}/${randomUUID()}-${safeName}`;
    }
    ```
  - `courseId` and `lessonId` are validated as strict RFC4122 UUIDs via `PresignedUploadDto` (`schemas.ts:468–469`), making it impossible to inject path separators into ID path segments.

#### 1.2 Path Traversal & Sanitization Analysis
- **Filename Sanitization**: In `StorageService.buildObjectKey` (`storage.service.ts:50–53`):
  `safeName = fileName.replace(/[^\w.\-]/g, '_')`
  - Replaces all characters except alphanumeric (`[a-zA-Z0-9_]`), periods (`.`), and hyphens (`-`) with an underscore (`_`).
  - Path delimiters `/` and `\` are sanitized to `_`.
  - Directory traversal sequences like `../../` become `.._.._`.
  - Prepended `randomUUID()` guarantees the object key segment starts with an alphanumeric UUID, preventing any S3/POSIX directory escape.
  - Verified by unit test in `storage.service.spec.ts:4–7`:
    `expect(key).toMatch(/^courses\/course-1\/lessons\/lesson-2\/[0-9a-f-]{36}-\.\._\.\._My_File__final_\.pdf$/)`

#### 1.3 Attachment Association Verification
- **Source**: `backend/src/modules/storage/storage.controller.ts` (lines 133–148)
- **Check**:
  ```typescript
  if (dto.objectKey) {
    const prefix = `courses/${course.id}/lessons/${dto.lessonId}/`;
    if (!dto.objectKey.startsWith(prefix)) {
      throw new ForbiddenException('Object does not belong to this lesson');
    }
  }
  ```
- **Verification**: When a teacher calls `POST /api/storage/attachments`, the endpoint strictly asserts that `dto.objectKey.startsWith('courses/${course.id}/lessons/${dto.lessonId}/')`. If a teacher attempts to attach a file from another course or another teacher's folder, a `403 Forbidden` exception is raised (verified in `teacher.spec.ts:1419–1426` and `1516–1520`).

#### 1.4 Avatars, Banners, Course Images, and Quiz Images
- **Avatar Upload**: `POST /api/storage/avatar` (`storage.controller.ts:97–105`) calls `buildAvatarKey(req.user!.id, dto.fileName)` -> `avatars/${user.id}/${randomUUID()}-${safeName}`. In `onboarding.service.ts:472`, `PATCH /api/me` validates `image.startsWith('avatars/${userId}/')`.
- **Banner Upload**: `POST /api/storage/banner` (`storage.controller.ts:86–94`) calls `buildBannerKey(req.user!.id, dto.fileName)` -> `banners/${user.id}/${randomUUID()}-${safeName}`. In `onboarding.service.ts:502`, `PATCH /api/me` validates `banner.startsWith('banners/${userId}/')`.
- **Course Cover**: `POST /api/storage/course-image` (`storage.controller.ts:52–66`) asserts course ownership and builds `courses/${courseId}/cover/${randomUUID()}-${safeName}`. In `teacher.service.ts:420`, `patch.image.startsWith('courses/${courseId}/cover/')` is validated.
- **Quiz Image**: `POST /api/storage/quiz-image` (`storage.controller.ts:69–83`) asserts course ownership and builds `courses/${courseId}/quiz/${randomUUID()}-${safeName}`. In `teacher.service.ts:735`, `validateQuizQuestions` asserts `q.imageKey.startsWith('courses/${courseId}/quiz/')`.
- **Cleanup / Delete Uploaded**: `DELETE /api/storage/uploaded` (`storage.controller.ts:108–130`) permits deleting objects only under `avatars/${user.id}/`, `banners/${user.id}/`, or `courses/<courseId>/` where the caller owns the course.

---

### 2. Quota Enforcement & File Size Caps

#### 2.1 Teacher Storage Quota Enforcement
- **Implementation**:
  - `TeacherEntitlementsService.assertCanUploadStorage` (`teacher-entitlements.service.ts:588–604`) checks `currentUsage + fileSizeBytes <= maxStorageBytes`. Exceeding limits throws `402 Payment Required` (`PLAN_LIMIT_REACHED`).
  - Verified invocations:
    1. `storage.controller.ts:44` — Pre-flight before issuing presigned upload URL for lesson attachments.
    2. `storage.controller.ts:141` — Re-checked on `POST /api/storage/attachments`.
    3. `teacher.service.ts:1208` — Checked on `POST /api/teacher/lessons/:lessonId/homework` (teacher reference file).
    4. `teacher.service.ts:1319` — Checked on `PATCH /api/teacher/homework/:id` when replacing reference files with larger sizes (`diff > 0`).
  - Tested in `teacher-limits.spec.ts:143–168` (verified 402 rejection when upload pushes teacher past plan quota).

#### 2.2 Storage Calculation & Student Homework Exemption
- **Storage Calculation Query**: `teacher-entitlements.service.ts:134–159`:
  ```sql
  SELECT (
    coalesce((
      SELECT sum(la.file_size_bytes)
      FROM lesson_attachments la
      JOIN lessons l ON l.id = la.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.teacher_id = ${teacherId} AND c.deleted_at IS NULL
    ), 0)
    +
    coalesce((
      SELECT sum(h.file_size_bytes)
      FROM homework h
      JOIN lessons l ON l.id = h.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE c.teacher_id = ${teacherId} AND c.deleted_at IS NULL
    ), 0)
  )::bigint AS used_bytes
  ```
- **Guarantees**:
  - Only teacher-uploaded lesson attachments and teacher-created homework reference files count towards `used_bytes`.
  - Student homework submissions (`homework_submissions`) are **never included**, guaranteeing student submissions never deplete a teacher's plan quota.
  - Soft-deleted courses (`c.deleted_at IS NULL`) are excluded from quota counts.

#### 2.3 Student Submission Cap & Onboarding File Limits
- **Student Homework Size Cap**: `backend/src/modules/student/student.service.ts:676–680`:
  ```typescript
  if (dto.fileSizeBytes !== undefined && dto.fileSizeBytes !== null) {
    if (dto.fileSizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds maximum allowed limit of 10MB');
    }
  }
  ```
  Verified: submissions $> 10$ MB are rejected with 400 (`student.spec.ts:566–574`).
- **Profile File Size Caps**:
  - Avatar: Max 2 MB (`2 * 1024 * 1024`), MIME regex `^image\/` (`schemas.ts:453–457`).
  - Banner: Max 2 MB, MIME regex `^image\/` (`schemas.ts:458`).
  - Course covers & quiz images: Max 5 MB, MIME regex `^image\/` (`schemas.ts:459–465`).
  - Lesson attachments: Max 100 MB (`schemas.ts:472`).
  - Non-image files submitted to avatar/banner endpoints are rejected with 400 (`onboarding.spec.ts:171–174`).

---

### 3. Download Authorization & Streaming Protection

#### 3.1 Lesson Attachments Download & File Endpoints
- **Source**: `storage.controller.ts:190–212` (`/api/storage/attachments/:id/download` and `/api/storage/attachments/:id/file`)
- **Guarantees**:
  - **Authentication**: Enforced via global `AuthGuard` and `@Roles('STUDENT', 'TEACHER', 'ADMIN')`.
  - **Teacher Check**: `readableAttachment` (`storage.controller.ts:248–250`) verifies `course.teacherId === user.id`. Non-owning teachers receive `403 Forbidden`.
  - **Student Check**: `assertStudentCanRead` (`storage.controller.ts:278–324`):
    - Confirms student has active, non-deleted enrollment in a group belonging to the course (`group_students`, `groups.deletedAt IS NULL`, `courses.deletedAt IS NULL`).
    - If attachment is group-scoped (`groupId`), verifies student is in that specific group.
    - Confirms lesson is not hidden for student's group (`groupLessonAccess.isHidden`).
    - Confirms lesson is unlocked in the group (`groupLessonAccess.isUnlocked` or `group.unlockAllByDefault`).
  - **Parents**: Parent role is explicitly excluded (`docs/security.md` authorization matrix).
  - **Presigned GET Expiration**: 3600 seconds (1 hour) per `storage.service.ts:115` (`getSignedUrl(..., { expiresIn: 3600 })`), matching specification in `docs/security.md:153`.

#### 3.2 Public and Profile Avatars/Banners
- **Public Teacher Media**: `GET /api/public/teachers/:slug/avatar` and `banner` (`public.controller.ts:167–188`):
  - Uses `publishedTeacher` query (`public.controller.ts:26–50`) ensuring `landingPublished = true`, `role = 'TEACHER'`, `isActive = true`, and `deletedAt IS NULL`. No bucket keys or directory listings are exposed.
- **Self Media**: `GET /api/me/avatar` (`onboarding.controller.ts:97–103`) redirects to signed URL for `req.user.id` only.

---

## Identified Security Risks & Vulnerabilities

### [VULN-04-01] Critical: Missing Authorization on Student Homework Submissions (BOLA / IDOR)
- **File / Lines**: `backend/src/modules/storage/storage.controller.ts:227–238`
- **Code**:
  ```typescript
  @Roles('STUDENT', 'TEACHER', 'ADMIN', 'PARENT')
  @Get('api/storage/homework-submissions/:id/file')
  async submissionFile(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const [row] = await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.id, id));
    if (!row) throw new NotFoundException('Submission not found');
    if (!row.r2ObjectKey) throw new NotFoundException('Submission has no file');
    res.redirect(302, await this.storage.presignedGet(row.r2ObjectKey, download ? 'submission' : undefined));
  }
  ```
- **Vulnerability Description**:
  The endpoint requires authentication and allows all four roles (`STUDENT`, `TEACHER`, `ADMIN`, `PARENT`), but performs **no authorization checks** on `row`:
  1. A student can download any other student's submission files by providing the submission UUID.
  2. A parent can download submission files belonging to unrelated students outside their family.
  3. A teacher can download submission files belonging to courses taught by other teachers.
- **Impact**: Severe breach of student confidentiality and academic integrity (direct student-to-student solution copying and data leakage).
- **Recommendation**:
  Implement authorization check matching `readableSubmission`:
  - `TEACHER`: Must own the course of the homework (`homework -> lessons -> modules -> courses.teacherId === req.user.id`).
  - `STUDENT`: Must be the author of the submission (`row.studentId === req.user.id`).
  - `PARENT`: Must have an active `parent_students` record linking `parent_id = req.user.id` to `student_id = row.studentId`.
  - `ADMIN`: Permitted.

---

### [VULN-04-02] High: Missing Authorization on Homework Reference Files (`GET /api/storage/homework/:id/file`)
- **File / Lines**: `backend/src/modules/storage/storage.controller.ts:214–225`
- **Code**:
  ```typescript
  @Roles('STUDENT', 'TEACHER', 'ADMIN', 'PARENT')
  @Get('api/storage/homework/:id/file')
  async homeworkFile(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const [row] = await db.select().from(homework).where(eq(homework.id, id));
    if (!row) throw new NotFoundException('Homework not found');
    if (!row.r2ObjectKey) throw new NotFoundException('Homework has no file');
    res.redirect(302, await this.storage.presignedGet(row.r2ObjectKey, download ? row.title : undefined));
  }
  ```
- **Vulnerability Description**:
  The endpoint does not verify whether:
  1. The teacher owns the course.
  2. The student is enrolled in the course/group, or if the homework/lesson is unlocked and not hidden.
  3. The parent has a linked child in the group.
- **Impact**: Any authenticated user can download homework assignment sheets and exam questions across all teachers and courses prior to assignment release or unlock.
- **Recommendation**:
  Implement access checks mirroring `readableAttachment`:
  - `TEACHER`: Ensure teacher owns the homework course.
  - `STUDENT`: Ensure student is enrolled in the homework's group (or course groups if no group scope), homework is not hidden in `group_homework_access`, and lesson is unlocked.
  - `PARENT`: Ensure parent is linked to a student in an enrolled group with visible homework.

---

### [VULN-04-03] Medium: Unvalidated `r2ObjectKey` on Homework Creation & Arbitrary Deletion Vector
- **File / Lines**: `backend/src/modules/teacher/teacher.service.ts:1228, 1327, 1346–1349, 1368–1371`
- **Code**:
  ```typescript
  // createHomework
  r2ObjectKey: dto.r2ObjectKey?.trim() || null,

  // updateHomework & deleteHomework
  if (existing.r2ObjectKey) {
    try {
      await this.storage.deleteObject(existing.r2ObjectKey);
    } catch (err) { ... }
  }
  ```
- **Vulnerability Description**:
  Unlike `AttachDto` in `storage.controller.ts:144` which checks `dto.objectKey.startsWith('courses/${course.id}/lessons/${dto.lessonId}/')`, `CreateHomeworkDto` and `UpdateHomeworkDto` accept arbitrary `r2ObjectKey` strings without any prefix validation.
  If a malicious teacher creates a homework assignment specifying the `r2ObjectKey` of another teacher's file or an avatar, and subsequently updates or deletes the homework, the backend calls `this.storage.deleteObject(existing.r2ObjectKey)`, deleting victim objects from R2 storage.
- **Impact**: Arbitrary S3/R2 object deletion and cross-tenant file tampering.
- **Recommendation**:
  In `createHomework` and `updateHomework`, enforce:
  ```typescript
  if (dto.r2ObjectKey) {
    const prefix = `courses/${course.id}/lessons/${lessonId}/`;
    if (!dto.r2ObjectKey.startsWith(prefix)) {
      throw new ForbiddenException('Object does not belong to this lesson');
    }
  }
  ```

---

### [VULN-04-04] Medium: Arbitrary Object Deletion Vector in Student Homework Resubmission
- **File / Lines**: `backend/src/modules/student/student.service.ts:736–745, 752`
- **Code**:
  ```typescript
  if (
    existing.r2ObjectKey &&
    dto.r2ObjectKey &&
    existing.r2ObjectKey !== dto.r2ObjectKey
  ) {
    try {
      await this.storage.deleteObject(existing.r2ObjectKey);
    } catch { ... }
  }
  ```
- **Vulnerability Description**:
  `SubmitHomeworkDto` accepts an unvalidated `r2ObjectKey` from the client. On resubmission, any previous key stored in `existing.r2ObjectKey` is passed directly to `storage.deleteObject`. If a student submits an arbitrary existing key and then immediately submits a second time, the backend attempts to delete that object from R2.
- **Impact**: Authenticated students can trigger deletion of arbitrary R2 bucket objects.
- **Recommendation**:
  Prefix-validate submission keys (e.g. `r2ObjectKey.startsWith('submissions/${homeworkId}/${studentId}/')`) or enforce that keys are generated through a validated backend presign endpoint.

---

### [VULN-04-05] Low: Missing Backend Presigned Upload Flow for Student Homework
- **File / Lines**: `frontend/src/pages/student/LessonHomeworkCard.tsx:216`
- **Observation**:
  The student frontend constructs a key client-side (`submissions/${hw.id}/${file.name}`) rather than requesting a presigned PUT URL from a dedicated student storage endpoint.
- **Recommendation**:
  Create `POST /api/student/homework/:homeworkId/presigned-upload` that verifies student enrollment and lesson unlock, builds `submissions/${homeworkId}/${studentId}/${uuid}-${safeName}`, and returns a presigned PUT URL.

---

## Verification Checklist Status

| Item | Requirement | Status | Notes |
| :--- | :--- | :---: | :--- |
| **1.1** | Presigned upload confines keys to `courses/<courseId>/lessons/<lessonId>/...` | **PASS** | Verified in `storage.controller.ts:46` & `StorageService.buildObjectKey`. |
| **1.2** | Presigned avatar upload enforces `avatars/<userId>/...` | **PASS** | Verified in `storage.controller.ts:103` & `onboarding.service.ts:472`. |
| **1.3** | Lesson attachment checks prefix strictly (`prefix.startsWith(...)`) | **PASS** | Verified in `storage.controller.ts:144–148` & tests in `teacher.spec.ts`. |
| **1.4** | Path traversal in `fileName` sanitized | **PASS** | Slashes stripped; replaced with `_`; UUID prepended. Flat S3 key segment. |
| **2.1** | `assertCanUploadStorage` called before issuing upload URLs & metadata saves | **PASS** | Verified in `storage.controller.ts:44, 141` and `teacher.service.ts:1208, 1319`. |
| **2.2** | Student homework capped at 10 MB and exempt from teacher quota | **PASS** | 10 MB cap in `student.service.ts:677`; excluded from `calculateUsedStorageBytes`. |
| **2.3** | Profile file caps enforced (2 MB avatar/banner, 5 MB cover/quiz) | **PASS** | Enforced via Zod schemas and tested against non-image payloads. |
| **3.1** | Download routes require authentication | **PASS** | Global `AuthGuard` and `@Roles` active on all file routes. |
| **3.2** | Lesson attachment downloads verify teacher ownership / student unlock | **PASS** | Verified in `readableAttachment` & `assertStudentCanRead`. |
| **3.3** | Homework & submission file downloads verify authorization | **FAIL** | **VULN-04-01 & VULN-04-02**: No ownership/enrollment checks on `/homework/:id/file` and `/homework-submissions/:id/file`. |
| **3.4** | Presigned GET expiration time adheres to policy | **PASS** | Configured to 3600 seconds (1 hour) per `docs/security.md`. |

---

## Conclusion

Ticket 04 audit is complete. Storage confinement, path sanitization, quota metering, and lesson attachment authorization operate as designed. However, two critical authorization flaws (BOLA/IDOR on `/api/storage/homework-submissions/:id/file` and unauthenticated scope on `/api/storage/homework/:id/file`), along with unvalidated `r2ObjectKey` deletion vectors in homework services, require prompt remediation.
