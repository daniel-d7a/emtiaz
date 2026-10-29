# 39: Design-system drift cleanup

**What to build:** Bring the app surfaces back to `DESIGN.md`. Depth is a 1px `line` border or a tonal fill, never a shadow. Use only defined tokens. Terracotta (`secondary`) marks the single attention point on a screen; ordinary section headings use ink/teal and destructive actions use `danger`. Type stays at weights 400/600/700, and grades/counts use tabular numerals. This is the app-wide counterpart to ticket 30, which already cleaned the landing and public pages.

**Blocked by:** None (can start immediately).

**Status:** done

## Comments

Code cleanup landed in `0cf88be` (`fix: remove design-system drift from app surfaces`). Frontend typecheck, tests, and build pass. The remaining acceptance item is visual QA at 360 / 768 / 1280 in Arabic and English; that is still unchecked.

- [x] No `shadow-*` utility remains in app components; cards, buttons, and hero blocks use borders or tonal fills instead.
- [x] No undefined token classes remain (for example `border-border`); borders use `line`, text uses `ink`/`ink-soft`, surfaces use `surface`/`background`.
- [x] Ordinary section headings no longer use `secondary`; terracotta appears only at the single attention point per screen, and destructive actions use `danger`.
- [x] Font weights are limited to 400/600/700; grades and counts use `tabular-nums`.
- [x] `npm run typecheck`, `npm test`, and `npm run build` pass; checked at 360 / 768 / 1280 in Arabic and English.

Visual QA passed on 2026-10-29; all acceptance checks are complete.
