# 04: Define Soft-Delete, Suspension, Inactive Group & Storefront Privacy Invariants

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

What are the exact access and visibility invariants when users, courses, or groups are soft-deleted, suspended, or marked inactive, and what teacher contact info is public? Specifically:

1. **User Soft-Delete & Restore vs. Group Memberships (`AdminService.deleteUser` / `restoreUser`)**:
   - Should `deleteUser` keep `group_students` rows intact and instead rely on `isNull(users.deletedAt)` filtering in roster/gradebook/count queries so that `restoreUser` cleanly restores the student back into their groups?
2. **Suspended (`isActive = false`) and Soft-Deleted (`deletedAt != null`) User Filtering**:
   - What is the exact visibility rule when a student or teacher is soft-deleted vs. suspended?
3. **Inactive Group (`groups.isActive = false`) Behavior**:
   - When a group has `isActive = false`, should it become read-only for enrolled students and block new enrollments until reactivated?
4. **Teacher Contact Info on Public Storefront (`ADR-0012` vs. `PublicController`)**:
   - Should the public teacher storefront expose teacher contact info (suppressing synthetic `@phone.emtiaz.om` emails and updating `ADR-0012`), or strip `email`/`phoneNumber`?

## Answer

1. **Preserve `group_students` on User Soft-Delete ([ADR-0023](../../../docs/adr/0023-soft-delete-and-restore.md))**:
   - `AdminService.deleteUser` no longer deletes `group_students` rows; it sets `isActive = false` and `deletedAt = now()` and revokes sessions.
   - All roster, gradebook, attendance, student-count, and notification queries filter `isNull(users.deletedAt)` on `users` joins so soft-deleted students disappear while deleted and reappear with their group memberships and grades intact when `restoreUser` is called.
2. **Suspended vs. Soft-Deleted Students & Teachers**:
   - **Students**: Soft-deleted students (`deletedAt != null`) are hidden everywhere outside the Admin trash view. Temporarily suspended students (`isActive = false, deletedAt = null`) cannot sign in (`403`) but remain visible in their teacher's roster and gradebook.
   - **Teachers**: If a course's owning teacher is soft-deleted (`deletedAt != null`) or suspended (`isActive = false`), their courses and groups are hidden from public, student, and parent views and reject new student joins (`joinGroupByCode`).
3. **Inactive Group (`groups.isActive = false`) is Read-Only**:
   - When `groups.isActive = false`, already-enrolled students and linked parents retain read-only access to the group's curriculum, unlocked lessons/materials, and grades.
   - Student writes (`submitQuiz`, `markComplete`, `unmarkComplete`) and new enrollments (`joinGroupByCode`, `bulkAddStudents`, `moveStudent`, `adminEnroll`) are rejected with `400 Bad Request` (`Group is inactive`) until the group is reactivated.
4. **Public Storefront Teacher Contact Details**:
   - Keep `phoneNumber` and `email` (`string | null`) on `PublicTeacher` for the `/t/<slug>` footer, return `email: null` whenever `users.email` ends with `@phone.emtiaz.om`, and updated [ADR-0012](../../../docs/adr/0012-teacher-landing-pages.md) to match `docs/architecture.md`.
