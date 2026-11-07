# 10: Soft-Delete Cohort Preservation & Inactive Group Guards

**Status:** done
**Blocked by:** 06

## What to build

1. **Preserve Group Memberships on User Soft-Delete (`backend/src/modules/admin/admin.service.ts`)**:
   - In `AdminService.deleteUser`, do not delete `group_students` rows.
   - Update queries joining `group_students` to filter `users.deletedAt IS NULL` on the student user so soft-deleted students are hidden from active lists, but their memberships, attendance, and grades cleanly restore when `restoreUser` is called.
2. **Inactive Group Read-Only Enforcement (`backend/src/lib/group-join.ts`, `backend/src/modules/student/student.service.ts`, `backend/src/modules/teacher/teacher.service.ts`, `backend/src/modules/admin/admin.service.ts`)**:
   - If `groups.isActive === false`, reject `joinGroupByCode`, `bulkAddStudents`, `moveStudent`, and `adminEnroll` with 400 Bad Request (`Group is inactive`).
   - In `StudentService.submitQuiz`, `markComplete`, and `unmarkComplete`, reject writes if the target group is inactive.
3. **Suspended/Deleted Teacher Protection (`backend/src/lib/group-join.ts`, `backend/src/modules/student/student.service.ts`)**:
   - In `joinGroupByCode`, verify the course's owning teacher has `isActive = true` and `deletedAt IS NULL`.
   - In `StudentService.myGroups`, filter out groups whose course teacher has `isActive = false` or `deletedAt IS NOT NULL`.

## Acceptance Criteria
- Soft-deleting a student and restoring them via `restoreUser` restores their group memberships, attendance, and grades completely.
- Inactive groups reject quiz submissions, lesson completions, and new student additions with a 400 error.
- Cohorts owned by suspended or deleted teachers reject joins and are omitted from student group lists.

## Resolution
- **Preserved Memberships on Soft-Delete**: Removed `groupStudents` row deletion from `AdminService.deleteUser`. Joined `users` and filtered `isNull(users.deletedAt)` across teacher roster, attendance sheets, group stats, gradebook matrix, announcements, and admin student counts so soft-deleted students are excluded from active rosters and headcounts while their cohort memberships, attendance, and quiz attempts are preserved and fully recovered when `restoreUser` is invoked.
- **Inactive Group Guards**:
  - `joinGroupByCode`: throws 400 `BadRequestException('Group is inactive')` when group is inactive.
  - `TeacherService.bulkAddStudents`: validates `group.isActive === true` and throws 400 `BadRequestException('Group is inactive')`.
  - `TeacherService.moveStudent`: validates destination `to.group.isActive === true` and throws 400 `BadRequestException('Target group is inactive')`.
  - `AdminService.adminEnroll` and `AdminService.moveStudentGroup`: validate target group is active, throwing 400 `BadRequestException('Group is inactive')`.
  - `StudentService`: `submitQuiz`, `markComplete`, and `unmarkComplete` assert group is active and throw 400 `BadRequestException('Group is inactive')` on student writes while leaving curriculum, grades, and materials readable.
- **Suspended/Deleted Teacher Guards**:
  - `joinGroupByCode`: verifies owning course teacher has `isActive = true` and `deletedAt IS NULL`, throwing 404 `NotFoundException('Course or teacher not available')` if suspended or soft-deleted.
  - `StudentService.myGroups`: filters `isNull(users.deletedAt)` and `eq(users.isActive, true)` on the owning course teacher so cohorts owned by suspended or soft-deleted teachers are omitted from the student's group list.
- **Verification**: Verified with integration tests in `admin.spec.ts`, `student.spec.ts`, and `teacher.spec.ts` (103 passing tests), and typechecked cleanly across both backend and frontend.
