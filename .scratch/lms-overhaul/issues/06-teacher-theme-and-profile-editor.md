# 06: Teacher theme system and profile editor

**What to build:** Teachers define a theme (layout, colours, banner, scrolling text, Arabic and English fonts) from a full-width, two-column profile editor (account data / public page). The theme persists and is the single source for the public page, teacher dashboard, and student group pages.

**Blocked by:** 03, 04.

**Status:** ready-for-agent

- [ ] Profile page is an update flow, not a create flow, split into account and public-page sections.
- [ ] Theme fields persist through the API and survive reload.
- [ ] A published theme applies to the teacher's public page, dashboard, and the student view of their groups.
- [ ] Default theme matches `DESIGN.md`; unknown or missing values fall back safely.
