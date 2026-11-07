# Role Auth, Multi-Step Onboarding, Country Taxonomy & In-App Guidance (`wayfinder:map`)

## Destination

Produce `.scratch/onboarding-and-guidance/spec.md` (and any required ADRs) covering role-specific auth and multi-step signup wizards (`Teacher`, `Student`, `Parent`), bilingual country-scoped `grades` (`OM` vs. `EG`) and 30 seeded bilingual general `categories` (tracks), first-time interactive dashboard walkthroughs for each role, the reusable `(i)` hint component (1-sentence tooltip or mini multi-step modal), and the persistent WhatsApp Report Problem / Feedback CTA wired to Admin settings.

## Notes

- **Domain**: Onboarding, Authentication, Curriculum Taxonomy & First-Time User Guidance.
- **Skills to consult**: `grilling`, `domain-modeling`, `emtiaz-api`, `emtiaz-authz`, `emtiaz-ui`, `emtiaz-mobile`.
- **Standing preferences**:
  - Separate, tailored onboarding and auth screens for each user role (`TEACHER`, `STUDENT`, `PARENT`).
  - `grades` are explicitly bilingual (`nameAr`, `nameEn`) and scoped by `country` (`OM` | `EG`); `categories` (general tracks) are explicitly bilingual (`nameAr`, `nameEn`) and seeded with 30 entries.
  - Every onboarding step and all platform surfaces expose a clear **Report Problem / Feedback** button that redirects to the Admin-configured WhatsApp number (`supportWhatsapp`).

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Define Role-Specific Auth & Multi-Step Signup Wizard](decisions/01-role-auth-and-multi-step-signup-wizard.md): Dedicated `/login/$role` and `/register/$role` wizards for Teacher, Student, and Parent with live per-step email/phone availability validation, country + phone step, role-specific focus/grade/child-link step, congratulations screen, and persistent WhatsApp Report Problem button on every step.
- [Define Country-Scoped Grades & 30 Bilingual General Tracks Taxonomy](decisions/02-country-grades-and-general-tracks-taxonomy.md): Upgrade `grades` (`country: 'OM' | 'EG'`, `nameAr`, `nameEn` — Oman Grades 1–12, Egypt Primary 1–6 + Prep 1–3 + Secondary 1–3) and `categories` (`nameAr`, `nameEn` — 30 bilingual general tracks); persist teacher `courseFocus` (`ACADEMIC` | `GENERAL`) and `teacher_grades` to default course creation and profile editing.
- [Define First-Time Dashboard Walkthroughs, (i) Hint System & WhatsApp Report Problem CTA](decisions/03-first-time-walkthroughs-info-hints-and-whatsapp-support.md): Role-specific 3-step Welcome Tour Modal + interactive Getting Started Checklist on dashboards (re-openable from header), dual-mode `<InfoHint />` component (1-sentence popover or mini multi-step modal) on core surfaces, and persistent WhatsApp Report Problem button on all onboarding steps and app chrome wired to Admin `supportWhatsapp`.

## Not yet specified

_None — all decision tickets are resolved and the way to the destination is clear._

## Out of scope

- **Password reset via email provider**: Tracked separately under the Email Provider & Password Reset effort.
- **Parent monitoring QR code on student profile**: Tracked separately under the Enrollment & Parent QR Codes effort (though Parent onboarding will smoothly integrate with linking a child).
