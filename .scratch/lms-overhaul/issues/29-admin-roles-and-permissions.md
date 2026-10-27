# 29: Admin roles and permissions

**What to build:** Admin-only role management: create roles and assign permissions from Settings. Permissions are enforced on the backend and hidden in the UI when not granted.

**Blocked by:** 21, 27.

**Status:** ready-for-agent

- [ ] Admins can create a role and toggle its permissions.
- [ ] Backend rejects a request whose admin role lacks the permission, even when called directly.
- [ ] UI entries for forbidden actions are hidden, not just disabled.
- [ ] The default admin role retains current access.
- [ ] Role and permission changes are audited.
