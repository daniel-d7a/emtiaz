---
name: emtiaz-api
description: Use when adding or changing an API endpoint, Drizzle schema/column, migration, validation schema, or a shared API type in shared/api.ts. Covers the full contract path through the NestJS backend, web client, and mobile client so the three never drift.
---

# Emtiaz API change

One product, four surfaces. A contract change is not done until the backend, `shared/api.ts`, the web client, and the mobile client agree.

## Workflow

1. **Contract first.** Add or change the type in `shared/api.ts`. Both clients import from it; never duplicate a response shape.
2. **Schema.** Edit `backend/src/db/schema.ts`, then `npm run db:generate` followed by `npm run db:migrate` in `backend/`. The product is pre-launch: remove unneeded legacy columns instead of carrying them (reseed with `npm run db:seed`).
3. **Validation.** Add or extend the zod DTO in `backend/src/lib/schemas.ts` and bind it with `ZodBodyPipe` in the controller.
4. **Module.** Controller (`@Roles` / `@Public`) + service. Register a brand-new module in `backend/src/app.module.ts`.
5. **Authorization.** Run the `emtiaz-authz` checklist before writing the query.
6. **Web.** Add the method to the domain object in `frontend/src/lib/api.ts`, declare the query key beside the consuming page (or `frontend/src/lib/session.ts` for session), and prefetch in the route `beforeLoad` where the page needs it.
7. **Mobile.** Add the method to the matching domain object in `mobile/src/api.ts`, declare the query key in the consuming screen, and wire the screen in `mobile/App.tsx`.
8. **Test.** Add to the module's `*.spec.ts` using `backend/src/db/test-helpers.ts` (`getApp`, `seedWorld`, `login`); assert allow and deny.
9. **Docs.** Update `docs/security.md` for access changes and `docs/architecture.md` for a new module or relationship. Write an ADR for a structural decision.

## Commands

```bash
cd backend && npm run typecheck && npm test   # needs Postgres on :5434 (TEST_DATABASE_URL)
cd frontend && npm run typecheck && npm test
cd mobile && npm run typecheck
```

## Done when

The endpoint is exercised by a backend spec; `shared/api.ts`, web, and mobile all compile against it; docs reflect any access or structural change.
