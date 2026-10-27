# 03: Forms and data-table foundation

**What to build:** Adopt `react-hook-form` + zod for forms and `@tanstack/react-table` for directories, group lists, and the gradebook. Use shadcn components only where they fit the flat Emtiaz design. Migrate one existing form and one existing table as proof.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A migrated form has zod validation, inline field errors, and a pending/disabled submit state; no manual per-field `useState`.
- [x] A migrated table has sticky header and first column, two-axis scroll, filters, sorting, and pagination.
- [x] New dependencies are installed and typecheck/build pass.
- [x] The patterns are documented in the project UI skill or AGENTS.md for later tickets.

## Comments

- 2026-10-27: Shipped in `35e124e`. Added `react-hook-form` + `zod` + `@tanstack/react-table`; migrated the parent link form and the teacher gradebook (sticky header/first column, two-axis scroll, filter, sort, pagination). Documented both patterns in `.opencode/skills/emtiaz-ui/SKILL.md`.
- Follow-up: gradebook input blur saves without a toast to avoid per-cell noise; errors still raise global toasts.
