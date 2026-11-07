# 01: Admin Password Reset & Forgot Password WhatsApp Support

**What to build:** Implement `POST /api/admin/users/:id/reset-password` allowing administrators to reset passwords for teachers, students, and parents with auto-generated temporary credentials, updating Better-Auth credential accounts, setting `users.mustChangePassword = true`, and recording an audit log event. Add the "Reset Password" modal to `Teachers.tsx`, `Students.tsx`, and `Parents.tsx` with copy & WhatsApp share buttons. Add a "Forgot Password?" WhatsApp support modal to all login screens.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Add `ResetUserPasswordDto` and `ResetUserPasswordResultDto` to `shared/api.ts`, `frontend/src/lib/api.ts`, and `mobile/src/api.ts`.
- [ ] Implement `POST /api/admin/users/:id/reset-password` in `admin.controller.ts` & `admin.service.ts` with `@RequirePermission('users')`:
  - Auto-generate an 8-character password (`Emtiaz#` + random alphanumeric) if not provided.
  - Hash password and update `account.password` for the user's `credential` provider account.
  - Set `users.mustChangePassword = true`.
  - Record audit log: `admin.audit(adminId, 'user.password.reset', 'user', userId, { forcedChange: true })`.
- [ ] In `Teachers.tsx`, `Students.tsx`, and `Parents.tsx`:
  - Add "Reset Password" (إعادة تعيين كلمة المرور) action to user row actions and detail drawers.
  - Add confirmation modal showing the temporary password with "Copy Password" and "Send via WhatsApp" buttons.
- [ ] On all login screens (`Login.tsx`):
  - Add "Forgot Password?" (نسيت كلمة المرور؟) link opening a modal with a pre-filled WhatsApp link to `supportWhatsapp` (*"مرحباً، أود إعادة تعيين كلمة المرور لحسابي..."*).
- [ ] Write integration tests in `admin.spec.ts` covering password reset, `mustChangePassword` enforcement, and unauthorized access rejection.
