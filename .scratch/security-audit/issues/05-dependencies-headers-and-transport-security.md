# 05: Dependency Vulnerabilities, CORS & Transport Security

**Type:** audit
**Status:** open
**Blocked by:** None

## Objective

Audit third-party dependencies, transport layer security, CORS configurations, security headers, and reverse proxy settings.

## Verification Checklist

1. **Dependency Vulnerability Scanning (`npm audit`)**:
   - Run `npm audit` across `backend/`, `frontend/`, `mobile/`.
   - Identify any high or critical CVEs and evaluate whether they affect production runtimes.
2. **CORS & HTTP Security Headers**:
   - Audit `backend/src/main.ts`: Verify CORS origin restrictions, credentials handling, and allowed methods/headers.
   - Audit Caddy web server configuration (`web/Caddyfile` or proxy): Verify HSTS (`Strict-Transport-Security`), `X-Frame-Options: SAMEORIGIN` (or `DENY`), `X-Content-Type-Options: nosniff`, and Referrer-Policy headers.
3. **Sensitive Environment Variables**:
   - Verify that secrets (`JWT_SECRET`, Better-Auth secret, R2 access keys, database passwords) are not hardcoded in the codebase, committed in git, or exposed to the client in Vite or Expo bundles.
