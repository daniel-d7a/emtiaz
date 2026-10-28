# 34: Mobile parent parity

**What to build:** Parents can see each child's groups, progress, attendance, grades, and reports on mobile, and can link or unlink a child by phone number, with the same read-only language as web.

**Blocked by:** 31, 12.

**Status:** done

## Comments

Completed in `a6ab4da` (`feat: complete mobile parent parity`). Mobile is Arabic-only per ADR-0019, so the states use the existing Arabic copy. Mobile typecheck passes.

- [x] Children are listed with progress, attendance, grades, and reports.
- [x] Linking and unlinking by phone number work and confirm before unlinking.
- [x] No action implies the parent can edit grades or content.
- [x] Empty, loading, and error states are localized in both languages.
