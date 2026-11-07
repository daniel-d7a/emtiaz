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

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

## Active Frontier

- [01: Authentication, Session Management & Credential Security](issues/01-authn-session-and-credential-security.md) (claimed)
- [02: Authorization, RBAC & Multi-Tenant Isolation](issues/02-authz-rbac-and-tenant-isolation.md) (open)
- [03: Input Validation, SQL Parameterization & Injection Defense](issues/03-input-validation-injection-and-sanitization.md) (open)
- [04: Cloudflare R2 Object Storage, Upload Paths & Quotas](issues/04-object-storage-r2-and-file-security.md) (open)
- [05: Dependency Vulnerabilities, CORS & Transport Security](issues/05-dependencies-headers-and-transport-security.md) (open)

## Out of scope

- Physical server infrastructure penetration testing.
- Third-party payment gateway auditing (Emtiaz has no credit card processing; billing is handled via WhatsApp and admin fulfillment).
