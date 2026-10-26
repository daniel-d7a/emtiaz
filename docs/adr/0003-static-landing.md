# ADR-0003: Static bilingual landing pages, not Astro

Date: 2026-10-23
Updated: 2026-10-26

## Decision
`landing/` contains self-contained bilingual (ar/en, RTL-first) static pages
with zero build step. `index.html` is the general marketing page and
`teachers.html` targets teachers. They are served under `/landing/` by the web
Caddy container and can be opened from disk during development.

## Rationale
- Two static pages do not need a build step. Astro's value (content
  collections, partial hydration, multi-page routing) is still unused at this
  size.
- Shared styling lives in `landing/styles.css`; both pages keep the inline
  bilingual `data-t` dictionary so they stay build-free.

## Consequences
- Bilingual text lives in a small inline JS dictionary; toggling swaps text via
  `data-t` keys.
- Caddy resolves extensionless page URLs (`{path}`, `{path}.html`,
  `{path}/index.html`, `/index.html`) so `/landing/teachers` works without a
  trailing `.html`.
- Revisit if the marketing site needs blog/content routing or many more pages —
  Astro is the first candidate then.
