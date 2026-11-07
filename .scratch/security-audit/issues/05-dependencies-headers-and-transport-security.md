# 05: Dependency Vulnerabilities, CORS & Transport Security

**Type:** audit
**Status:** resolved
**Blocked by:** None

---

## Objective

Conduct a comprehensive defensive security audit of third-party dependencies, transport layer security, CORS configurations, HTTP security headers, and secret isolation across backend, frontend, mobile, and reverse-proxy infrastructure.

---

## Executive Summary

A thorough security audit was performed evaluating the dependency supply chain, transport security, HTTP headers, CORS configurations, and environment secrets across `backend/`, `frontend/`, `mobile/`, `web/`, and container infrastructure.

### Key Defensive Guarantees Confirmed:
1. **Dormant CVE Runtime Paths**: While `npm audit` flags a high-severity DoS vulnerability in `multer` via `@nestjs/platform-express`, Emtiaz LMS utilizes direct-to-storage presigned upload URLs (`@aws-sdk/s3-request-presigner` and `@aws-sdk/client-s3`). Neither `FileInterceptor` nor `multer` multipart handlers are mounted anywhere in `backend/src`, ensuring that `multer` is never executed in production request paths.
2. **Zero Secret Leakage in Client Bundles or Git History**: An exhaustive git history audit verified that no private keys, production passwords, or R2 credentials have ever been committed. Frontend SPA bundles reference only `VITE_API_URL`, and mobile source references only `EXPO_PUBLIC_API_URL`.
3. **Defense-in-Depth HTTP Headers**: The backend API employs `helmet` with strict security defaults in production, while Caddy reverse proxy enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

### Key Gaps & Risks Identified:
1. **Missing HSTS & Web CSP in Caddy**: `web/Caddyfile` does not emit `Strict-Transport-Security` (HSTS) and does not define a `Content-Security-Policy` header for static frontend SPA assets or landing pages.
2. **Insecure Compose Fallback for `BETTER_AUTH_SECRET`**: `docker-compose.yml:95` defaults `BETTER_AUTH_SECRET` to `change-me-in-production`. An unconfigured production launch would permit session token forgery.
3. **Single-Origin CORS Restriction**: `backend/src/main.ts` accepts a single string `origin: process.env.FRONTEND_URL ?? 'http://localhost:5173'`. Deploying across multiple domains (e.g., custom landing domains or separate administrative subdomains) will require multi-origin validation.
4. **Outdated Zod in Frontend**: `frontend/package.json` pins `zod: ^3.25.76`, which is subject to GHSA-mrhx-c7xc-m3w5 (collection memory exhaustion), whereas backend has already been upgraded to `zod: ^4.6.7`.

---

## Detailed Audit Findings

### 1. Dependency Vulnerability Scanning (`npm audit`)

#### 1.1 Backend (`backend/`)
- **Audit Summary**: 15 vulnerabilities total (0 critical, 2 high, 5 moderate, 8 low) across 699 dependencies.
- **Detailed Vulnerability Assessment**:
  1. **`multer` (High - GHSA-q7qp-rjg7-q26m, CVSS 7.5)**:
     - *Issue*: Denial of service via pending asynchronous `fileFilter` after request teardown (`multer: 2.0.0 - 2.4.0` via `@nestjs/platform-express`).
     - *Runtime Path Analysis*: **Not Vulnerable (Dormant)**. Emtiaz LMS architecture delegates all file uploads to direct S3/Cloudflare R2 presigned URLs (`backend/src/modules/storage/storage.controller.ts:34-105` and `storage.service.ts:13-64`). No route uses `FileInterceptor`, `FilesInterceptor`, or raw `multer` middleware. `@nestjs/platform-express` includes `multer` as an internal dependency for its file-upload utility, but it is never invoked in any execution path.
  2. **`js-yaml` (Moderate - GHSA-r3ph-w7gj-g6xm, CVSS 5.3)**:
     - *Issue*: `maxTotalMergeKeys` does not limit CPU use for empty merge sources (`js-yaml: 5.0.0 - 5.4.0` via `@nestjs/swagger`).
     - *Runtime Path Analysis*: **Controlled / Low Risk**. Swagger OpenAPI documentation is strictly conditional (`backend/src/main.ts:23, 46-54`):
       ```typescript
       const docsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === '1';
       ```
       In production, Swagger UI and OpenAPI generation are disabled unless `ENABLE_API_DOCS=1` is explicitly set.
  3. **DevDependencies (`@nestjs/cli`, `glob`, `minimatch`, `jest`, `ts-jest`, `deepmerge`)**:
     - *Issue*: Moderate and low CVEs in CLI tools and test harnesses (`GHSA-3g3m-2fjr-6pw4`, `GHSA-g3hv-75wg-m249`, `GHSA-gcqx-w48m-w2h4`).
     - *Runtime Path Analysis*: **Zero Production Exposure**. `backend/Dockerfile` enforces multi-stage builds where devDependencies are pruned in the final runtime container:
       ```dockerfile
       RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force
       ```
       None of these libraries exist in the shipping production container.

#### 1.2 Frontend (`frontend/`)
- **Audit Summary**: 1 vulnerability (0 critical, 1 high, 0 moderate, 0 low) across 234 dependencies.
- **Detailed Vulnerability Assessment**:
  1. **`zod` (High - GHSA-mrhx-c7xc-m3w5, CVSS 7.5)**:
     - *Issue*: Memory exhaustion while validating oversized constrained collections (`zod < 4.6.6`, currently pinned to `^3.25.76` in `frontend/package.json:25`).
     - *Runtime Path Analysis*: **Client-Side Isolated**. In `frontend/src`, `zod` is solely executed inside the client's browser for form schema validation via `react-hook-form` and `@hookform/resolvers/zod`. Even if an attacker fed malicious payloads into their own client form, the impact is confined to their local browser tab. Furthermore, all backend inputs are parsed by `backend/src/lib/schemas.ts` running patched `zod: ^4.6.7`.

#### 1.3 Mobile (`mobile/`)
- **Audit Summary**: 11 vulnerabilities (0 critical, 3 high, 7 moderate, 1 low) across 544 dependencies.
- **Detailed Vulnerability Assessment**:
  1. **`node-forge` (High - GHSA-jc66-7q78-782g, GHSA-8hrf-8g6f-7xwp, GHSA-hqq3-7jhf-c5jx, GHSA-5x38-2vff-x55p)**:
     - *Issue*: TLS record processing and cryptographic flaws in `node-forge <= 1.4.0`.
     - *Runtime Path Analysis*: **Zero Mobile Binary Exposure**. `node-forge` is imported exclusively by `@expo/cli` and the Metro local development bundler for generating self-signed dev certificates. It is never included in compiled Android APK/AAB or iOS IPA application packages.
  2. **`zod`, `glob`, `minimatch` in Expo CLI**:
     - *Issue*: Transitive dependencies inside `@expo/cli`, `@expo/config`, and `@expo/metro-config`.
     - *Runtime Path Analysis*: **Zero Mobile Binary Exposure**. These packages operate exclusively on the developer host machine during bundle compilation and are pruned from native application distributions.

---

### 2. CORS & HTTP Security Headers

#### 2.1 Backend CORS Architecture (`backend/src/main.ts`)
- **Configuration** (`lines 33–36`):
  ```typescript
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  ```
- **Better-Auth Trusted Origins** (`backend/src/auth/auth.ts:18`):
  ```typescript
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173']
  ```
- **Strengths**:
  - No wildcard origin (`*`) with credentials: Express CORS strictly enforces exact-origin matching against `FRONTEND_URL`.
  - Credentials flag (`credentials: true`) safely paired with non-wildcard origin, allowing session cookies while blocking arbitrary cross-origin origins.
- **Risks & Deficiencies**:
  - **Single Origin Limitation**: Passing a single string (`process.env.FRONTEND_URL`) means only one exact origin is whitelisted. In multi-domain deployments (e.g., public landing page on `emtiaz.om` and application portal on `app.emtiaz.om`, or local dev on both `:5173` and `:8088`), requests from the secondary origin will be rejected by CORS preflight (`OPTIONS`).
  - **Mobile App Traffic**: Native mobile requests (via React Native `fetch`) omit the `Origin` header (or set `Origin: null`), so they bypass browser CORS constraints entirely.

#### 2.2 Backend Security Headers via Helmet (`backend/src/main.ts`)
- **Configuration** (`lines 23–32`):
  ```typescript
  const docsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === '1';
  app.use(
    docsEnabled
      ? helmet({
          contentSecurityPolicy: {
            directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'style-src': ["'self'", "'unsafe-inline'"] },
          },
        })
      : helmet(),
  );
  ```
- **Headers Enforced in Production**:
  - `Content-Security-Policy`: Standard helmet default directives blocking unauthorized inline scripts and external object injection.
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Origin-Agent-Cluster: ?1`
  - `Referrer-Policy: no-referrer`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS active on backend responses)
  - `X-Content-Type-Options: nosniff`
  - `X-DNS-Prefetch-Control: off`
  - `X-Download-Options: noopen`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Permitted-Cross-Domain-Policies: none`
  - `X-XSS-Protection: 0` (modern standard disabling legacy buggy XSS auditors)

#### 2.3 Reverse Proxy Security Headers (`web/Caddyfile`)
- **Configuration** (`lines 1–9`):
  ```caddy
  :80 {
      encode gzip zstd

      header {
          X-Content-Type-Options nosniff
          X-Frame-Options DENY
          Referrer-Policy strict-origin-when-cross-origin
          Permissions-Policy "camera=(), microphone=(), geolocation=()"
      }
      ...
  ```
- **Strengths**:
  - `X-Content-Type-Options: nosniff` prevents MIME-sniffing on static frontend assets.
  - `X-Frame-Options: DENY` protects the entire application from clickjacking.
  - `Referrer-Policy: strict-origin-when-cross-origin` preserves privacy on external navigations.
  - `Permissions-Policy` restricts unused browser hardware APIs (`camera`, `microphone`, `geolocation`).
- **Deficiencies & Gaps**:
  1. **Missing HSTS (`Strict-Transport-Security`)**: `Caddyfile` listens on `:80` (HTTP). In containerized architectures where SSL is terminated at an edge proxy (e.g., Cloudflare Tunnel, AWS ALB, or outer Nginx), Caddy does not add `Strict-Transport-Security`. If the edge proxy does not automatically inject HSTS, client browsers will remain vulnerable to SSL stripping attacks.
  2. **Missing Content Security Policy for Web SPA**: Caddy serves the built React application (`/srv/www`) without any `Content-Security-Policy` header. While API responses are protected by Helmet, the HTML/JS application layer has no CSP restrictions against malicious script execution or rogue asset injection.
  3. **Header Conflict on `/api/*`**: For reverse-proxied API requests, Caddy specifies `X-Frame-Options DENY` while Helmet on the backend specifies `X-Frame-Options SAMEORIGIN`. Depending on proxy header inheritance, downstream clients may receive duplicate or clashing headers.

---

### 3. Secret Leakage & Environment Audit

#### 3.1 Git History & Secret Scanning
- **Repository-Wide Commit History**:
  - Audited all commits using `git log --all --full-history -- "**/.*env*" ".*env*"` and regex pattern searches for AWS/R2 key signatures (`AKIA...`, `R2_SECRET_ACCESS_KEY`, `BETTER_AUTH_SECRET`).
  - **Result**: Zero secret leaks. Only `backend/.env.example` has been committed.
  - `backend/.env` is strictly ignored by `.gitignore` and has never been committed or staged.
  - `backend/.env.example` contains only standard documentation placeholders (`your-cloudflare-account-id`, `super-secret-key-at-least-32-chars`, `password`).

#### 3.2 Client Bundle Leakage
- **Frontend Bundle (`frontend/src`)**:
  - Audited all occurrences of `import.meta.env` and `process.env`.
  - The sole exposed environment variable is `import.meta.env.VITE_API_URL` (`frontend/src/lib/api.ts:164`).
  - No database connection strings, Better-Auth signing secrets, or R2 credentials exist in frontend code or Vite configurations.
- **Mobile Bundle (`mobile/src`, `mobile/app.json`)**:
  - Audited `Constants.expoConfig` and `process.env`.
  - The sole exposed environment variable is `EXPO_PUBLIC_API_URL` (`mobile/src/api.ts:139–143`).
  - `mobile/app.json` contains no secret keys or `extra` parameter dictionaries.

#### 3.3 Container & Compose Configuration Hazards
- **`docker-compose.yml:95` Default Fallback**:
  ```yaml
  BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-change-me-in-production}
  ```
  - *Risk*: If an operator brings up the stack without defining `BETTER_AUTH_SECRET` in their host environment, the API container boots with the known default value `change-me-in-production`. This allows attackers to forge Better-Auth signed session tokens.
- **Database Password Default in Compose**:
  - `POSTGRES_PASSWORD: password` is hardcoded as default in `docker-compose.yml:8, 25, 93`.
- **Missing Startup Secret Validation**:
  - `backend/src/main.ts` does not assert on startup that `BETTER_AUTH_SECRET` is defined, at least 32 characters in length, and distinct from default placeholders before serving traffic.

---

## Remediation Plan & Hardening Recommendations

### 1. Reverse Proxy Hardening (`web/Caddyfile`)
- **Add HSTS Header**:
  Add `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` to the Caddy root `header` block.
- **Add Frontend Content Security Policy (CSP)**:
  Add a strict CSP directive to `web/Caddyfile` for frontend assets:
  ```caddy
  Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ${API_ORIGIN:-http://localhost:3000}; object-src 'none'; frame-ancestors 'none';"
  ```

### 2. Docker Compose Hardening (`docker-compose.yml`)
- **Eliminate Insecure Fallback**:
  Change `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-change-me-in-production}` to:
  ```yaml
  BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET must be set}
  ```
  This causes Docker Compose to abort immediately if the secret is unset rather than silently booting with a compromised token secret.

### 3. Backend Startup Validation (`backend/src/main.ts`)
- **Fail-Fast Secret Guard**:
  Inject a pre-flight assertion during bootstrap:
  ```typescript
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret || authSecret.length < 32 || authSecret.includes('change-me') || authSecret.includes('super-secret')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: BETTER_AUTH_SECRET must be configured with a secure 32+ character random string in production.');
    }
  }
  ```

### 4. Dynamic Multi-Origin CORS Support (`backend/src/main.ts`)
- **Support Comma-Delimited Origins**:
  Support multiple frontends (e.g. landing page + SPA) by parsing comma-delimited origins:
  ```typescript
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });
  ```

### 5. Frontend Zod Dependency Upgrade
- Upgrade `frontend/package.json` from `zod: ^3.25.76` to `zod: ^3.25.77` or align with `zod: ^4.6.7` to eliminate GHSA-mrhx-c7xc-m3w5.
