# 09: Implement Student Monitoring Code & QR Parent Linking

**Status:** done
**Blocked by:** None

## What to build

1. **Student Monitoring Code Schema & Generation (`backend/src/db/schema.ts`, `backend/src/lib/group-join.ts`, `backend/src/modules/onboarding/onboarding.service.ts`, `backend/src/modules/teacher/teacher.service.ts`)**:
   - Add `monitoring_code` column to `users` table: `varchar('monitoring_code', { length: 8 }).unique()`.
   - Implement `genMonitoringCode(): string` generating 8-character uppercase strings from `ENTRY_ALPHABET`.
   - Auto-generate `monitoring_code` on creation for any student user (in onboarding, bulk add, seed, etc.).
2. **Student Profile QR & Code Display (`frontend/`, `mobile/`, `shared/api.ts`)**:
   - Include `monitoringCode` in `StudentProfile` / `GetMeResponse`.
   - On Student Profile page (`/profile` and mobile equivalent), render the student's unique 8-character code and a scannable QR code encoding the monitoring code.
3. **Parent Linking by Monitoring Code (`backend/src/modules/parent/parent.service.ts`, `backend/src/modules/parent/parent.controller.ts`, `frontend/`, `mobile/`)**:
   - Change `POST /api/parent/link` payload to `{ monitoringCode: string }` (discontinue `studentPhone`).
   - Look up the student strictly by `monitoring_code` (and verify role is `STUDENT` and `deletedAt IS NULL`).
   - Update Parent signup and parent link dialogs in web and mobile to take the 8-character monitoring code (with camera QR scan on mobile).
4. **Mask Synthetic Emails on Public Storefront (`backend/src/modules/public/public.controller.ts`)**:
   - In `PublicController.publicTeacher`, return `email: null` if `teacher.email` ends with `@phone.emtiaz.om`.

## Acceptance Criteria
- Every student has a unique 8-character `monitoringCode`.
- Parents link to children exclusively via student `monitoringCode` or QR scan; phone possession alone cannot link.
- Student profile displays both code and QR.
- Public storefront at `/t/:slug` hides synthetic `@phone.emtiaz.om` emails.

## Resolution
- Added `monitoring_code` column (`varchar(8).unique()`) to `users` table with drizzle migration `20261107040853_sharp_fat_cobra`.
- Added `ENTRY_ALPHABET`, `genMonitoringCode()`, and `generateUniqueMonitoringCode()` to `backend/src/lib/group-join.ts`.
- Auto-generate unique 8-character monitoring code for students during onboarding signup, bulk student creation by teachers, and test/seed fixtures.
- Updated `serializeUser` to output `monitoringCode` and added `monitoringCode` to `User`, `GetMeResponse`, and `StudentProfile` in `shared/api.ts`, `frontend/src/lib/api.ts`, and `mobile/src/api.ts`.
- Replaced `studentPhone` with `monitoringCode` across `ParentLinkDto`, `ParentSignupDto`, `CreateParentDto`, `ParentController.link`, `ParentService.resolveStudentByCode`, `ParentService.linkByCode`, and `OnboardingService.createParent`.
- Student Profile displays the 8-character monitoring code and rendered scannable QR code on both web (`frontend/src/pages/Profile.tsx`) and mobile (`mobile/src/screens/Profile.tsx`).
- Parent linking dialogs and onboarding flows on web (`Children.tsx`, `Register.tsx`, `Parents.tsx`) and mobile (`ParentHome.tsx`) now link exclusively by student monitoring code, with live camera QR scanning support on mobile via `expo-camera`.
- Public storefront in `backend/src/modules/public/public.controller.ts` masks synthetic emails ending with `@phone.emtiaz.om` as `null`.
- All backend tests (18 test suites, 197 tests), frontend unit tests (19 tests), and TypeScript typechecks across backend, frontend, and mobile pass cleanly.
