# ADR-0012: Teacher landing pages use a slug on the main domain

Date: 2026-10-25
Updated: 2026-10-26

## Decision
- Teachers set `landingSlug`, `landingBio`, and `landingPublished` on
  `PATCH /api/me`; the slug is unique, lowercase, and 3-40 chars.
- `GET /api/public/teachers/:slug` (no auth) returns the teacher's public name,
  bio, subject, contact details (`phoneNumber` and real `email`, returning
  `email: null` for synthetic `@phone.emtiaz.om` accounts), avatar/banner URLs,
  theme, and published courses. It never returns join codes, entry codes, or
  groups.
- Web route `/t/$slug` renders that page with a signup CTA.

## Rationale
- A path is enough for a first version: no DNS/TLS work per teacher and no
  wildcard certificates. Subdomains can map to the same resolver later.
- Unpublishing is a single boolean, so a teacher can hide the page without
  losing the link they already shared.
- Filtering in the query (not in the client) keeps drafts and suspended
  teachers off the public API.

## Consequences
- The slug lives in `user`, so changing it breaks old links; there is no
  redirect table yet.
- Avatars are stored as object keys. `GET /api/public/teachers/:slug/avatar`
  redirects to a fresh presigned GET, but only for a published, active teacher;
  the web app's `/api/me/avatar` remains session-scoped.
- `sitemap.xml` lists the app root plus every published teacher slug;
  `robots.txt` disallows `/api/`.
- Per-teacher theming is stored in `user.landing_theme` (see [ADR-0017](./0017-teacher-theme.md)); custom domains are not supported yet.
