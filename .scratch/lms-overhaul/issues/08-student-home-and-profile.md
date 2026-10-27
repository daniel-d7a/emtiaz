# 08: Student home, profile, and navbar

**What to build:** A student home with a greeting, stats (active groups, lessons done, average grade), the 3 latest courses, and recent announcements/notifications. A separate profile page holds name, email, phone, date of birth, optional grade, and image. The navbar matches the shell and shows the student identity.

**Blocked by:** 01, 02, 03, 04, 06.

**Status:** done

- [x] Home shows stats, the 3 latest courses, and announcements; it does not show the full catalogue.
- [x] Profile loads current data, validates input, and updates through the API.
- [x] Navbar shows the signed-in student and clears correctly after logout or a different login.
- [x] RTL and both languages are correct; no raw hex or hardcoded copy.

## Comments

- 2026-10-27: Shipped in `9c64ffe`. Student home now loads `GET /api/student/home` with active groups, completed lessons, average grade, and the three most recently joined courses. Recent inbox items render separately from the existing notifications endpoint.
- Added `user.date_of_birth` (date) and student-only DOB/grade fields to the profile editor, validated by `UpdateMeDto` and persisted through `PATCH /api/me`.
- Student navigation label is now "Home"; the shell avatar menu still shows the signed-in user, and login/logout clear the query cache so identity cannot leak between sessions.
- Tests: student spec covers home stats and profile update/reject/clear. Backend 101 tests, frontend 14 tests, all typechecks/builds pass. Fresh migrate/seed verified.
- Visual breakpoint check still outstanding (impeccable unavailable).
