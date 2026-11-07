# Platform Operations, Legal & Audit Logging Specification

**Status:** ready-for-agent

## Problem Statement

As Emtiaz nears launch, three operational and compliance foundations are needed:
1. **User Password Recovery & Admin Reset**: When teachers, students, or parents forget their password, there is currently no way for an administrator to reset it or issue temporary credentials, and login screens lack guidance. Users must be able to contact administration directly via WhatsApp, and administrators must be able to reset passwords with temporary credentials and force password changes upon subsequent login.
2. **Legal & Regulatory Compliance**: Educational regulations in Oman and Egypt, along with mobile app store policies, require published Privacy Policy and Terms of Service documents protecting minors, defining parent access rights, clarifying teacher curriculum copyright, and stating subscription cancellation terms. These must be accessible both as static landing pages and in-app routes.
3. **Comprehensive Domain Event Logging**: Administrators need an audit trail of all substantive actions across the LMS (curriculum creation/deletion, quiz attempts, cohort enrollment, attendance marking, homework grading, and billing operations). Currently, only raw mutating HTTP requests and a few manual admin actions are logged. Developers and administrators need a single typed registry of all logged actions with user ID, timestamp, and metadata diffs, plus an Admin Audit dashboard that supports searching by User ID and filtering by category.

## Solution

### 1. Admin Password Reset & WhatsApp Support
- **Backend**:
  - `POST /api/admin/users/:id/reset-password`, protected by `@RequirePermission('users')`.
  - Body: `{ password?: string }`. If `password` is omitted, auto-generates a secure 8-character password (`Emtiaz#` + random alphanumeric).
  - Updates `account.password` for the user's credential account using Better-Auth password hashing.
  - Sets `users.mustChangePassword = true`, forcing the user to choose their own new password upon login.
  - Audits the event: `admin.audit(adminId, 'user.password.reset', 'user', userId, { forcedChange: true })`.
- **Frontend Admin UI**:
  - In `Teachers.tsx`, `Students.tsx`, and `Parents.tsx`, add a **"Reset Password" (إعادة تعيين كلمة المرور)** button in row actions and detail drawers.
  - Renders a modal showing the generated temporary password, a **"Copy Password"** button, and a **"Send via WhatsApp"** button opening `wa.me/<phone>` with pre-filled credentials.
- **Login Screen Guidance**:
  - On `/login`, `/login/teacher`, `/login/student`, and `/login/parent`, clicking "Forgot Password?" (نسيت كلمة المرور؟) opens a modal explaining that password resets are handled by administration, with a pre-filled WhatsApp CTA to `supportWhatsapp`.

### 2. Legal Pages (Privacy Policy & Terms of Service)
- **Static Landing Pages**:
  - `landing/privacy.html` (سياسة الخصوصية) and `landing/terms.html` (شروط الاستخدام) styled with existing design system, SEO tags, and language toggle.
  - Provisions: Minor & student data protection, parent read-only monitoring rights, teacher course copyright, zero-data-selling guarantee, subscription and refund terms, and Cloudflare R2 media storage retention rules.
- **SPA Client Pages**:
  - `/privacy` and `/terms` routes in `frontend/src/routes/` with bilingual translation support.
  - Linked from footers in `landing/index.html`, `landing/teachers.html`, the in-app footer, and multi-step registration forms for all 3 roles.

### 3. Comprehensive Domain Event Logging & Registry
- **Centralized Registry (`shared/audit-events.ts`)**:
  - Defines the typed catalog of all tracked domain actions with category, bilingual labels, target types, and payload schema:
    - **Curriculum**: `course.create`, `course.update`, `course.delete`, `lesson.create`, `lesson.update`, `lesson.delete`.
    - **Quizzes**: `quiz.create`, `quiz.update`, `quiz.delete`, `quiz.submit`.
    - **Cohorts**: `group.create`, `group.update`, `group.delete`, `student.enroll`, `student.remove`, `entry_code.generate`, `attendance.mark`.
    - **Homework**: `homework.create`, `homework.update`, `homework.delete`, `homework.submit`, `homework.grade`, `homework.revision_request`.
    - **Users & Auth**: `user.password.reset`, `user.status`, `user.delete`, `user.restore`.
    - **Billing**: `plan.create`, `plan.update`, `promo_code.create`, `promo_code.update`, `teacher.subscription.assign`, `teacher.gift.grant`.
- **Mandatory User ID & Timestamp**:
  - Every audit log record guarantees `actorId` (non-null user ID), `createdAt` (timestamp), `action` (registered action key), `targetType`, `targetId`, and sanitized payload.
- **Admin Audit Dashboard (`frontend/src/pages/admin/Audit.tsx`)**:
  - **Search by User ID**: Direct input to filter logs by `userId` (actor or target).
  - **Category Filter Dropdown**: `All`, `Curriculum`, `Cohorts`, `Quizzes`, `Homework`, `Users & Billing`, `Auth`.
  - **Color-Coded Action Badges**: Visual distinction between actions.
  - **Detail Modal**: Clickable rows opening a slide-over/dialog to inspect event metadata and diffs.

## User Stories

1. As a student or teacher who forgot my password, I want to click "Forgot Password?" on the login screen to receive a direct WhatsApp link to platform administration with my phone/email pre-filled, so that I can request a password reset.
2. As an administrator reviewing a user's password reset request, I want to click "Reset Password" in the Admin dashboard, generate a temporary password, copy it, or send it directly to their WhatsApp, so that the user can regain access quickly.
3. As a user logging in with an admin-issued temporary password, I want to be immediately prompted to set my own new permanent password, so that my account remains secure.
4. As an administrator, I want every password reset to be recorded in the audit log with the acting admin ID, target user ID, and timestamp, so that all credential changes are fully auditable.
5. As a prospective student, teacher, or parent visiting the platform, I want to view the Privacy Policy and Terms of Service in Arabic or English from the landing page footer or registration forms, so that I understand data privacy and platform rules.
6. As a platform compliance auditor, I want a single typed file (`shared/audit-events.ts`) listing all platform events, their categories, and payload schemas, so that event logging coverage is transparent and maintainable.
7. As an administrator opening the Audit Log, I want to search events by User ID and filter by Category (e.g. Quizzes, Homework, Curriculum, Cohorts), so that I can trace any user's activity or investigate an incident immediately.

## Data Model & Contracts

### 1. Contracts (`shared/api.ts`)
```ts
export interface ResetUserPasswordDto {
  password?: string;
}

export interface ResetUserPasswordResultDto {
  success: boolean;
  temporaryPassword: string;
  userId: string;
  userName: string;
  userPhone: string | null;
}
```

### 2. Audit Registry (`shared/audit-events.ts`)
```ts
export type AuditCategory = 'CURRICULUM' | 'COHORTS' | 'QUIZZES' | 'HOMEWORK' | 'USERS_AUTH' | 'BILLING';

export interface AuditEventDefinition {
  action: string;
  category: AuditCategory;
  nameAr: string;
  nameEn: string;
  targetType: string;
}

export const AUDIT_EVENTS: Record<string, AuditEventDefinition> = { ... };
```

## Verification Plan

1. **Admin Password Reset**:
   - `backend/src/modules/admin/admin.spec.ts`: Test `POST /api/admin/users/:id/reset-password` (auto-generated vs custom password, `mustChangePassword` flag, audit logging, unauthorized user rejection).
   - Component test in `Teachers.spec.tsx` verifying reset modal and copy/WhatsApp actions.
2. **Legal Pages**:
   - Verify static `landing/privacy.html` and `landing/terms.html` render correctly in Arabic and English.
   - Verify SPA routes `/privacy` and `/terms` render properly in React frontend.
3. **Audit Logging & Registry**:
   - Verify `shared/audit-events.ts` compiles and covers all domain events.
   - Test event emissions in curriculum, quiz submission, cohort enrollment, and homework grading.
   - Verify `Audit.tsx` User ID filter and Category dropdown in `frontend/src/pages/admin/Audit.spec.tsx`.
4. **Parity & Typecheck**:
   - `cd backend && npm run typecheck && npm test`
   - `cd frontend && npm run typecheck && npm test && npm run build`
   - `cd mobile && npm run typecheck`
