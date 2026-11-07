# 06: Fix Auth Phone Lockout, Mandatory Phone Sync & Parent Avatar

**Status:** done
**Blocked by:** None

## Resolution
1. **Phone Sign-in Lockout**: Updated `backend/src/auth/login-lockout.ts` to support both email and phone sign-in via `normalizeIdentifier` (supporting phone normalization via `normalizePhone`). Added tests in `backend/src/auth/login-lockout.spec.ts` confirming `/sign-in/phone-number` lockout after failed attempts returning 429 and `Retry-After`.
2. **Mandatory Phone Number & Synthetic Email Sync**: Updated `UpdateMeDto`, `UpdateTeacherDto`, `UpdateStudentDto`, and `UpdateParentDto` in `backend/src/lib/schemas.ts` to disallow clearing phone number. In `onboarding.service.ts` (`updateMe`) and `admin.service.ts` (`updateTeacher`, `updateStudent`, `updateParent`), disallowed clearing phone and automatically updated synthetic email (`<digits>@phone.emtiaz.om`) whenever phone number changes. Added test in `onboarding.spec.ts`.
3. **Parent Avatar Permissions**: Added `'PARENT'` to `@Roles(...)` for `POST /api/storage/avatar` and `DELETE /api/storage/uploaded` in `backend/src/modules/storage/storage.controller.ts`.
4. **Bulk-Add Student Check**: In `backend/src/modules/teacher/teacher.service.ts` (`bulkAddStudents`), verified `existing.role === 'STUDENT'` and `!existing.deletedAt`, throwing `BadRequestException` if a phone belongs to a non-student or deleted user.
5. **Canonical Join Code & Enrollment Notifications**: Standardized `genJoinCode` to generate 6-character strings (`'OM' + 4 digits`) in `backend/src/lib/group-join.ts` and shared it with `teacher.service.ts` and `onboarding.service.ts`. Added enrollment notifications (`notifyEnrolled`) to `StudentService.joinByCode`.
6. Verified: All 18 backend test suites (190 tests) pass, frontend tests pass, and backend/frontend/mobile typechecks pass with 0 errors.

## What to build

1. **Phone Sign-in Lockout Middleware (`backend/src/auth/login-lockout.ts`)**:
   - In `loginLockoutMiddleware`, handle both email and phone sign-in. For `/sign-in/phone-number`, extract `phoneNumber`, normalize via `normalizePhone`, and check/record failed attempts using `login:fail:<phone>` and `login:lock:<phone>`.
2. **Mandatory Phone Number & Synthetic Email Sync (`backend/src/lib/schemas.ts`, `backend/src/modules/onboarding/onboarding.service.ts`, `backend/src/modules/admin/admin.service.ts`)**:
   - Disallow clearing `phoneNumber` to empty string or null in `UpdateMeDto`, `UpdateStudentDto`, `UpdateTeacherDto`, and `UpdateParentDto`.
   - When a user's `phoneNumber` changes, if their current `email` ends with `@phone.emtiaz.om`, automatically update their `email` to `<new_digits>@phone.emtiaz.om` so credentials stay synchronized.
3. **Parent Avatar Permissions (`backend/src/modules/storage/storage.controller.ts`)**:
   - Add `'PARENT'` to `@Roles(...)` on `POST /api/storage/avatar` and `DELETE /api/storage/uploaded`.
4. **Bulk-Add Student Account Check (`backend/src/modules/teacher/teacher.service.ts`)**:
   - In `bulkAddStudents`, if a user exists with the submitted phone number, verify `role === 'STUDENT'` and `isNull(deletedAt)`. If not, throw `BadRequestException` identifying the invalid phone number.
5. **Canonical Join Code Format & Notifications (`backend/src/lib/group-join.ts`, `backend/src/modules/student/student.service.ts`, `backend/src/modules/onboarding/onboarding.service.ts`, `backend/src/modules/teacher/teacher.service.ts`)**:
   - Standardize `genJoinCode` to generate 6-character strings (`'OM' + 4 digits`).
   - Call enrollment notifications in `StudentService.joinByCode` so joins via `/api/student/groups/join` notify the student and parents.

## Acceptance Criteria
- Unit tests in `login-lockout.spec.ts` prove `/sign-in/phone-number` locks out after 5 failures and returns 429.
- Updating phone on a phone-only user updates their synthetic email.
- Parents can upload and delete avatars without 403.
- `bulkAddStudents` rejects existing teachers, parents, or deleted users.
- `StudentService.joinByCode` triggers in-app and WhatsApp notifications.
