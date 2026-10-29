# 44: Page gutters

**What to build:** Pages use more of the viewport at medium and large widths. Side gutters shrink or disappear at `md`/`lg` and return to generous centered margins only at `xl`. The shared page container is the single place this is controlled.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] At md/lg, page content widens and side gutters shrink or disappear.
- [x] At xl, content is centered with generous gutters.
- [x] No page overflows horizontally at 360 / 768 / 1024 / 1280.
- [x] Admin, teacher, student, parent, and public pages all pick up the change from the shared container.

## Comments

Visual QA passed on 2026-10-29; all acceptance checks are complete.
