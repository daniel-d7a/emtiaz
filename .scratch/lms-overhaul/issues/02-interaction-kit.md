# 02: Interaction kit

**What to build:** A shared interaction layer: sonner toasts for every mutation, a focus-trapped ConfirmDialog, Dialog/Sheet primitives, IconButton with Arabic/English tooltip and aria-label, Skeleton states, EmptyState, Badge, and StatCard. Every `window.confirm` is replaced.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Success, error, copied, restored, and sent actions all raise dismissing toasts.
- [x] Destructive actions use ConfirmDialog (Escape, focus trap, scroll lock, focus return); no browser confirm remains.
- [x] Icon-only controls have an aria-label plus a tooltip in both languages.
- [x] Page/table/card loads use skeletons; empty states name the next action.
- [x] Badge and StatCard primitives exist and are used by later feature tickets.

## Comments

- 2026-10-27: Shipped in `c731b91`. Added sonner toasts (global mutation-error + action success/copy/send), native `ConfirmDialog`/`Dialog`/`Sheet`, `IconButton`, skeleton `Loading`, `EmptyState`, `Badge`, and `StatCard`; replaced every `window.confirm`.
- Follow-up: admin table empties still use `—`; ticket 21+ can adopt `EmptyState` with filtered-search guidance.
