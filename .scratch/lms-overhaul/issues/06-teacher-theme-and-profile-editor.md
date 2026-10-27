# 06: Teacher theme system and profile editor

**What to build:** Teachers define a theme (layout, colours, banner, scrolling text, Arabic and English fonts) from a full-width, two-column profile editor (account data / public page). The theme persists and is the single source for the public page, teacher dashboard, and student group pages.

**Blocked by:** 03, 04.

**Status:** done

- [x] Profile page is an update flow, not a create flow, split into account and public-page sections.
- [x] Theme fields persist through the API and survive reload.
- [x] A published theme applies to the teacher's public page, dashboard, and the student view of their groups.
- [x] Default theme matches `DESIGN.md`; unknown or missing values fall back safely.

## Comments

- 2026-10-27: Shipped in `91c79fb`. Added `user.landing_theme` JSONB and `user.landing_banner`, banner presign/upload plus published-only banner endpoint, and `TeacherTheme` in the shared contract. `ThemeSurface`/`ThemeHero`/`ThemeStrip` apply layout, colours, fonts, marquee, and banner to the public page, teacher dashboard, and student group view.
- Profile is now an update flow split into account and public-page columns with a live theme preview; banner upload/remove persists immediately.
- Defaults and malformed values fall back to DESIGN.md through `normalizeTheme`; write validation rejects bad colours/fonts. ADR-0017 records the JSONB decision.
- Fresh `db:migrate` + `db:seed` verified on `emtiaz_verify`; demo teacher now has a seeded theme.
- Gates: backend typecheck/build + 99 tests; frontend typecheck/build + 14 tests; mobile typecheck.
- Visual check at all breakpoints still outstanding (impeccable unavailable).
