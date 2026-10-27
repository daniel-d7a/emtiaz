---
name: emtiaz-ui
description: Use when building or changing web UI in this repo — pages, layouts, navigation, forms, dialogs, tables, toasts, RTL/Arabic copy, or design tokens. Encodes DESIGN.md and the working conventions in notes.md so output matches the Emtiaz design system.
---

# Emtiaz web UI

Arabic is the source language and RTL is the default. Read `DESIGN.md` and `PRODUCT.md` first; the app surface **operates**, the landing **persuades**, the public teacher page **reads**.

## Stack

React 18 + Vite + Tailwind v4 + TanStack Router (code-based routes in `frontend/src/router.tsx`) + TanStack Query. No Zustand. Use the primitives in `frontend/src/components/ui/` and export new ones from `ui/index.ts`.

Conventions still to adopt from `notes.md`: `react-hook-form` + zod for every form, `sonner` toasts, `@tanstack/react-table` for directories and gradebook, custom dialogs instead of `window.confirm`.

## Rules

- **Flat system.** No `shadow-*`. Depth comes from 1px `line` borders and tonal fills.
- **One accent.** Terracotta (`secondary`) marks the single attention point; ordinary headings use ink/teal.
- **Type.** 16px body, 18px titles, weights 400/600–700 only, tabular numerals for grades and counts.
- **Every mutation** gets a success/error toast and a pending/disabled state. Destructive actions use a focus-trapped `ConfirmDialog` (Escape, scroll lock, focus return).
- **Icon-only controls** get `aria-label` plus an Arabic/English tooltip.
- **Role pages are separate.** Never one page with role-conditional sections. Build one `AppShell` with per-role sidebars and a mobile bottom nav.
- **i18n.** Add both `ar` and `en` to `frontend/src/lib/i18n.tsx`; never hardcode copy. Mirror layout, chevrons, table order, and dialogs for RTL. Phone/code inputs set `dir="ltr"` on the value only.
- **Motion.** Route fade + accordion animation honour `prefers-reduced-motion`.
- **States.** Loading uses skeletons (not spinners) for page/table loads; empty states name the next action.

## Done when

`npm run typecheck` and `npm test` pass in `frontend/`; `impeccable detect` reports no unexplained findings on changed files; checked at 360 / 768 / 1024 / 1280 in Arabic and English, keyboard-only, reduced motion.
