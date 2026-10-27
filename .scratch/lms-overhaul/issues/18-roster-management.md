# 18: Roster management

**What to build:** A roster tab with an add-student button that searches by phone number (debounced, minimum 4 digits), a move-student modal, and a revoke-access action that asks for confirmation.

**Blocked by:** 17.

**Status:** ready-for-agent

- [ ] Adding a student searches by phone and only runs at 4+ digits, debounced.
- [ ] Moving a student opens a modal to pick the destination group.
- [ ] Revoke access uses the shared confirm dialog and removes the enrollment.
- [ ] No `window.confirm` remains on the roster.
- [ ] Roster updates optimistically or refetches after each action.
