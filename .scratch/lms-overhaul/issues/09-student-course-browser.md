# 09: Student course browser

**What to build:** A student-facing course catalogue and the same browser on public pages: search by name and filter by teacher, specialization, grade, course type, and semester. Cards use each teacher's theme.

**Blocked by:** 01, 02, 04, 06.

**Status:** done

- [x] Students can search and combine filters; filters apply on the server where possible.
- [x] Public pages offer the same browser without exposing unpublished courses.
- [x] Cards are teacher-themed, show the relevant course data, and link to the detail view.
- [x] Empty and loading states are explicit in both languages.

## Comments

- 2026-10-27: Shipped in `a777862`. Added public `GET /api/public/courses` with SQL filters for search, teacher, teacher specialization, grade, course type, and semester. It only returns published courses from published, active teachers and returns facet options for every filter.
- `/courses` is the public catalogue and `/student/courses` uses the same `CourseBrowser` inside the student shell; student nav gained a Browse courses item and the home latest-courses section links to it.
- Cards are wrapped in `ThemeSurface` so each teacher's colours/fonts apply, show cover, type, teacher, specialization, grade, semester, and description, and link to `/t/<slug>/courses/<id>`.
- Seeded Fatma's public storefront so demo catalogue cards exercise two themes.
- Tests: public spec covers catalogue filtering and unpublished exclusion. Backend 101 tests, frontend 14 tests, all typechecks/builds pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
