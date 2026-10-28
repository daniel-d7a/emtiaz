# ADR-0016: Pre-launch toolchain baseline

Date: 2026-10-27
Updated: 2026-10-28

## Decision
- Web builds on Vite 8 with Vitest 5 and `@vitejs/plugin-react` 6.
- The backend uses Drizzle ORM and Drizzle Kit `1.0.0-rc.5`, pinned until the v1
  stable line ships. Migrations use the v1 folder layout produced by
  `drizzle-kit up`.
- `drizzle-kit` is the only migrator. The custom count-based migrator is
  removed; `__drizzle_migrations` is owned by the drizzle-kit journal alone.
- `SHORT_ANSWER` is removed from the `question_type` enum. Quizzes support MCQ
  and true/false only.
- The legacy free-text `user.specialization` column is removed; teacher subject
  is `user.subject_category_id`.

## Rationale
- Pre-launch means there is no deployed data to preserve, so obsolete enum
  values and columns are deleted rather than backfilled or shimmed.
- Drizzle v1 is the current migration format; staying on 0.x leaves the project
  on a format the v1 runtime rejects.
- Two migrators sharing one bookkeeping table is a footgun: each sees rows the
  other wrote as foreign and refuses to run. One tool owns the journal.
- Vite 8 is the current web toolchain and cuts build time and bundle size.

## Consequences
- A fresh `db:migrate` + `db:seed` is required; existing dev databases should be
  recreated rather than upgraded in place.
- Drizzle is on a release candidate. Re-check peer APIs and rerun the backend
  suite when moving to stable v1.
- No compatibility layer exists for `SHORT_ANSWER` or `specialization`.
