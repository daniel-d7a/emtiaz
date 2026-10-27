# 07: Teacher public page

**What to build:** The teacher landing page becomes a browsable storefront: full-width course cards split by course type, a type filter, richer per-course data (image, description, preview material/video), a single course page with the teacher theme, and a footer with teacher and platform support contacts.

**Blocked by:** 06.

**Status:** done

- [x] Courses render as full-width themed cards, split by ACADEMIC/GENERAL, with a working type filter.
- [x] Each course has a detail page with its own layout and preview material.
- [x] Footer shows the teacher's contact data and the admin-configured support contact.
- [x] Only published teacher pages are public; unpublished slugs stay unavailable.
- [x] Arabic and English both render; RTL layout is intact.

## Comments

- 2026-10-27: Shipped in `ffd05af`. The public teacher page is now a full-width storefront: courses split into academic/general sections with an All/Academic/General filter, cover images, descriptions, and links.
- Added `/t/<slug>/courses/<id>` backed by a published-only public course endpoint. The detail page uses the teacher theme, course image/description, optional YouTube/Vimeo or external preview, and a module/lesson outline.
- Added course `image` and `preview_url`, teacher-side course editing (title, description, preview URL, cover upload), and support contact fields in admin notification settings.
- Footer shows teacher contact plus platform support email/phone/WhatsApp. Public responses expose contact data but no storage keys.
- Tests: public spec now covers course detail and support payload; admin spec covers support persistence. Backend 99 tests, frontend 14 tests, all typechecks/builds pass.
- Fresh migrate/seed verified; demo courses now include descriptions.
- Visual breakpoint check still outstanding (impeccable unavailable).
