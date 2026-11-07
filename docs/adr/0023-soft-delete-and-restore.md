# ADR-0023: Soft-delete and admin restore on directory entities only

Date: 2026-11-07

Top-level directory entities managed by Admins (`user`, `courses`, `groups`, `parent_students`) use soft-delete (`deleted_at`) with audit-logged Admin restore, whereas curriculum child rows (`modules`, `lessons`, `lesson_attachments`, `quizzes`, `quiz_questions`) hard-delete via database cascade. Soft-deleting a user revokes their sessions and sets `is_active = false` and `deleted_at = now()`, but **preserves `group_students` rows** (and historical grades/attempts/completions) while filtering `users.deleted_at IS NULL` in all roster, gradebook, attendance, count, and notification queries so restoring a deleted student (`restoreUser`) restores their cohort memberships and history intact.

## Consequences

- **Suspended vs. soft-deleted students**: Temporarily suspended students (`is_active = false, deleted_at IS NULL`) cannot sign in (`403`) but remain visible in their teacher's roster and gradebook; soft-deleted students (`deleted_at IS NOT NULL`) are hidden everywhere except the Admin deleted directory.
- **Suspended or soft-deleted teachers**: Courses and groups owned by a suspended (`is_active = false`) or soft-deleted (`deleted_at IS NOT NULL`) teacher are hidden from public, student, and parent views and reject new group joins.
- **Inactive groups (`groups.is_active = false`)**: Archiving/deactivating a group makes it read-only for already-enrolled students and linked parents (curriculum, unlocked lessons, and grades remain readable), while rejecting student writes (`submitQuiz`, `markComplete`, `unmarkComplete`) and new enrollments (`joinGroupByCode`, `bulkAddStudents`, `moveStudent`, `adminEnroll`) until reactivated.
