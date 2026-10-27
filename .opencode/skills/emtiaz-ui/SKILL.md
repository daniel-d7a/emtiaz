---
name: emtiaz-ui
description: Use when building or changing web UI in this repo — pages, layouts, navigation, forms, dialogs, tables, toasts, RTL/Arabic copy, or design tokens. Encodes DESIGN.md and the working conventions in notes.md so output matches the Emtiaz design system.
---

# Emtiaz web UI

Arabic is the source language and RTL is the default. Read `DESIGN.md` and `PRODUCT.md` first; the app surface **operates**, the landing **persuades**, the public teacher page **reads**.

## Stack

React 18 + Vite + Tailwind v4 + TanStack Router (code-based routes in `frontend/src/router.tsx`) + TanStack Query. No Zustand. Use the primitives in `frontend/src/components/ui/` and export new ones from `ui/index.ts`.

Forms use `react-hook-form` + zod. Directories and the gradebook use `@tanstack/react-table`. Toasts use `sonner`; destructive actions use `ConfirmDialog`, never `window.confirm`.

## Forms

- Define a zod schema in the component (messages from `t()`), then `useForm({ resolver: zodResolver(schema) })`. No per-field `useState`.
- Spread `register('field')` onto `Input`; pass `error={errors.field?.message}`. Submit through `handleSubmit`, set `type="submit"` and disable while `mutation.isPending`.
- Keep server errors in an `ErrorBox`; the global mutation cache already raises an error toast.

## Tables

- Use `@tanstack/react-table`: `getCoreRowModel`, `getFilteredRowModel`, `getSortedRowModel`, `getPaginationRowModel`.
- Wrap in `Card className="!p-0"` with a `max-h-[70vh] overflow-auto` region for two-axis scroll.
- Make every `th` `sticky top-0`; make the first `th`/`td` `sticky start-0` with an opaque background and `min-w-40`.
- Add a global filter `Input`, clickable sort headers with `aria-sort`, and previous/next pagination.

## Rules

- **Flat system.** No `shadow-*`. Depth comes from 1px `line` borders and tonal fills.
- **One accent.** Terracotta (`secondary`) marks the single attention point; ordinary headings use ink/teal.
- **Type.** 16px body, 18px titles, weights 400/600–700 only, tabular numerals for grades and counts.
- **Every mutation** gets a success/error toast and a pending/disabled state. Destructive actions use a focus-trapped `ConfirmDialog` (Escape, scroll lock, focus return).
- **Icon-only controls** get `aria-label` plus an Arabic/English tooltip.
- **Role pages are separate.** Never one page with role-conditional sections. Build one `AppShell` with per-role sidebars and a mobile bottom nav.
- **i18n.** Add both `ar` and `en` to `frontend/src/lib/i18n.tsx`; never hardcode copy. Mirror layout, chevrons, table order, and dialogs for RTL. Phone/code inputs set `dir="ltr"` on the value only. Taxonomy names use `localizeName`; dates use `formatDateTime` with the active lang, never a forced `dir="ltr"`.
- **Motion.** Route fade + accordion animation honour `prefers-reduced-motion`.
- **States.** Loading uses skeletons (not spinners) for page/table loads; empty states name the next action.

## Done when

`npm run typecheck` and `npm test` pass in `frontend/`; `impeccable detect` reports no unexplained findings on changed files; checked at 360 / 768 / 1024 / 1280 in Arabic and English, keyboard-only, reduced motion.
