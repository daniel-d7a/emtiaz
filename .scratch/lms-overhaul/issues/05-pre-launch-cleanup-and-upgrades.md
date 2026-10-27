# 05: Pre-launch cleanup and dependency upgrades

**What to build:** Remove the legacy short-answer question type and any unused columns/code, reseed the database, and upgrade Vite to v8 and Drizzle to v1. Update the affected ADRs and docs.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A fresh migrate + seed produces a working database with no legacy columns or enum values.
- [x] Backend and frontend typecheck, tests, and build pass on the upgraded toolchain.
- [x] Docs and ADRs reflect the removed concepts and version changes.
- [x] No backfill or compatibility shim is left behind.

## Comments

- 2026-10-27: Shipped in `3c072dc`. Removed `SHORT_ANSWER` and the unused `user.specialization` field (schema, auth config, shared type, migration). Regenerated the question enum, upgraded to Vite 8 / Vitest 5 / plugin-react 6 and Drizzle ORM/Kit `1.0.0-rc.5`, converted migrations to the v1 folder layout with `drizzle-kit up`, and documented the baseline in ADR-0016. Also corrected stale parent invite-code docs.
- Fresh DB verification: created `emtiaz_verify`, ran `db:migrate` + `db:seed`; 10 users, 2 quiz questions, enum `{MCQ,TRUE_FALSE}`, zero `user.specialization` columns. Dropped the verification DB afterwards.
- Gates: backend typecheck/build + 99 tests pass; frontend typecheck/build + 12 tests pass; mobile typecheck passes. Vite 8 reduced the web bundle to 534 kB (156 kB gzip).
- Follow-up: Drizzle v1 is still a release candidate (`rc.5`) because no stable v1 is published; recheck on stable release.
