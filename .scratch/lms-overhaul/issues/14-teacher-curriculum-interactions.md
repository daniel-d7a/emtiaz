# 14: Teacher curriculum interactions

**What to build:** The curriculum page gets animated collapsible units, working reorder controls for units and lessons, inline unit renaming, top stat cards (units, lessons, quizzes), and per-unit counts. Every action gives toast feedback.

**Blocked by:** 02, 03.

**Status:** done

- [x] Unit and lesson reorder controls actually persist the new order.
- [x] Collapsing and expanding units animates without layout jank.
- [x] Unit names are editable inline and save.
- [x] Page and unit headers show correct unit/lesson/quiz counts.
- [x] Success and error toasts appear for every mutation.

## Comments

- 2026-10-27: Shipped in `4677371`. Curriculum now has module/lesson/quiz stat cards, per-unit lesson and quiz counts, animated grid-row accordions (reduced-motion aware, inert when collapsed), inline module rename with `PATCH /api/teacher/modules/:moduleId`, and persisted module/lesson reordering. Reorder, rename, add, save, delete, quiz, and attachment mutations all toast success/error and disable while pending.
- Backend rename checks module existence then course ownership (404 missing, 403 wrong teacher); tests cover rename, deny-by-stranger, and both module and lesson reorder persistence.
- Tests: backend 103 pass, frontend 14 pass, typechecks and builds pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
