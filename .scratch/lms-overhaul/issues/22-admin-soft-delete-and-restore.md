# 22: Admin soft-delete visibility and restore

**What to build:** Every admin directory can filter to deleted rows and restore them. The backend lists deleted users/courses/groups for admins and restores them with the same authorization and audit rules as deletion.

**Blocked by:** 03, 21.

**Status:** ready-for-agent

- [ ] Deleted users, courses, groups, and children relationships are visible through a deleted filter.
- [ ] Restore returns the row to normal lists and re-enables access.
- [ ] Restore is limited to admins and is recorded in the audit log.
- [ ] A non-deleted list never leaks soft-deleted rows.
- [ ] Restored users can sign in again; restored courses/groups are visible to their owner.
