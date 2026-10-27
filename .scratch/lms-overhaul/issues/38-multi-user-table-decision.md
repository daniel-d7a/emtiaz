# 38: Multi-user-table decision

**What to build:** Revisit ADR-0015 (one `user` table with a role) against the current role-specific fields and access rules. Produce a decision with a migration sketch, or reaffirm the single table and close the item.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The trade-offs are documented against the current schema and query patterns.
- [ ] The decision states whether to split, keep, or partially split profiles.
- [ ] If splitting, an expand–contract migration path is outlined and an implementation ticket is proposed.
- [ ] ADR-0015 is superseded or reaffirmed; docs are updated.
