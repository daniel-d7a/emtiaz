# Emtiaz Comprehensive Security Audit (`wayfinder:map`)

## Destination

Produce a thorough security audit report and remediation plan under `.scratch/security-audit/spec.md`, systematically auditing all 5 core security vectors of the Emtiaz LMS, uncovering potential vulnerabilities, and verifying compliance with [docs/security.md](../../docs/security.md). Implement the remediation plan across 3 parallel tickets.

## Notes

- **Domain**: Security, Authorization, Authentication, Tenant Isolation, R2 Storage, Input Sanitization, Compliance.
- **Skills to consult**: `emtiaz-authz`, `grilling`, `code-review`, `diagnosing-bugs`.
- **Standing invariants from [docs/security.md](../../docs/security.md)**:
  - Role alone never grants access; ownership, enrollment, parent link, and unlock status are strictly checked.
  - Suspended (`is_active = false`) and soft-deleted (`deleted_at IS NOT NULL`) rows are blocked on every query and mutation.
  - File uploads must enforce path prefixes and storage quotas; student submission files are capped at 10MB.
  - Passwords and auth tokens are hashed and redacted in all logs and serialization layers.
  - CSV exports escape spreadsheet formula injection (`=`, `+`, `-`, `@`, `|`).

## Decisions so far

- [01: Authentication, Session Management & Credential Security](audit-reports/01-authn-session-and-credential-security.md): Audited Better-Auth cookies, DB session re-validation (`disableCookieCache: true`), Scrypt hashing, and rate-limits. Identified missing session revocation on admin password reset (`VULN-04`), missing backend API-level `mustChangePassword` enforcement (`VULN-06`), and PRNG hardening (`VULN-07`).
- [02: Authorization, RBAC & Multi-Tenant Isolation](audit-reports/02-authz-rbac-and-tenant-isolation.md): Verified strict teacher course/group isolation across 54 routes, student cohort lockouts, and parent read-only perimeter. Uncovered critical BOLA / IDOR vulnerability on homework file downloads (`VULN-01` and `VULN-02`).
- [03: Input Validation, SQL Parameterization & Injection Defense](audit-reports/03-input-validation-injection-and-sanitization.md): Verified SQL injection immunity via Drizzle ORM and parameterized sql tags; confirmed 100% Zod body pipes and safe JSX encoding; identified high-severity stored XSS via unvalidated homework/submission URLs (`VULN-03`), CSV formula injection whitespace bypass (`VULN-08`), and negative integer LIMIT crashes (`VULN-09`).
- [04: Cloudflare R2 Object Storage, Upload Paths & Quotas](audit-reports/04-object-storage-r2-and-file-security.md): Verified presigned PUT key confinement, 100MB/10MB caps, and plan storage enforcement. Confirmed BOLA on submission streaming (`VULN-01`) and arbitrary object deletion via unvalidated S3 key parameters (`VULN-05`).
- [05: Dependency Vulnerabilities, CORS & Transport Security](audit-reports/05-dependencies-headers-and-transport-security.md): Audited npm CVEs (Multer DoS dormant; Zod memory exhaustion client-only), validated helmet/Caddy headers (identified missing HSTS and CSP in Caddy), verified zero secret leakage in git history or client bundles (flagged compose BETTER_AUTH_SECRET default fallback `VULN-10`).

## Remediation Tickets (Completed)

- [x] [Remediation Ticket 01: Storage Authorization & Path Integrity](issues/01-storage-authorization-and-path-integrity.md): Remediated VULN-01 (submission IDOR), VULN-02 (homework reference file IDOR), and VULN-05 (S3 key prefix enforcement). 25 unit/integration test cases added in `storage.controller.spec.ts`.
- [x] [Remediation Ticket 02: URL Sanitization, Stored XSS Defense & CSV Injection Hardening](issues/02-url-sanitization-xss-and-csv-formula-defense.md): Remediated VULN-03 (`safeHttpUrl` schema check and client-side safe link checks), VULN-08 (CSV formula whitespace & pipe bypass), and VULN-09 (PostgreSQL negative limit clamp).
- [x] [Remediation Ticket 03: Session Revocation, Gateway AuthGuard Enforcement & CSPRNG](issues/03-session-revocation-gateway-enforcement-and-csprng.md): Remediated VULN-04 (admin password reset session revoke), VULN-06 (AuthGuard `mustChangePassword` gate), VULN-07 (CSPRNG temporary passwords), VULN-10 (compose secret tightening), VULN-11 (self-service password change revoke other sessions), and VULN-13 (Caddy HSTS).

## Status: Audit & Remediation Fully Completed and Verified

## Out of scope

- Physical server infrastructure penetration testing.
- Third-party payment gateway auditing (Emtiaz has no credit card processing; billing is handled via WhatsApp and admin fulfillment).
