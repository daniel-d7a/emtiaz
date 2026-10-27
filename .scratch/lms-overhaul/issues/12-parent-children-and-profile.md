# 12: Parent children and profile pages

**What to build:** Separate parent pages: Children and Profile, with no shared student shell. Each child card shows groups, progress, attendance, grades, and delivered reports. Unlinking uses a confirm dialog, and all copy reads as read-only.

**Blocked by:** 01, 02, 03, 04.

**Status:** done

- [x] Parent navigation has Children and Profile as distinct pages.
- [x] Child cards show groups, progress, attendance, grades, and reports.
- [x] Unlink uses the shared confirm dialog and refreshes the list.
- [x] No action implies the parent can edit grades or content.
- [x] Empty state explains how to link a child by phone number.

## Comments

- 2026-10-27: Shipped in `f61bf97`. Parent children now live at `/parent/children` with Children and Profile in the parent navigation, read-only framing, group progress/attendance/average-grade badges, expandable grade detail, delivered monthly reports per child, and an empty state explaining phone-number linking. Unlink still uses the shared confirm dialog and refreshes `['parent-students']`.
- Backend: added `lesson_attendance` and `parent_reports` tables (migration `20261027075830_soft_jane_foster`), parent student payload now includes per-group attendance and average grade plus the latest delivered reports. Monthly summaries store one report per child; the demo seed includes attendance and a delivered report.
- Tests: backend parent spec verifies attendance `1/2 = 50%`, average grade, and delivered report fields. Backend 102 tests, frontend 14 tests, all typechecks/builds pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
