# Documentation

Start with the current architecture, then use the guides and ADRs for details.

## Guides

| Document | What it covers |
|---|---|
| [`architecture.md`](./architecture.md) | Current system topology, modules, data model, surfaces, deployment |
| [`security.md`](./security.md) | Authentication, role matrix, content access, storage, exports, gaps |
| [`gradebook.md`](./gradebook.md) | Quiz-derived vs manual grade columns |
| [`runbook-backups.md`](./runbook-backups.md) | Postgres + object-store backup and restore |

[`master_plan.md`](../master_plan.md) is the original product brief. It contains
historical and repeated drafts; use `architecture.md` and the ADRs for what is
actually implemented.

## Architecture decisions

| ADR | Decision | Status |
|---|---|---|
| [0001](./adr/0001-better-auth.md) | Better Auth for sessions instead of a custom JWT service | current |
| [0002](./adr/0002-r2-stub-mode.md) | RustFS for dev, real S3 API in production, no fake uploads | current |
| [0003](./adr/0003-static-landing.md) | Static bilingual landing, no build step | current, extended to two pages |
| [0004](./adr/0004-expo-no-navigation.md) | Mobile without a navigation library | superseded by 0013 |
| [0005](./adr/0005-input-validation.md) | Zod body pipe instead of class-validator DTOs | current |
| [0006](./adr/0006-hardening.md) | Helmet, IP throttling, auth rate limits, sign-in lockout | current, Redis update in 0014 |
| [0007](./adr/0007-avatars.md) | Avatars use the presigned flow; `user.image` stores the key | current |
| [0008](./adr/0008-tanstack-router.md) | Code-based TanStack Router with route loaders | current |
| [0009](./adr/0009-two-s3-clients.md) | Separate API and presign S3 clients | current |
| [0010](./adr/0010-structured-logging.md) | pino JSON logs with request IDs | current |
| [0011](./adr/0011-parent-role.md) | Parent role linked by student monitoring code and QR | current |
| [0012](./adr/0012-teacher-landing-pages.md) | Teacher landing pages at `/t/<slug>` | current |
| [0013](./adr/0013-mobile-react-navigation.md) | React Navigation native stacks on mobile | current, extended by 0019 |
| [0014](./adr/0014-redis-shared-state.md) | Optional Redis for shared throttle, lockout, and job locks | current |
| [0015](./adr/0015-single-user-table.md) | One `user` identity table with a role column | current, reaffirmed 2026-10-29 |
| [0016](./adr/0016-pre-launch-toolchain.md) | Pre-launch toolchain baseline (Vite 8, Drizzle v1) | current |
| [0017](./adr/0017-teacher-theme.md) | Teacher theme is one JSONB value on the user row | current |
| [0018](./adr/0018-admin-permissions.md) | Admin roles carry permission sets enforced by a global guard | current |
| [0019](./adr/0019-mobile-bottom-tabs.md) | Mobile role stacks use bottom tabs for home, notifications, profile | current |
| [0020](./adr/0020-teacher-plans-and-entitlements.md) | Teacher-only plans, snapshotted subscriptions, and anti-griefer gift ledger | current |
| [0021](./adr/0021-exclusive-arc-quizzes-and-written-grading.md) | Exclusive-arc quizzes on course/module/lesson and teacher-graded written questions | current |
| [0022](./adr/0022-group-entry-codes.md) | Two-factor cohort enrollment via public joinCode and usage-capped entryCode | current |
| [0023](./adr/0023-soft-delete-and-restore.md) | Soft-delete and admin restore on directory entities only | current |
