# 22: Admin soft-delete visibility and restore

**What to build:** Every admin directory can filter to deleted rows and restore them. The backend lists deleted users/courses/groups for admins and restores them with the same authorization and audit rules as deletion.

**Blocked by:** 03, 21.

**Status:** done

- [x] Deleted users, courses, groups, and children relationships are visible through a deleted filter.
- [x] Restore returns the row to normal lists and re-enables access.
- [x] Restore is limited to admins and is recorded in the audit log.
- [x] A non-deleted list never leaks soft-deleted rows.
- [x] Restored users can sign in again; restored courses/groups are visible to their owner.

## Close-out notes

- Added `deleted_at` to courses, groups, and parent-child links (migration `20261028093102_lean_namorita`).
- Every admin directory has a deleted filter; users, courses, groups, and parent links can be restored with audit entries.
- Teacher, student, parent, public, onboarding, storage, and notification reads filter deleted courses/groups/links.
- Parent unlink is now soft-delete and re-linking restores the same row.
- Verified with a fresh `emtiaz_verify` database: migrate + seed.
