# ADR-0012: Teacher landing pages use a slug on the main domain

Date: 2026-10-25

## Decision
- Teachers set `landingSlug`, `landingBio`, and `landingPublished` on
  `PATCH /api/me`; the slug is unique, lowercase, and 3-40 chars.
- `GET /api/public/teachers/:slug` (no auth) returns only the teacher's public
  name, bio, subject, avatar key, and published courses. It never returns email,
  phone, join codes, or groups.
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
- Avatars are stored as object keys. The public page currently receives the key,
  not a signed URL, so it only shows initials until a public avatar route is
  added. (The web app's `/api/me/avatar` is session-scoped.)
- No per-teacher theming or custom domains yet.
