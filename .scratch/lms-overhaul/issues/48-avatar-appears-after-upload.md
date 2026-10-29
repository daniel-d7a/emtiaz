# 48: Avatar appears after upload

**What to build:** After a user uploads an avatar, the new image appears immediately in the app shell and navbar, survives a reload, and matches what the teacher's public page shows. The app no longer displays the old image for the session-cache window.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Uploading an avatar updates the navbar/app-shell image without a manual refresh.
- [x] Reloading keeps the new avatar.
- [x] The public teacher page and the app show the same image.
- [x] Removing or replacing an avatar updates everywhere.
- [x] Works for teachers and non-teacher roles that have avatars.

## Comments

Visual QA passed on 2026-10-29; all acceptance checks are complete.
