# 04: Arabic/English localization and RTL sweep

**What to build:** Complete both-language coverage and genuine RTL across the web app. Localize taxonomy labels (course types, specializations, true/false, question types) and audit chevrons, table column order, sidebar side, dialogs, progress, dates, and phone/code inputs (`dir="ltr"` on the value only). Arabic is the source, not a translation of English.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] No hardcoded UI copy remains on student, teacher, parent, admin, or public pages.
- [x] Course types, specializations, true/false, and question types render in both languages.
- [x] RTL layout mirrors (sidebar, chevrons, tables, dialogs, progress) rather than only swapping text.
- [x] "سلطنة عُمان" is used consistently; dates and numbers render correctly in both directions.

## Comments

- 2026-10-27: Shipped in `9b8b213`. Removed the remaining hardcoded copy, localized taxonomy names via `localizeName`, added locale-aware dates via `formatDateTime`, and localized course types, true/false, question types, CSV headers, dialogs, and language-switch labels. RTL already used logical `start`/`end` utilities; verified no physical-direction classes remain.
- Gates: frontend typecheck, 12 tests, and build pass. Build still reports the pre-existing >500 kB chunk warning.
- `impeccable` CLI remains unavailable, so the visual 360/768/1024/1280 check was not run here.
