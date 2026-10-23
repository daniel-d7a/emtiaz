# ADR-0001: Better Auth over separate JWT/session service

Date: 2026-10-23

## Decision
Use Better Auth (email/password + Drizzle adapter) for authentication and
session management, mounted at `/api/auth` via `toNodeHandler`. Guarded Nest
routes resolve sessions through `auth.api.getSession` in a global `AuthGuard`.

## Rationale
- The spec required email/password auth with roles on the user record, session
  persistence, and a global guard/roles layer. Better Auth covers signup,
  signin, session cookies, and schema integration out of the box.
- Writing a bespoke JWT/session service would duplicate what a library does
  better (password hashing, session rotation, cookie cache).

## Consequences
- Jest needs an ESM transform workaround because better-auth is ESM-only
  (transformIgnorePatterns: [] + isolatedModules).
- Decorator metadata is dropped by tsx (esbuild), so `AuthGuard`/`RolesGuard`
  instantiate `Reflector` directly instead of constructor DI.
- Suspending a user must delete `session` rows; the guard also disables
  better-auth's 5-minute cookie cache to avoid staleness.
