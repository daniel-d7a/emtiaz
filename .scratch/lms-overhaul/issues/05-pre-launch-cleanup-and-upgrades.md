# 05: Pre-launch cleanup and dependency upgrades

**What to build:** Remove the legacy short-answer question type and any unused columns/code, reseed the database, and upgrade Vite to v8 and Drizzle to v1. Update the affected ADRs and docs.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A fresh migrate + seed produces a working database with no legacy columns or enum values.
- [ ] Backend and frontend typecheck, tests, and build pass on the upgraded toolchain.
- [ ] Docs and ADRs reflect the removed concepts and version changes.
- [ ] No backfill or compatibility shim is left behind.
