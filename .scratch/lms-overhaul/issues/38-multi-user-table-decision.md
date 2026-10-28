# 38: Multi-user-table decision

**What to build:** Revisit ADR-0015 (one `user` table with a role) against the current role-specific fields and access rules. Produce a decision with a migration sketch, or reaffirm the single table and close the item.

**Blocked by:** None (can start immediately).

**Status:** done

## Comments

Reaffirmed the single `user` table in ADR-0015 with a 2026-10-29 re-evaluation section; docs/architecture.md and docs/README.md updated. Committed in `09657ee`. No split ticket is proposed; the optional 1:1 `teacher_profiles` expand–contract path is documented if the teacher profile grows.

- [x] The trade-offs are documented against the current schema and query patterns.
- [x] The decision states whether to split, keep, or partially split profiles.
- [x] If splitting, an expand–contract migration path is outlined and an implementation ticket is proposed.
- [x] ADR-0015 is superseded or reaffirmed; docs are updated.
