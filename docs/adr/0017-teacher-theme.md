# ADR-0017: Teacher theme is one JSONB value on the user row

Date: 2026-10-27

## Decision
- `user.landing_theme` stores `{ layout, primary, secondary, marquee, arabicFont,
  englishFont }`; `user.landing_banner` stores the banner object key.
- The web app normalizes the value with `normalizeTheme` and applies it through
  scoped CSS variables in `ThemeSurface`; the public page, teacher dashboard,
  and student group view share the same component.
- Missing or invalid values fall back to the `DESIGN.md` palette and Cairo /
  DM Sans. Writes are validated by `TeacherThemeDto`.

## Rationale
- A theme is read and written as one unit, so a JSONB value avoids six nullable
  columns and keeps the PATCH atomic.
- CSS-variable overrides reuse the existing `text-primary`/`bg-primary` tokens
  instead of adding a second styling system.
- Banner keys stay out of the theme JSON so the public response can expose a
  signed URL without leaking storage keys.

## Consequences
- Server-side filtering by a theme field would need JSONB expressions; no such
  query exists.
- A stored value written outside the API can be malformed; the client
  normalizer keeps rendering safe.
