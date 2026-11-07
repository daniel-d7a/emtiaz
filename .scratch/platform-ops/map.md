# Platform Operations & Compliance Feature (`wayfinder:map`)

## Destination

Produce `.scratch/platform-ops/spec.md` (and any required architecture/security updates) covering:
1. **Admin Password Reset**: Secure backend API and admin UI for resetting passwords of students, teachers, and parents (with temporary password generation, audit logging, and credentials delivery).
2. **Legal Pages & Compliance**: Bilingual static and SPA Privacy Policy and Terms of Service (aligned with Omani and Egyptian digital education laws, student data privacy, and subscription rules) linked from footers, registration, and settings.
3. **Comprehensive Domain Event Logging**: Full domain-level audit trail covering all LMS mutations (courses, modules, lessons, quizzes, attempts, cohorts, enrollment, homework, and attendance) with structured metadata and an enhanced filterable Admin Audit dashboard.

## Notes

- **Domain**: Platform Administration, Compliance, Legal, Security, Audit Logging.
- **Skills to consult**: `grilling`, `domain-modeling`, `emtiaz-authz`, `emtiaz-api`, `emtiaz-ui`.
- **Standing preferences**:
  - Arabic-first bilingual (OMR / EGP context-aware).
  - Explicit authorization checks; only authorized administrators can reset passwords or view audit logs.
  - Passwords are encrypted/hashed via Better-Auth credential provider; raw passwords never stored or logged in audit metadata.
  - Legal pages must be accessible both as extensionless static pages (via Caddy) and in-app SPA routes (`/privacy`, `/terms`).
  - Audit logs must record actor, action, target, IP/endpoint, and sanitized payload diff.

## Decisions so far

- [01: Admin Password Reset for Teachers, Students & Parents](grilling/01-admin-password-reset.md): `POST /api/admin/users/:id/reset-password` with 8-character temporary password auto-generation, Better-Auth credential hashing, `mustChangePassword = true`, and Admin UI modal with copy & WhatsApp buttons; login screens "Forgot Password?" opens WhatsApp support modal.
- [02: Legal Pages (Privacy Policy, Terms of Service) & In-App Routing](grilling/02-legal-pages-privacy-and-terms.md): Bilingual Privacy Policy & Terms of Service covering Omani and Egyptian digital educational law, minor protection, parent rights, and zero-data-selling guarantee; delivered via static HTML (`landing/privacy.html`, `landing/terms.html`) and in-app routes (`/privacy`, `/terms`).
- [03: Comprehensive Domain Event Logging & Filterable Audit Dashboard](grilling/03-comprehensive-domain-event-logging.md): Centralized `shared/audit-events.ts` registry defining all domain actions across curriculum, quizzes, cohorts, homework, billing, and auth; mandatory user ID and timestamp; Admin Audit UI with search by User ID, category dropdown, action badges, and detail modal.

## Implementation Tickets

- [ ] [01: Admin Password Reset & Forgot Password WhatsApp Support](issues/01-admin-password-reset-and-login-support.md)
- [ ] [02: Legal Pages (Privacy Policy, Terms of Service) & Multi-Surface Routing](issues/02-legal-pages-privacy-terms-and-routing.md)
- [ ] [03: Centralized Audit Registry, Domain Event Logging & Admin Dashboard Upgrades](issues/03-audit-events-registry-domain-logging-and-dashboard.md)

## Out of scope

- Automated self-serve email password reset links (tracked under email provider integration task).
- Third-party SSO providers (Google/Apple OAuth) for students.
