# ADR-0018: Admin roles carry permission sets

Date: 2026-10-28

## Context
`ADMIN` was a single all-or-nothing role. The product needs admins who can run
one area (for example taxonomy) without access to directories, audit history,
or role management. Permissions must be enforced by the API, not just hidden in
the SPA.

## Decision
Keep `user.role = 'ADMIN'` as the entry check, and add `admin_roles` with a
JSONB `permissions` list. `user.admin_role_id` optionally points at a role.

The global `AdminPermissionGuard` runs after `AuthGuard` and `RolesGuard`. It
reads `@RequirePermission(...)` metadata, loads the caller's role permissions,
and returns `403` when none of the required permissions are granted. An admin
with `admin_role_id = NULL` keeps the historical full-access behaviour.

## Rationale
- One extra table and guard avoids duplicating permission checks in services.
- Reusing the existing `user` row (ADR-0015) keeps sessions and audit actors
  unchanged.
- Route metadata is visible next to each endpoint, so a new admin route cannot
  silently inherit access.
- Null-as-full-access makes the migration safe for existing admins.

## Consequences
- Admin permissions are coarse, route-level capabilities, not row-level grants.
  Ownership and other checks still apply where relevant.
- Permission checks cost one extra user lookup and one role lookup per admin
  request. Cache them if this becomes hot.
- The SPA filters navigation and admin settings tabs with the permissions
  returned by `GET /api/admin/permissions`; the API remains the source of truth.
- Role create/update/assignment is audited like other mutating admin actions.
