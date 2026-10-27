# 13: Teacher home, course cards, and navbar

**What to build:** A teacher home with stat cards (curricula, groups, unique students) and full-width course cards carrying type chips, count badges, latest lesson, and a 3-dot menu, split by course type. Opening a card goes to a group list page. Course creation moves to its own page with skill/semester comboboxes. The navbar gets an avatar menu and a click-outside notification panel.

**Blocked by:** 01, 02, 03, 04, 06.

**Status:** done

- [x] Course cards show counts and latest lesson, never the group list; groups open on a dedicated page.
- [x] The groups page shows code, created date, students, progress, days, status, and row actions.
- [x] Course creation is a page, and academic/general taxonomy fields filter existing values while allowing a new shared value.
- [x] Avatar menu links to the public page, profile, and logout; notifications close on outside click and animate.
- [x] Oversized-image errors are a plain Arabic message; CORS works after upload.

## Comments

- 2026-10-27: Shipped in `004c921`. Teacher home now has stat cards (curricula/groups/unique students), full-width course cards split by ACADEMIC/GENERAL with count badges, latest lesson, and a 3-dot menu; the card body opens `/teacher/courses/$courseId/groups` instead of listing groups on the dashboard.
- New `/teacher/courses/new` page uses RHF/zod with native datalist comboboxes for existing grades/skills and semesters, and posts unknown names so the backend resolves or creates shared taxonomy values. New `/teacher/courses/$courseId/groups` page shows code, created date, students, progress, days, status, and open/copy actions.
- Added `groups.days` (migration `20261027081226_red_norman_osborn`) and populated demo groups. `GET /api/teacher/stats`, per-course `latestLesson`, and per-group `progress` back the new home. Better Auth session now exposes `landingSlug`; the avatar menu links to the public teacher page, profile, and logout, and the notification popover closes on outside click and animates.
- Oversized avatar/banner/course images now fail with the Arabic `imageTooLarge` message before upload. `npm run s3:init` also sets bucket CORS so browser PUT uploads work; compose passes `FRONTEND_URL` through.
- Tests: backend 103 pass (new stats, course-name taxonomy resolution, session `landingSlug`), frontend 14 pass, backend/frontend/mobile typechecks pass, builds pass. Docs `architecture.md` and `security.md` updated.
- Visual breakpoint check still outstanding (impeccable unavailable).
