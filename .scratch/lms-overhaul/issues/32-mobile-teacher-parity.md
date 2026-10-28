# 32: Mobile teacher parity

**What to build:** Teachers can do on mobile what the web teacher surface offers: course cards and group lists, curriculum with reorder and materials, quiz creation, group settings/pacing, roster changes, gradebook, stats, announcements, and profile/theme editing.

**Blocked by:** 31, 13, 14, 15, 16, 17, 18, 19, 20.

**Status:** done

- [x] Teacher home shows the same courses, counts, and latest lesson as web.
- [x] Curriculum, materials, and quiz creation work on a phone.
- [x] Pacing, roster, gradebook, and group stats are usable without horizontal clipping.
- [x] Profile/theme edits persist and match the web public page.
- [x] Every screen handles loading, empty, and error states in both languages.

## Comments

- Mobile UI copy is Arabic-only, matching the mobile foundation ticket (31); the app has no i18n layer. Data values render as stored. Loading, empty, and error states were added to every new teacher screen on that basis.
