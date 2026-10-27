# 02: Interaction kit

**What to build:** A shared interaction layer: sonner toasts for every mutation, a focus-trapped ConfirmDialog, Dialog/Sheet primitives, IconButton with Arabic/English tooltip and aria-label, Skeleton states, EmptyState, Badge, and StatCard. Every `window.confirm` is replaced.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Success, error, copied, restored, and sent actions all raise dismissing toasts.
- [ ] Destructive actions use ConfirmDialog (Escape, focus trap, scroll lock, focus return); no browser confirm remains.
- [ ] Icon-only controls have an aria-label plus a tooltip in both languages.
- [ ] Page/table/card loads use skeletons; empty states name the next action.
- [ ] Badge and StatCard primitives exist and are used by later feature tickets.
