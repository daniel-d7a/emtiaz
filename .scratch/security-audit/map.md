# Emtiaz Comprehensive Security Audit (`wayfinder:map`)

## Destination

Produce a thorough security audit report and remediation plan under `.scratch/security-audit/spec.md`, systematically auditing all 5 core security vectors of the Emtiaz LMS, uncovering potential vulnerabilities, and verifying compliance with [docs/security.md](../../docs/security.md).

## Notes

- **Domain**: Security, Authorization, Authentication, Tenant Isolation, R2 Storage, Input Sanitization, Compliance.
- **Skills to consult**: `emtiaz-authz`, `grilling`, `code-review`, `diagnosing-bugs`.
- **Standing invariants from [docs/security.md](../../docs/security.md)**:
  - Role alone never grants access; ownership, enrollment, parent link, and unlock status are strictly checked.
  - Suspended (`is_active = false`) and soft-deleted (`deleted_at IS NOT NULL`) rows are blocked on every query and mutation.
  - File uploads must enforce path prefixes and storage quotas; student submission files are capped at 10MB.
  - Passwords and auth tokens are hashed and redacted in all logs and serialization layers.
  - CSV exports escape spreadsheet formula injection (`=`, `+`, `-`, `@`).

## Decisions so far

- [01: Authentication, Session Management & Credential Security](issues/01-authn-session-and-credential-security.md): Audited Better-Auth cookies, DB session re-validation (`disableCookieCache: true`), Scrypt hashing, and rate-limits. Identified missing session revocation on admin password reset (`VULN-04`), missing backend API-level `mustChangePassword` enforcement (`VULN-06`), and PRNG hardening (`VULN-07`).
- [02: Authorization, RBAC & Multi-Tenant Isolation](issues/02-authz-rbac-and-tenant-isolation.md): Verified strict teacher course/group isolation across 54 routes, student cohort lockouts, and parent read-only perimeter. Uncovered critical BOLA / IDOR vulnerability on homework file downloads (`VULN-01` and `VULN-02`).
- [03: Input Validation, SQL Parameterization & Injection Defense](issues/03-input-validation-injection-and-sanitization.md): Verified SQL injection immunity via Drizzle ORM and parameterized sql tags; confirmed 100% Zod body pipes and safe JSX encoding; identified high-severity stored XSS via unvalidated homework/submission URLs (`VULN-03`), CSV formula injection whitespace bypass (`VULN-08`), and negative integer LIMIT crashes (`VULN-09`).
- [04: Cloudflare R2 Object Storage, Upload Paths & Quotas](issues/04-object-storage-r2-and-file-security.md): Verified presigned PUT key confinement, 100MB/10MB caps, and plan storage enforcement. Confirmed BOLA on submission streaming (`VULN-01`) and arbitrary object deletion via unvalidated S3 key parameters (`VULN-05`).
- [05: Dependency Vulnerabilities, CORS & Transport Security](issues/05-dependencies-headers-and-transport-security.md): Audited npm CVEs (Multer DoS dormant; Zod memory exhaustion client-only), validated helmet/Caddy headers (identified missing HSTS and CSP in Caddy), verified zero secret leakage in git history or client bundles (flagged compose BETTER_AUTH_SECRET default fallback `VULN-10`).

## Status: Audit Phase Complete (Remediation Specification Produced)

Comprehensive Security Audit Report and Remediation Plan generated at [.scratch/security-audit/spec.md](spec.md).

## Out of scope

- Physical server infrastructure penetration testing.
- Third-party payment gateway auditing (Emtiaz has no credit card processing; billing is handled via WhatsApp and admin fulfillment).
