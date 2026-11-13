# Emtiaz — agent guide

Arabic-first cohort LMS for Oman. Four surfaces, one product: `backend/` (NestJS + Drizzle + Postgres), `frontend/` (React + Vite + TanStack), `mobile/` (Expo + React Navigation), `landing/` (static bilingual pages). `web/` is only container packaging.

Read `docs/architecture.md` for the system map, `docs/security.md` for access rules, `DESIGN.md` for the design system, and `PRODUCT.md` for product constraints before changing behaviour. `master_plan.md` is historical.

## Commands

```bash
cd backend && npm run typecheck && npm test    # tests need Postgres on :5434 (TEST_DATABASE_URL)
cd backend && npm run db:generate && npm run db:migrate && npm run db:seed
cd backend && npm run start:dev                # :3000
cd frontend && npm run typecheck && npm test && npm run build
cd frontend && npm run dev                     # :5173, proxies /api
cd frontend && npm run test:e2e                # Playwright, expects a seeded stack on :8088
cd mobile && npm run typecheck
cd mobile && npm run dev:tunnel                # Expo Go + compose tunnel
```

## Rules

- **Contract path.** An API change updates `shared/api.ts`, the web client (`frontend/src/lib/api.ts`), and the mobile client (`mobile/src/api.ts`). A response shape lives in exactly one place.
- **Authorization is explicit.** Role never grants access on its own; also check ownership, enrollment, unlock, parent link, and soft-delete/suspension per `docs/security.md`.
- **Arabic is the source.** Both languages in `frontend/src/lib/i18n.tsx`; RTL is the default layout, not a text swap.
- **Docs travel with the change.** Access change → `docs/security.md`; module or relationship → `docs/architecture.md`; structural decision → ADR in `docs/adr/`.
- **Pre-launch means no legacy.** Remove unused columns and dead code; reseed instead of backfilling.
- **SPA Routing on Cloudflare Workers Static Assets.** The frontend is deployed as a Cloudflare Worker with Static Assets (`emtiaz`), NOT legacy Cloudflare Pages. SPA fallback is configured via `"not_found_handling": "single-page-application"` in `wrangler.jsonc` (and `frontend/wrangler.jsonc`). Never put `200` rewrite rules to `/index.html` in `frontend/public/_redirects` (triggers Cloudflare error `100324`), and never add `_worker.js` or `functions/` as those are Pages-only features.

## Agent skills

Project skills live in `.opencode/skills/`: `emtiaz-authz` (access checks), `emtiaz-api` (contract changes), `emtiaz-ui` (web design system), `emtiaz-mobile` (Expo/React Navigation). Use them whenever the task matches their description.

### Issue tracker

Work is tracked as local markdown under `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.
