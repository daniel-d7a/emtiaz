# 10: Student group page and lesson materials

**What to build:** A themed group page with a course banner, teacher name/link, and units in order with the current unit highlighted. Lessons and quizzes appear as ordered items with locked/done/current badges. A lesson page has a materials sidebar (name, type icon); previewable materials render inline, others open in a new tab.

**Blocked by:** 01, 02, 04, 06.

**Status:** done

- [x] Units are ordered, quizzes sit among lessons, and the current unit is highlighted.
- [x] Locked, done, and current states are visible and match the pacing rules.
- [x] Materials sidebar renders every attachment with the correct type icon.
- [x] Images, PDFs, and embeds preview inline; unsupported types open in a new tab.
- [x] Group cards use badges for status/counts; banner and cards use the teacher theme.
- [x] Layout works at mobile width without horizontal scrolling.

## Comments

- 2026-10-27: Shipped in `e40316b`. Group page now renders ordered units with the current unit highlighted, per-lesson locked/done/current badges, attachment counts, and module quizzes placed after their lessons. The course-level quiz sits after all units.
- Added a dedicated lesson route at `/student/groups/<groupId>/lessons/<lessonId>` with a materials sidebar, type icons, inline previews for images/PDF/video/audio, and new-tab opening for other types. Completion toggling lives on the lesson page.
- Added `GET /api/storage/attachments/<id>/file`, which reuses the download permission checks and 302s to a signed URL so previews work without exposing storage keys. The student lesson view now returns attachment file type/mime type, and curriculum returns the published teacher slug for the teacher link.
- Tests: teacher spec covers the file redirect and attachment metadata; student spec covers the teacher slug. Backend 101 tests, frontend 14 tests, all typechecks/builds pass.
- Visual breakpoint check still outstanding (impeccable unavailable).
