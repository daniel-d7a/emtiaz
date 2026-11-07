# 01: Reconcile ADR Index, Stale Docs & Missing Structural ADRs

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should we reconcile the contradictions and gaps across `docs/adr/`, `docs/README.md`, `PRODUCT.md`, `docs/security.md`, `docs/architecture.md`, `docs/app-overview.md`, and `.scratch/teacher-plans/`? Specifically:

1. **Removing Automated Payment Gateways (`ADR-0020`, `ADR-0021`, docs, and `.scratch/teacher-plans`)**:
   - Should `ADR-0020` (Thawani hosted checkout) be deleted outright or marked withdrawn/removed with all Thawani/webhook/checkout details stripped, and `ADR-0021` + `PRODUCT.md` + `docs/security.md` + `docs/app-overview.md` + `.scratch/teacher-plans/` updated so zero references to payment gateways, Thawani, `/api/billing/checkout`, `/api/billing/webhook`, or `BILLING_ENABLED` remain anywhere in the repo?
2. **Quiz Question Types & Multi-Target Quizzes (`ADR-0016` & `PRODUCT.md` vs. Codebase)**:
   - `ADR-0016` and `PRODUCT.md` state quizzes only support `MCQ` and `TRUE_FALSE`, whereas the codebase supports `MCQ`, `TRUE_FALSE`, and `WRITTEN` (with manual teacher grading and `pending` attempts) across `course`, `module`, and `lesson` targets. Should we update `ADR-0016` and `PRODUCT.md` to reflect `WRITTEN` questions, and record a new ADR for the multi-target quiz & manual grading model?
3. **Missing Structural ADRs & Index Drift (`docs/README.md`, `ADR-0011`, `ADR-0012`, `ADR-0015`)**:
   - `docs/README.md` omits `ADR-0016`, `ADR-0017`, and `ADR-0021`, and still describes `ADR-0011` as "linked by private student code" (also mentioned in `ADR-0015`). `ADR-0012` still says "No per-teacher theming yet" (superseded by `ADR-0017`).
   - Besides updating `docs/README.md`, `ADR-0012`, and `ADR-0015`, which new ADRs should we add for unrecorded structural decisions currently in production:
     - Group Entry Codes (`requires_entry_code`, `group_entry_codes`, `group_entry_code_uses`)?
     - Multi-target Quizzes & Written Grading?
     - Soft-Delete & Restore Lifecycle?

## Answer

1. **Automated Payment Gateways Removed Completely**:
   - Deleted the old `0020-billing-provider.md` (Thawani) and promoted `teacher-plans-and-entitlements` to [ADR-0020](../../../docs/adr/0020-teacher-plans-and-entitlements.md) with zero references to payment gateways, checkout endpoints, or webhooks.
   - Removed all Thawani, `/api/billing/checkout`, `/api/billing/webhook`, and `BILLING_ENABLED` references from `PRODUCT.md`, `docs/security.md`, `docs/app-overview.md`, `docs/README.md`, `.scratch/teacher-plans/`, and obsolete `.scratch/lms-overhaul/issues/35..36`.
2. **Quizzes & Written Grading Reconciled**:
   - Updated [ADR-0016](../../../docs/adr/0016-pre-launch-toolchain.md) and `PRODUCT.md` to clarify that `SHORT_ANSWER` (auto-matched text) was replaced by teacher-graded `WRITTEN` questions.
   - Recorded [ADR-0021: Exclusive-arc quizzes on course/module/lesson and teacher-graded written questions](../../../docs/adr/0021-exclusive-arc-quizzes-and-written-grading.md).
3. **Parent Linking by Student `Monitoring Code` + QR & ADR Index Sync**:
   - Updated [ADR-0011](../../../docs/adr/0011-parent-role.md), [ADR-0015](../../../docs/adr/0015-single-user-table.md), `docs/README.md`, and `GLOSSARY.md` to define **Monitoring Code** (`user.monitoring_code` + QR code on Student Profile) as the parent-child linking mechanism, replacing phone-number lookup (`linkByPhone`). Added the implementation of `monitoring_code` + QR parent linking to the audit scope.
   - Updated [ADR-0001](../../../docs/adr/0001-better-auth.md) (`disableCookieCache: true` in `AuthGuard`) and [ADR-0012](../../../docs/adr/0012-teacher-landing-pages.md) (cross-referencing [ADR-0017](../../../docs/adr/0017-teacher-theme.md)).
4. **Additional Structural ADRs**:
   - Recorded [ADR-0022: Two-factor cohort enrollment via public joinCode and usage-capped entryCode](../../../docs/adr/0022-group-entry-codes.md).
   - Scheduled `ADR-0023: Soft-delete and admin restore on directory entities only` to be written once [Define Soft-Delete, Suspension, Inactive Group & Storefront Privacy Invariants](04-define-soft-delete-suspension-inactive-group-and-privacy.md) locks the exact soft-delete/restore rules.
