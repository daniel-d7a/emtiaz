# 05: Define Auth, Phone Identity, Avatar Roles & Group Join Consistency

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should we close the remaining authentication, phone-identity, storage role, and enrollment logic gaps? Specifically:

1. **Phone Sign-In Lockout (`loginLockoutMiddleware` vs. `/sign-in/phone-number`)**:
   - Should `loginLockoutMiddleware` extract and normalize `req.body.phoneNumber` (via `normalizePhone`) when `req.body.email` is absent so phone sign-in enforces the exact same 5-attempt / 15-minute lockout?
2. **Phone-Only Accounts & Synthetic Email Sync (`<digits>@phone.emtiaz.om`)**:
   - Should `phoneNumber` be required (non-clearable) for all non-Admin users, and whenever `phoneNumber` changes on a user whose email ends with `@phone.emtiaz.om`, automatically update their synthetic email to match the new normalized digits?
3. **Parent Avatar Upload & Cleanup (`StorageController` vs. `ADR-0007` & `docs/security.md`)**:
   - Confirm we should add `'PARENT'` to `@Roles(...)` on `POST /api/storage/avatar` and `DELETE /api/storage/uploaded`.
4. **Bulk-Add Students Role/Deleted Collision (`TeacherService.bulkAddStudents`)**:
   - Should `bulkAddStudents` reject (with a clear 400 error identifying the phone number) any phone number already registered to a non-`STUDENT` or soft-deleted account?
5. **Group Join Notifications & `genJoinCode` Format (`OnboardingService` vs. `StudentService` / `TeacherService`)**:
   - Should `StudentService.joinByCode` trigger the same enrollment notifications as `OnboardingService.joinByCode`, and what is the single canonical generated `joinCode` format?
6. **Student `Monitoring Code` + QR for Parent Linking (`ADR-0011` vs. `ParentService.linkByPhone`)**:
   - What is the exact format and lifecycle for `user.monitoring_code`?

## Answer

1. **Phone Sign-In Lockout Enforced**:
   - `loginLockoutMiddleware` extracts `email` if present, else extracts and normalizes `req.body.phoneNumber` via `normalizePhone` when handling `/api/auth/sign-in/phone-number`.
   - Lockout keys use `login:fail:<normalized-phone>` / `login:lock:<normalized-phone>`, enforcing the same 5-attempt / 15-minute lockout across replicas.
2. **Phone Required & Synthetic Email Kept in Sync**:
   - `phoneNumber` is mandatory and cannot be cleared to `null` for `TEACHER`, `STUDENT`, or `PARENT`.
   - When a user's `phoneNumber` is updated via `PATCH /api/me` or Admin user updates, if their existing `email` matches `<digits>@phone.emtiaz.om`, the system automatically updates their `email` to `<new_digits>@phone.emtiaz.om` so their email credentials remain valid.
3. **Parent Avatar Upload Enabled**:
   - Add `'PARENT'` to `@Roles(...)` on `POST /api/storage/avatar` and `DELETE /api/storage/uploaded` in `StorageController`, aligning code with `ADR-0007` and `docs/security.md`.
4. **Bulk-Add Student Validation**:
   - `TeacherService.bulkAddStudents` verifies that any pre-existing user with the given phone number has `role = 'STUDENT'` and `deletedAt IS NULL`. If the phone belongs to a teacher, parent, admin, or soft-deleted user, the endpoint throws a `400 Bad Request` identifying the conflicting phone number.
5. **Unified Join Notifications & Canonical `joinCode` Format**:
   - `StudentService.joinByCode` calls `notifyEnrolled` (sending in-app and WhatsApp notifications to the student and linked parents) matching `OnboardingService.joinByCode`.
   - Canonical `joinCode` generation is unified across services to 6 characters total: `OM` prefix + 4 random digits (`OM1000`–`OM9999`) per `PRODUCT.md` and `GLOSSARY.md`.
6. **Student Monitoring Code + QR Lifecycle**:
   - Add `monitoring_code` to `users` table: unique 8-character uppercase alphanumeric string generated from `ENTRY_ALPHABET` (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) on student creation.
   - Displayed with a QR code on the web and mobile Student Profile.
   - `POST /api/parent/link` and Parent signup accept `monitoringCode` (resolving the active student with `role = 'STUDENT'` and `deletedAt IS NULL`), replacing `linkByPhone` and closing the phone-enumeration security gap.
