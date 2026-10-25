# ADR-0003: Landing page is a single static HTML file, not Astro

Date: 2026-10-23

## Decision
`landing/index.html` is a self-contained bilingual (ar/en, RTL-first) static
page with zero build step. It is served as `/landing/` by the web Caddy
container and can be opened from disk during development.

## Rationale
- The landing page is one page. Astro's value (content collections, partial
  hydration, multi-page routing) is unused at this size.

## Consequences
- Bilingual text lives in a small inline JS dictionary; toggling swaps text via
  `data-t` keys.
- Revisit if the marketing site grows to multiple pages or needs blog/content
  routing — Astro is the first candidate then.
