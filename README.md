# Emtiaz — امتياز

A simple cohort-based LMS for Oman: school-curriculum teachers (ACADEMIC) and
freelance skill instructors (GENERAL). Arabic-first (RTL) with an English switch.

## Stack

- **API** `backend/` — NestJS + Drizzle 1 + PostgreSQL + Better Auth (cookie sessions), Redis (optional shared throttling/lockout), S3-compatible object storage (RustFS in dev, Cloudflare R2 in prod)
- **App** `frontend/` — React 18 + Vite 8 + Tailwind v4 + TanStack Router + TanStack Query
- **Landing** `landing/` — static bilingual marketing pages (`/landing/`, `/landing/teachers`), no build step
- **Mobile** `mobile/` — Expo / React Native with role-specific React Navigation stacks (student, teacher, parent)
- **Docs** `docs/` — current architecture, security model, runbooks, and ADRs ([index](docs/README.md))

## Local development

```bash
# 1. dev database (host port 5433)
docker run -d --name emtiaz-pg -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=oman_lms -p 5433:5432 postgres:16-alpine

# 2. backend (reads backend/.env)
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run start:dev
# → http://localhost:3000 (admin: admin@emtiaz.om / admin-password-123)
#
# db:seed also creates a DEMO world (override password with SEED_DEMO_PASSWORD, or skip entirely with SEED_DEMO=0):
#   teachers: salim@teacher.om, fatma@teacher.om   — students: student1@demo.om … student6@demo.om
#   parent: parent1@demo.om (linked to Student 1)
#   password for all demo users: demo-password
#   courses: Physics — Grade 10 (ACADEMIC, 2 groups), English Speaking (GENERAL), Math — Grade 7 (ACADEMIC), IELTS Crash Prep (GENERAL)
#   with groups, lessons, scaffolded progress, and a quiz on the first physics lesson

# 3. frontend (proxies /api → localhost:3000)
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Teacher landing pages: teachers set a slug on /profile → /t/<slug>
# API docs (Swagger UI) are served at /api/docs outside production; set ENABLE_API_DOCS=1 to expose in production

# tests
cd backend && npm test    # uses emtiaz-pg-test on port 5434 (see backend/.env)
cd frontend && npm test
cd mobile && npm run typecheck

# browser smoke test (login → group → lesson → quiz)
# expects a seeded stack running at E2E_BASE_URL (default http://localhost:8088)
cd frontend && npx playwright install --with-deps chromium
cd frontend && npm run test:e2e

# 4. mobile (Expo Go on a phone on the same LAN)
#    - install Expo Go, run the app, scan the QR printed by the terminal
#    - the API URL is derived from Metro's host, so keep the phone and the
#      machine running the backend on the same Wi-Fi and leave the API on :3000
#    - with `--tunnel`, hostUri is the ngrok host (no API there), so expose the
#      API too: cd mobile && npm run dev:tunnel
#      (starts the compose `tunnel` service — cloudflared, no account)
#      (docker compose serves the API on :3100, not :3000)
cd mobile && npm install && npm run dev:tunnel
```

## Deploy (whole stack, dockerized)

```bash
docker compose up -d --build
```

That brings up:

| Service | Port | What it does |
|---|---|---|
| `web` (Caddy) | 8088 | serves the built React app at `/`, landing pages at `/landing/` and `/landing/teachers` (with pricing), proxies `/api/` → the API |
| `api` (Nest) | 3100 | applies migrations, seeds the admin user, then serves on container port 3000 |
| `db` (Postgres) | — | data volume `pgdata`, no host port |
| `redis` | — | shared throttle counters, sign-in lockout, monthly-summary lock; ephemeral |
| `rustfs` | 9200 | local S3-compatible object store; bucket created by `rustfs-init` |

First-run override (recommended in production):

```bash
SEED_ADMIN_PASSWORD='your-strong-password' BETTER_AUTH_SECRET="$(openssl rand -base64 32)" docker compose up -d --build
```

After that everything (grades taxonomy, courses, groups, lessons, quizzes,
gradebook, files) is managed through the app itself; log in as the admin at
`http://<host>:8088/login`.

## Production checklist (when going live)

1. Real [Cloudflare R2](https://r2.cloudflared.com) object storage: set
   `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   in `backend/.env` — see ADR-0002. Locally, docker-compose already runs
   RustFS (S3-compatible) and `docker compose up rustfs-init` creates the
   bucket; `npm run storage:check` verifies the presign→PUT→GET roundtrip.
2. Terminate HTTPS at a reverse proxy in front of port 8088, set
   `FRONTEND_URL=https://your-domain`, and put a 32+ char random
   `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` in the api environment.
   Compose includes Redis and sets `REDIS_URL`; keep it for shared rate
   limits and sign-in lockout when running more than one API replica.
3. Landing pages: serve `landing/` from the real domain, change `APP_URL` in
   `index.html` / `teachers.html` to your app URL, and confirm `/t/<slug>` and
   `sitemap.xml` resolve to the app/API.
4. Mobile: hardcode the production API URL in `mobile/src/api.ts` before
   release builds.
5. Backups: schedule [`scripts/backup.sh`](scripts/backup.sh) and follow
   [`docs/runbook-backups.md`](docs/runbook-backups.md). Redis is ephemeral and
   is not part of the backup.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — current system design
- [`docs/security.md`](docs/security.md) — auth, role matrix, access rules
- [`docs/README.md`](docs/README.md) — full docs and ADR index
- [`master_plan.md`](master_plan.md) — original product brief (historical)
