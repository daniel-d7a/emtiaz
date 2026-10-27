# 18: Roster management

**What to build:** A roster tab with an add-student button that searches by phone number (debounced, minimum 4 digits), a move-student modal, and a revoke-access action that asks for confirmation.

**Blocked by:** 17.

**Status:** done

- [x] Adding a student searches by phone and only runs at 4+ digits, debounced.
- [x] Moving a student opens a modal to pick the destination group.
- [x] Revoke access uses the shared confirm dialog and removes the enrollment.
- [x] No `window.confirm` remains on the roster.
- [x] Roster updates optimistically or refetches after each action.

## Close-out notes

- Phone search normalises punctuation/spaces and is teacher-only.
- The legacy bulk-add card remains for creating new phone-only students; the add button searches existing students.
