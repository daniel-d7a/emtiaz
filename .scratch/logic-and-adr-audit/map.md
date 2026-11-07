# Existing Features Logic & ADR Audit (`wayfinder:map`)

## Destination

Resolve all ADR contradictions, documentation drift, and domain logic gaps across existing Emtiaz features; update/create ADRs, docs (`docs/README.md`, `PRODUCT.md`, `docs/architecture.md`, `docs/security.md`, `docs/app-overview.md`, `docs/gradebook.md`), and `GLOSSARY.md`; and produce `.scratch/logic-and-adr-audit/spec.md` plus implementation tickets for the resulting code fixes.

## Notes

- **Domain**: Cross-cutting platform audit — ADRs & documentation, Quizzes & Gradebook, Attendance & Pacing scoping, Soft-Delete/Suspension & Storefront Privacy, and Auth/Phone/Enrollment consistency.
- **Skills to consult**: `grilling`, `domain-modeling`, `emtiaz-api`, `emtiaz-authz`, `emtiaz-ui`, `emtiaz-mobile`.
- **Standing preferences**:
  - **No automated payment gateway**: Remove all plans, endpoints, or references to automated payment gateways (e.g., Thawani, Egypt gateway, `/api/billing/checkout`, `/api/billing/webhook`, `BILLING_ENABLED`) from ADRs (`ADR-0020`, `ADR-0021`), docs (`PRODUCT.md`, `docs/security.md`, `docs/app-overview.md`, `docs/README.md`), `.scratch/teacher-plans/`, and code. Manual Admin fulfillment via WhatsApp + promo/referral codes is the sole billing model.
  - Pre-launch means no legacy shims: fix broken invariants cleanly and reseed rather than backfilling.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Reconcile ADR Index, Stale Docs & Missing Structural ADRs](issues/01-reconcile-adr-index-stale-docs-and-missing-adrs.md): Deleted Thawani `ADR-0020` and promoted teacher-only plans to `ADR-0020` with zero gateway references across docs/specs; added `ADR-0021` (exclusive-arc quizzes + written grading) and `ADR-0022` (group entry codes); updated `ADR-0011` and `GLOSSARY.md` so parents link via a unique student `Monitoring Code` + QR instead of phone number.
- [Define Quiz Lifecycle, Written Grading & Grade Average Rules](issues/02-define-quiz-lifecycle-written-grading-and-averages.md): Editing an existing quiz warns the teacher with a confirmation dialog before wiping `quiz_attempts`; `WRITTEN` questions use `question.points` (default `10`, validated `0..points` on grade); `pending = true` attempts are excluded from numeric grade averages and ranked below graded attempts; Student, Parent, and Teacher views share one grade average formula over graded visible quizzes + non-null manual columns.
- [Define Attendance, Lesson Completion & Pacing Scoping Across Groups](issues/03-define-attendance-completion-and-pacing-scoping.md): Student attendance percentage divides `present` by `marked` visible lessons (`0` when `marked === 0`); `lesson_completions` and `lesson_attendance` stay keyed by `(lesson_id, student_id)` so intra-course group moves preserve history; hidden lessons/quizzes are excluded from `gradebook`, `groupStats`, and `listCourses`; `getLesson` scopes group-only attachments to the requested or unlocked visible group.
- [Define Soft-Delete, Suspension, Inactive Group & Storefront Privacy Invariants](issues/04-define-soft-delete-suspension-inactive-group-and-privacy.md): `deleteUser` keeps `group_students` intact and queries filter `users.deleted_at IS NULL` so `restoreUser` restores memberships (`ADR-0023`); suspended students stay visible in teacher rosters while suspended/deleted teachers' groups hide from students/parents and block joins; `groups.is_active = false` is read-only for enrolled students and blocks writes/enrollments; `PublicTeacher` keeps contact info (`ADR-0012`) but masks `@phone.emtiaz.om` synthetic emails as `null`.
- [Define Auth, Phone Identity, Avatar Roles & Group Join Consistency](issues/05-define-auth-phone-avatar-and-join-consistency.md): Phone sign-in enforces the same 5-attempt/15-min lockout; phone is mandatory for non-admins and updates sync synthetic `<digits>@phone.emtiaz.om` emails; `PARENT` role is added to avatar upload/delete; `bulkAddStudents` rejects existing non-student or deleted phone accounts; `StudentService.joinByCode` sends enrollment notices; `genJoinCode` is unified to 6-char `OM` + 4 digits; student receives unique 8-char `monitoring_code` + QR for parent linking.

## Not yet specified

_None — all decision tickets are resolved and the way to the destination is clear._

## Out of scope

- **Automated payment gateway integration**: Explicitly removed from all plans, ADRs, and docs; Emtiaz uses manual Admin/WhatsApp fulfillment and promo/referral codes only.
- **Executing the Teacher Plans feature build**: Covered by the separate [Teacher Plans & Entitlements](../teacher-plans/map.md) effort (though removing gateway references from its ADR/spec is in scope here).
