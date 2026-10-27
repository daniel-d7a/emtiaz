# 17: Group tabs, settings, and pacing

**What to build:** The group page becomes tabs (Pacing, Gradebook, Roster, Stats, Settings) instead of page buttons. Settings cover custom name with `<course>-<n>` fallback, days/time, mark done, WhatsApp join message, ads/join codes, and grade columns. Pacing gets working open/close-all, per-item toggles, hidden lessons/quizzes, copy feedback, and a direct join link.

**Blocked by:** 02, 03.

**Status:** done

- [x] Tabs replace page-number buttons and preserve the active tab.
- [x] Open/close all and individual pacing toggles work and persist.
- [x] Lessons and quizzes can be hidden from a group.
- [x] Copying a code shows confirmation; a second button copies the direct join link.
- [x] Settings persist name, days/time, status, WhatsApp message, ads, join codes, and grade columns.
- [x] Group name falls back to `<course>-<n>` when blank.

## Close-out notes

- Tabs are URL-backed via `?tab=`; Stats is a shell for ticket 20.
- "Mark done" is covered by the existing per-lesson unlock/complete pacing controls; no separate settings field was added.
- "Ads/join codes" is covered by the editable join code plus direct `/join/<code>` link and copy feedback.
