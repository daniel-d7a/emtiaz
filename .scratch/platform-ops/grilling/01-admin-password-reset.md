# 01: Admin Password Reset for Teachers, Students & Parents

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should administrators reset passwords for teachers, students, and parents? Specifically:
1. What is the API endpoint contract (`POST /api/admin/users/:id/reset-password`), what permissions are required (`@RequirePermission('users')`), and does it support auto-generating a secure temporary password vs. accepting a custom one?
2. How is the new password hashed and persisted into the Better-Auth `account` table (`providerId = 'credential'`), and how is `mustChangePassword` enforced on the user's subsequent login?
3. What user notifications are triggered, and how does a user request a reset if they forgot their password?
4. What does the Admin UI look like in `Teachers.tsx`, `Students.tsx`, and `Parents.tsx`?

## Answer

1. **Endpoint Contract & Password Generation**:
   - `POST /api/admin/users/:id/reset-password`, protected by `@RequirePermission('users')`.
   - Body: `{ password?: string }`. If `password` is omitted, system auto-generates a clean 8-character human-friendly temporary password (e.g. `Emtiaz#482`).
   - Returns: `{ success: true, temporaryPassword: string, userId: string, userName: string, userPhone: string | null }`.
2. **Persistence, Forced Change & Auditing**:
   - Hashes the password using Better-Auth credential hasher and updates `account.password` for the user's credential account.
   - Sets `users.mustChangePassword = true`, forcing the user to select their own permanent password upon next login via the existing `ChangePasswordModal`.
   - Audits the event: `admin.audit(adminId, 'user.password.reset', 'user', userId, { forcedChange: true })`.
3. **Forgot Password Flow & User Contact**:
   - On all Login screens (`/login`, `/login/teacher`, `/login/student`, `/login/parent`), clicking "Forgot Password?" (نسيت كلمة المرور؟) opens a modal explaining that password resets are handled by administration, with a one-click WhatsApp button to `supportWhatsapp` pre-filled with the user's identifier (*"مرحباً، أود إعادة تعيين كلمة المرور لحسابي..."*).
4. **Admin UI Modal in Teachers, Students & Parents**:
   - In `Teachers.tsx`, `Students.tsx`, and `Parents.tsx`, add a **"Reset Password" (إعادة تعيين كلمة المرور)** button in the user row actions and drawer.
   - Clicking opens a confirmation modal showing the generated temporary password, a **"Copy Password"** button, and a **"Send via WhatsApp"** button opening `wa.me/<phone>` with pre-filled credentials.
