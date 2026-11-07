# ADR-0015: One user identity table with a role column

Date: 2026-10-26

## Context
Admins, teachers, students, and parents share the same login, session, profile,
notification, and audit surfaces. Role-specific data is currently small:
teacher landing fields and subject category, student grade and monitoring
code. Domain tables already reference `user.id` from many directions.

## Decision
Keep one `user` table as the authentication identity. Store the role on that
row (`ADMIN`, `TEACHER`, `STUDENT`, `PARENT`) and keep the few role-specific
columns nullable on the same table.

Do not create separate `teachers`, `students`, and `parents` identity tables.
If role-specific data grows, add optional 1:1 profile tables
(`teacher_profiles`, `student_profiles`, `parent_profiles`) that reference
`user.id`; keep `user` as the base.

## Rationale
- Better Auth owns `user`, `session`, and `account`; every session and account
  already points at `user.id`.
- Shared foreign keys (`courses.teacher_id`, `group_students.student_id`,
  `parent_students.parent_id/student_id`, notifications, audit) stay simple and
  referentially sound. Separate identity tables would force polymorphic foreign
  keys or duplicate IDs.
- Roles are mutable. A student becoming a teacher is one `UPDATE`, not a row
  migration.
- Cross-role operations — admin directories, notifications, authentication,
  audit — stay one-table queries.
- The cost is nullable columns and a few role checks. At this size that is
  cheaper than extra joins and migrations.

## Consequences
- The database does not yet enforce role-specific field rules. For example,
  `landing_slug` is meaningful only for teachers and `grade_id` only for
  students. Application code filters by role; add `CHECK` constraints or 1:1
  profile tables if this becomes a source of bugs.
- A role change can leave role-specific fields populated. Clear them in the
  role-change flow if that becomes supported.
- Queries that need only one role should still filter by `role` (and usually
  `is_active` / `deleted_at`); the shared table does not make every user a valid
  target for every endpoint.

## Re-evaluation 2026-10-29

Revisited against the current schema and query patterns (ticket 38).

Role-specific columns are still small and nullable:

- Teacher: `landing_slug`, `landing_bio`, `landing_banner`, `landing_theme`,
  `landing_published`, `subject_category_id`.
- Student: `grade_id`, `date_of_birth`.
- Admin: `admin_role_id`.
- Parent: none.

Queries still reference `user.id` from many directions: `courses.teacher_id`,
`group_students.student_id`, `parent_students.parent_id/student_id`, sessions,
accounts, notifications, and audit logs. Splitting identity tables would force
polymorphic foreign keys or duplicate ids and would touch every auth, session,
and admin-directory query. No current query would benefit from the split.

**Decision:** keep the single `user` table and reaffirm ADR-0015. Do not split
now. If the teacher public-profile fields grow into a larger model, add an
optional 1:1 `teacher_profiles` table that references `user.id`; keep `user` as
the identity. Any split must use expand–contract: add the profile table,
dual-write, backfill, switch reads, then remove the columns in a later
migration.
