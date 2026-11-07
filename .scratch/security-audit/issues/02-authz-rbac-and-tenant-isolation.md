# 02: Authorization, RBAC & Multi-Tenant Isolation

**Type:** audit
**Status:** open
**Blocked by:** None

## Objective

Audit role-based and ownership-based authorization across all controllers and service layers according to the `docs/security.md` matrix and `emtiaz-authz` skill rules.

## Verification Checklist

1. **Teacher Isolation**:
   - Audit `TeacherController` & `TeacherService`: Verify that a teacher cannot view, edit, or delete courses, modules, lessons, quizzes, groups, homework, attendance, or gradebook records belonging to another teacher.
   - Verify that all mutations call `assertCourseAccess` or check `group.teacherId === user.id`.
2. **Student Access Boundaries**:
   - Audit `StudentController` & `StudentService`: Verify that students can only read lessons, files, quizzes, and homework for groups they are actively enrolled in (`group_students`).
   - Verify lesson lock enforcement (`group_lesson_access`, `unlock_all_by_default`) preventing students from accessing locked lessons or completing them out of sequence.
   - Verify quiz and homework submissions verify cohort enrollment and group course association.
3. **Parent Read-Only Perimeter**:
   - Audit `ParentController` & `ParentService`: Verify parents can ONLY view data for students linked via `parent_student_links`.
   - Verify that unlinked parent requests return `403 Forbidden` or `404 Not Found`.
   - Verify parents have ZERO write access to curriculum, student answers, quiz submissions, homework submissions, or group settings.
4. **Administrative Permissions & Moderation**:
   - Audit `AdminController` & `AdminService`: Verify `@RequirePermission(...)` is enforced on every administrative route.
   - Verify that admins cannot call teacher mutation endpoints (editing teacher course curriculum content directly).
5. **Soft-Delete & Suspension Enforcement**:
   - Verify that all read and write queries enforce `deleted_at IS NULL` on courses, groups, users, and parent links.
   - Verify that suspended users (`is_active = false`) are rejected with `403 Forbidden` globally.
