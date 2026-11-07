# Teacher Plans & Entitlements Specification

**Status:** ready-for-agent

## Problem Statement

Teachers currently have unrestricted access to create groups, enroll unlimited students, and upload unlimited lesson attachments without any subscription model, usage visibility, or administrative billing controls. Emtiaz serves both Oman (`OMR`) and Egypt (`EGP`), students and parents must remain 100% free, only teachers subscribe to plans, and plan upgrades, trials, promo codes, and referral gifts are managed directly by Administration (with WhatsApp upgrade CTAs) while preventing bad-faith users ("griefers") from infinitely stacking free gifts or repeat first-month discounts.

## Solution

Introduce a complete Teacher Plans & Entitlements system across the database, backend API, web app, mobile app, and teacher marketing landing page:

1. **Country & Currency**: Users choose their `Country` (`OM` or `EG`) at signup to govern phone validation and display plan prices in `OMR` or `EGP` when viewing or upgrading plans, while keeping brand copy country-neutral.
2. **Plan Catalog & Subscription Snapshots**: Seed four editable `Plan` tiers (`Free`, `Early Bird`, `Pro`, `Ultimate`). Only `Free` (10 students, 1 GB storage) and `Early Bird` (5 OMR / 300 EGP, 500 students, 100 GB storage, 30-day free trial) are publicly visible at launch, while `Pro`, `Ultimate`, and the yearly discount toggle are controlled by Admin flags. Time-bounded `Teacher Subscription` records snapshot the plan's name, price, currency, and limits so future catalog changes never break grandfathering.
3. **Monthly Active Student & Storage Enforcement + Upgrade Gate**: Calculate `Active Student Count` (unique students across active groups unioned with current-month joins) and `Lesson Storage Usage` (total uploaded lesson attachment bytes across non-deleted courses). When a teacher hits a limit, show the **Upgrade Modal** with a one-time-per-tier **First-Month Limit-Crossing Discount** (`Pro`: `10 → 7 OMR` / `500 → 300 EGP`; `Ultimate`: `25 → 20 OMR` / `1500 → 1000 EGP`) and a pre-filled WhatsApp CTA to Administration. When a teacher's subscription expires while their usage exceeds `Free` limits, lock the teacher into the **Upgrade Gate** screen while allowing enrolled students and linked parents to continue accessing courses and groups normally.
4. **Trials, Promo Codes, Referral Codes & 3-Slot Saved Gifts Inventory**: Allow teachers to redeem Promo Codes and Referral Codes from their Profile or Upgrade Gate. Gifts activate immediately if on `Free`, extend `endsAt` if on the same plan, or save into a deletable **3-slot Saved Gifts** inventory if on a different plan (blocking activation of a lower-tier gift while a higher plan is active with *"You are already on a higher plan"*). Prevent living off gifts by capping unpaid teachers at 1 code total, capping paid teachers at 1 gift activation per paid billing cycle, issuing Referral Codes only to paid teachers (max 10 referrals), unlocking the referrer's reward only after the referred teacher creates a group with at least 4 students, and logging every discount/gift with its occasion in an immutable `Teacher Discount Record` ledger.

## User Stories

1. As a teacher signing up, I want to select my Country (`OM` for Oman or `EG` for Egypt), so that my phone number is validated accurately and plan prices are shown in my local currency (`OMR` or `EGP`).
2. As a new teacher, I want to start on the `Free` Plan by default with up to 10 unique active students and 1 GB of lesson file storage, so that I can try the platform with a small cohort before paying.
3. As a teacher viewing my Profile on web or mobile, I want to see my current Plan name, subscription status (`Active`, `Trial`, `Free`, or `Expired`), expiration date, `Active Student Count` progress bar, and `Lesson Storage Usage` progress bar, so that I always know how much capacity I have left.
4. As a teacher, I want my Plan and usage details on my Profile to be strictly private to me and never shown on my public `/t/<slug>` page, so that students and parents only see my courses and teaching bio.
5. As a teacher on the `Free` Plan who tries to import a 11th unique student, generate an entry code that exceeds my 10-student limit, or reactivate an archived group that pushes me over 10 unique students, I want an Upgrade Modal to pop up explaining that I reached my student limit, so that I know how to upgrade.
6. As a teacher who tries to upload a lesson attachment that would push my total `Lesson Storage Usage` over my Plan's storage limit, I want the upload to be blocked and the Upgrade Modal to appear, so that I can upgrade my storage quota.
7. As a teacher who archives a group with 10 students mid-month and creates a new group in the same calendar month, I want those 10 students from the current calendar month to still count toward my monthly `Active Student Count`, so that plan limits cannot be bypassed by cycling groups.
8. As a teacher who enrolls the same student in three different active groups, I want that student to count as 1 toward my `Active Student Count`, so that I am only billed per unique student.
9. As a student trying to join a group via Join Code when my teacher has already reached their `maxStudents` limit, I want to see a polite message that the group is at capacity and to contact my teacher, while the teacher receives an in-app notification to upgrade.
10. As a teacher who hits the limit of my current Plan (`Free` or `Pro`), I want the Upgrade Modal to offer me a one-time First-Month Limit-Crossing Discount (matching the yearly monthly rate: `7 OMR` / `300 EGP` for `Pro`, `20 OMR` / `1000 EGP` for `Ultimate`) on any higher tier I have never received a limit-crossing discount for before, so that upgrading feels rewarding.
11. As a teacher on the highest available Plan (`Ultimate` or `Early Bird`) who crosses its student or storage limit, I want the Upgrade Modal to prompt me to contact Administration for a Custom Plan.
12. As a teacher clicking "Upgrade" on any Plan in the Upgrade Modal, Teacher Profile, or Upgrade Gate, I want to be redirected to WhatsApp (`supportWhatsapp`) with a pre-filled message containing my name, phone/email, chosen Plan, billing cycle, and price in my currency (`OMR` or `EGP`, including any eligible first-month discount), so that Administration can activate my plan quickly.
13. As a teacher whose paid or trial `Teacher Subscription` expires while my current `Active Student Count` exceeds 10 or my `Lesson Storage Usage` exceeds 1 GB, I want all teacher workspace screens to redirect me to the Upgrade Gate until I upgrade to a Plan that covers my usage, so that I must renew to continue managing my workspace.
14. As a teacher whose paid or trial `Teacher Subscription` expires while my usage is at or below 10 students and 1 GB storage, I want to fall back to the `Free` Plan seamlessly without being locked out, so that I can continue teaching within Free limits.
15. As a student or parent of a student enrolled with a teacher who is currently locked at the Upgrade Gate, I want to continue opening courses, groups, lessons, quizzes, and gradebooks without interruption, so that my learning is never disrupted by a teacher's billing state.
16. As a teacher on an active paid `Teacher Subscription`, I want my snapshotted plan name, price, currency, limits, and expiration date to remain unchanged even if an Admin later increases prices or lowers limits in the Plan catalog, so that my subscription is grandfathered until it expires.
17. As a teacher, I want to enter a Promo Code on my Profile or Upgrade Gate screen to receive free plan days, so that I can redeem marketing or operational offers.
18. As a teacher on `Free` (or expired) who redeems a valid gift or Promo Code, I want the gift Plan to activate immediately starting now for the gift's duration.
19. As a teacher on an active Plan who receives a gift for the exact same Plan, I want my current subscription's `endsAt` date to be extended by the gift's duration (up to 1 gift extension per paid billing period).
20. As a teacher on an active Plan who receives a gift for a different Plan tier, I want the gift to be saved in my 3-slot Saved Gifts inventory on my Profile so that I can activate it once my current Plan ends.
21. As a teacher who already has 3 Saved Gifts in my inventory, I want any additional automatic referral gift to be dropped automatically (and manual Promo Code redemption to inform me my inventory is full), and I want a "Delete" button on each Saved Gift so I can discard a smaller gift to make room.
22. As a teacher currently on a higher Plan (e.g., `Ultimate`) who clicks "Activate" on a lower-tier Saved Gift (e.g., `Pro`), I want to see the message *"You are already on a higher plan"* and have the gift remain saved until my higher plan ends.
23. As a platform operator, I want unpaid teachers to be limited to redeeming at most 1 Promo or Referral code total, and paid teachers to be limited to applying at most 1 gift per paid billing cycle, so that teachers cannot chain free gifts indefinitely without paying.
24. As a teacher who has purchased a paid Plan, I want to receive a unique `Referral Code` on my Profile that I can share with up to 10 other teachers, so that both I and the teachers I invite can earn bonus days.
25. As an unpaid teacher viewing the Referral section on my Profile, I want to see that Referral Codes are an exclusive perk for paid subscribers, so that I have an incentive to upgrade.
26. As a teacher redeeming another teacher's Referral Code (for the first and only time in my account's life), I want to receive my 7-day gift immediately, while the referring teacher receives their 7-day gift automatically once I create a group with at least 4 enrolled students, so that referral rewards cannot be farmed with empty accounts.
27. As an anonymous visitor on `/landing/teachers`, I want to view the currently active public Plans (`Free` and `Early Bird` at launch) with an `OMR / EGP` currency switcher, so that I can see transparent pricing before signing up.
28. As an Admin, I want to edit any Plan's bilingual names, `OMR` and `EGP` monthly and yearly-discounted prices, student/storage/group limits, trial days, and `isPublic` visibility—and toggle the global `yearlyPlanDiscountEnabled` flag and default Referral Gift settings—from the Admin dashboard without deploying code.
29. As an Admin, I want to create, view, and deactivate Promo Codes (`code`, target `Plan`, `durationDays`, `maxUses`, `expiresAt`) from the Admin dashboard.
30. As an Admin viewing a teacher in the Admin Teachers directory, I want to inspect their current `Teacher Subscription` snapshot, live student/storage usage, Saved Gifts, and full `Teacher Discount Record` history (including every occasion and timestamp), and assign them a Paid Subscription or grant them Trial/Gift days (with an optional Admin Override to bypass anti-stacking limits).

## Implementation Decisions

### 1. Schema & Domain Model
- **User Country & Referral Code (`user` table)**:
  - Add `country` enum (`OM` | `EG`, default `OM`) to `user`, set during signup/onboarding and used for phone validation (`+968` vs. `+20`) and currency selection (`OMR` vs. `EGP`).
  - Add nullable unique `referralCode` (`text`) to `user`, generated when a teacher receives their first paid subscription (`source = 'ADMIN_PAID'`).
- **Plan Catalog (`plans` table)**:
  - Columns: `id` (uuid PK), `slug` (unique text: `free`, `early-bird`, `pro`, `ultimate`, or custom), `tierRank` (integer ordering tier hierarchy: `free = 0`, `pro = 10`, `ultimate = 20`, `early-bird = 30`), `nameAr`, `nameEn`, `descriptionAr`, `descriptionEn`, `monthlyPriceOmr`, `yearlyMonthlyPriceOmr`, `monthlyPriceEgp`, `yearlyMonthlyPriceEgp`, `maxStudents` (nullable integer), `maxStorageBytes` (nullable bigint/integer), `maxGroups` (nullable integer), `trialDays` (integer default 0), `isPublic` (boolean), `isDefault` (boolean), `displayOrder` (integer), `createdAt`, `updatedAt`.
  - Seeded rows:
    - `free`: `0 OMR` / `0 EGP`, `maxStudents = 10`, `maxStorageBytes = 1073741824` (1 GB), `maxGroups = null`, `trialDays = 0`, `isPublic = true`, `isDefault = true`, `tierRank = 0`.
    - `early-bird`: `5 OMR` / `300 EGP` monthly (`5 OMR` / `300 EGP` yearly-monthly), `maxStudents = 500`, `maxStorageBytes = 107374182400` (100 GB), `maxGroups = null`, `trialDays = 30`, `isPublic = true`, `isDefault = false`, `tierRank = 30`.
    - `pro`: `10 OMR` (`7 OMR` yearly-monthly) / `500 EGP` (`300 EGP` yearly-monthly), `maxStudents = 50`, `maxStorageBytes = 10737418240` (10 GB), `maxGroups = null`, `trialDays = 0`, `isPublic = false`, `isDefault = false`, `tierRank = 10`.
    - `ultimate`: `25 OMR` (`20 OMR` yearly-monthly) / `1500 EGP` (`1000 EGP` yearly-monthly), `maxStudents = 200`, `maxStorageBytes = 53687091200` (50 GB), `maxGroups = null`, `trialDays = 0`, `isPublic = false`, `isDefault = false`, `tierRank = 20`.
- **Platform Settings (`notification_settings` table)**:
  - Add `yearlyPlanDiscountEnabled` (`boolean`, default `false`), `referralPlanSlug` (`text`, default `'early-bird'`), and `referralGiftDays` (`integer`, default `7`).
- **Teacher Subscriptions (`teacher_subscriptions` table)**:
  - Stores the active and historical subscription snapshots for teachers: `id` (uuid PK), `teacherId` (`user.id` FK), `planId` (`plans.id` FK), `planSlug`, `tierRank`, `planNameAr`, `planNameEn`, `pricePaid` (integer), `currency` (`OMR` | `EGP`), `billingCycle` (`MONTHLY` | `YEARLY` | `TRIAL` | `GIFT`), `maxStudents` (nullable integer), `maxStorageBytes` (nullable bigint), `maxGroups` (nullable integer), `startsAt` (timestamp), `endsAt` (timestamp), `source` (`ADMIN_PAID` | `EARLY_BIRD_TRIAL` | `ADMIN_TRIAL` | `PROMO` | `REFERRAL`), `giftsAppliedInCycle` (integer default 0), `createdAt`.
  - Entitlement resolution: If a teacher has a row with `endsAt > now()`, its snapshotted limits apply. If no row has `endsAt > now()`, the teacher evaluates against the live `free` row in `plans`.
- **Saved Gifts Inventory (`teacher_gifts` table)**:
  - Columns: `id` (uuid PK), `teacherId` (`user.id` FK), `planId` (`plans.id` FK), `planSlug`, `tierRank`, `planNameAr`, `planNameEn`, `durationDays` (integer), `source` (`PROMO` | `REFERRAL_GIVER` | `REFERRAL_TAKER` | `ADMIN_TRIAL`), `sourceRef` (text), `createdAt`.
  - Enforced maximum of 3 rows per `teacherId`.
- **Promo Codes (`promo_codes` table)**:
  - Columns: `id` (uuid PK), `code` (unique uppercase text), `planId` (`plans.id` FK), `durationDays` (integer), `maxUses` (nullable integer), `usedCount` (integer default 0), `expiresAt` (nullable timestamp), `isActive` (boolean default true), `createdAt`.
- **Referrals (`teacher_referrals` table)**:
  - Columns: `id` (uuid PK), `giverTeacherId` (`user.id` FK), `takerTeacherId` (`user.id` unique FK — a teacher can only be referred once), `referralCode` (text), `status` (`PENDING_GROUP` | `REWARDED` | `DROPPED_FULL_INVENTORY`), `rewardedAt` (nullable timestamp), `createdAt`.
  - Enforced maximum of 10 referrals per `giverTeacherId`, no self-referral, and no reciprocal `A ↔ B` referral.
- **Anti-Griefer Discount Ledger (`teacher_discounts` table)**:
  - Immutable log of every discount, trial, promo, or referral reward granted to a teacher: `id` (uuid PK), `teacherId` (`user.id` FK), `occasion` (`LIMIT_CROSS_PRO` | `LIMIT_CROSS_ULTIMATE` | `LIMIT_CROSS_EARLY_BIRD` | `EARLY_BIRD_TRIAL` | `ADMIN_TRIAL` | `PROMO_CODE` | `REFERRAL_GIVER` | `REFERRAL_TAKER`), `planSlug`, `referenceId` (promo code id, referral id, or subscription id), `description`, `createdAt`.

### 2. Usage Calculation, Limit Enforcement & Upgrade Gate
- **`Active Student Count`**: Distinct non-deleted `student_id`s in `group_students` across all non-deleted groups (`groups.deleted_at IS NULL` and `courses.deleted_at IS NULL`) owned by the teacher where `groups.is_active = true`, unioned with distinct `student_id`s who joined (`group_students.joined_at >= date_trunc('month', now())`) any of the teacher's groups during the current calendar month.
- **`Lesson Storage Usage`**: Sum of `lesson_attachments.file_size_bytes` across all non-deleted courses (`courses.deleted_at IS NULL`) owned by the teacher.
- **Enforcement & Upgrade Gate**:
  - **Upgrade Gate (Post-Expiration Lockout)**: Whenever a teacher has no active subscription (`endsAt <= now()`, so they are on `Free`) AND their current `Active Student Count > free.maxStudents` OR `Lesson Storage Usage > free.maxStorageBytes` (or `activeGroupCount > free.maxGroups` when set), their entitlement status is `LOCKED_OVER_LIMIT`. All teacher workspace mutations and dashboard pages redirect/block with `402 Payment Required` (`UPGRADE_GATE_LOCKED`), except viewing their Profile/Entitlements, redeeming a Promo/Referral code, and activating/deleting a Saved Gift. Student and Parent endpoints never check the teacher's lock state and continue serving existing courses, groups, lessons, and quizzes normally.
  - **Action-Level Limit Checks**: Roster import on group creation, generating a group entry code (`activeStudentCount + maxUses > maxStudents`), reactivating an archived group, and uploading a lesson attachment (`usedStorageBytes + fileSizeBytes > maxStorageBytes`) return `402 Payment Required` (`PLAN_LIMIT_REACHED`) with the teacher's usage, available upgrade plans in their currency, and whether they are eligible for the one-time **First-Month Limit-Crossing Discount** on each higher tier (checked by verifying no `LIMIT_CROSS_<PLAN>` row exists for that teacher in `teacher_discounts`).
  - **Student Join Guard**: When a new unique student for that teacher attempts `POST /api/student/groups/join` and `activeStudentCount >= maxStudents`, return `400/409` with a polite capacity message to the student and create an `inbox_notifications` entry for the teacher.
  - **Referral Giver Unlock Hook**: Whenever a student joins a group (or a roster is imported) such that a referred teacher (`teacher_referrals.status = 'PENDING_GROUP'`) now has at least 1 group with `>= 4` students, automatically grant the giver their referral reward (applying it, saving it into `teacher_gifts` if slots `< 3`, or marking `DROPPED_FULL_INVENTORY` if they already have 3 saved gifts, and recording `REFERRAL_GIVER` in `teacher_discounts`).

### 3. API Contracts & Surfaces (`shared/api.ts`, Web, Mobile, Landing)
- **Public API**:
  - `GET /api/public/plans`: Returns public plans (`isPublic = true`), `yearlyPlanDiscountEnabled`, and `supportWhatsapp` for `/landing/teachers` and public pricing views.
- **Teacher API**:
  - `GET /api/teacher/entitlements`: Returns the teacher's active subscription/plan snapshot, `isLockedOut` (Upgrade Gate state), `country` & `currency` (`OMR` | `EGP`), usage (`activeStudentCount`, `usedStorageBytes`, `activeGroupCount`), available upgrade plans (with per-plan `firstMonthDiscountEligible` computed from `teacher_discounts`), `savedGifts` (`0–3`), and `referral` summary (`referralCode` if paid, `usedCount / 10`, referrals list).
  - `POST /api/teacher/entitlements/redeem-code`: Redeems a Promo Code or Referral Code following the anti-stacking and 3-slot Saved Gifts rules.
  - `POST /api/teacher/entitlements/gifts/:id/activate`: Activates a Saved Gift (or returns `400` *"You are already on a higher plan"* / anti-stacking message).
  - `DELETE /api/teacher/entitlements/gifts/:id`: Deletes a Saved Gift from the teacher's inventory.
- **Admin API**:
  - `GET /api/admin/plans`, `POST /api/admin/plans`, `PATCH /api/admin/plans/:id`: Manage plan catalog and visibility.
  - `GET /api/admin/promo-codes`, `POST /api/admin/promo-codes`, `PATCH /api/admin/promo-codes/:id`: Manage promo codes.
  - `GET /api/admin/teachers/:id/entitlements`: View a teacher's subscription snapshot, usage, saved gifts, referrals, and `teacher_discounts` audit ledger.
  - `POST /api/admin/teachers/:id/subscription`: Assign a paid subscription (with optional first-month limit-crossing discount occasion logging and automatic `referralCode` generation).
  - `POST /api/admin/teachers/:id/gift`: Grant trial/gift days to a teacher (with optional `adminOverride` flag).

## Testing Decisions

- **What makes a good test**: Tests must assert observable external behavior through the HTTP API and UI—never mocking internal services or repositories.
- **Primary Seam — Backend HTTP Integration (`backend/src/modules/teacher/teacher.spec.ts`, `admin.spec.ts`, `student.spec.ts`, `public.spec.ts`)**:
  - Verify seeded plans and `GET /api/public/plans` visibility filtering.
  - Verify subscription snapshot grandfathering when an Admin edits a plan's limits or prices in `plans`.
  - Verify `Active Student Count` deduplication across multiple active groups and current-month high-water mark retention when a group is archived mid-month.
  - Verify `PLAN_LIMIT_REACHED` responses on roster import, entry code creation, group reactivation, lesson attachment upload, and student join capacity guard.
  - Verify one-time First-Month Limit-Crossing Discount eligibility and `teacher_discounts` anti-griefer ledger tracking.
  - Verify post-expiration fallback to `Free` and the **Upgrade Gate** lockout when over `Free` limits, while confirming Student and Parent endpoints continue to return `200 OK` on the locked teacher's courses/groups.
  - Verify Promo Code redemption, unpaid-teacher 1-code cap, paid-teacher 1-gift-per-cycle cap, 3-slot `Saved Gifts` inventory (including dropping a 4th automatic gift, deleting a gift, and blocking activation of a lower-tier gift while on a higher plan).
  - Verify paid-only `Referral Code` generation, max 10 referrals cap, immediate taker gift, and automatic giver reward once the taker's group reaches 4 students.
- **Database Constraint Seam (`backend/src/db/schema.spec.ts`)**:
  - Verify unique constraints and check constraints on `plans`, `promo_codes`, and `teacher_referrals`.
- **Frontend & E2E Smoke Seam (`frontend/src/lib/i18n.spec.ts`, `frontend/e2e/smoke.spec.ts`)**:
  - Verify Arabic and English translation parity for all new keys and smoke-test the Teacher Profile Entitlements section, Upgrade Modal, Admin Plans/Promo manager, and `/landing/teachers` plan cards.

## Out of Scope

- **Automated payment gateways**: All upgrades route through the pre-filled WhatsApp CTA to Administration and are activated via the Admin dashboard or Promo/Referral codes.
- **Student or Parent paid plans**: Students and parents are permanently free.
- **Multi-step academic/general curriculum onboarding wizard**: Tracked in its own separate Onboarding & Auth effort (this effort adds the `country` column on `user` and consumes it for currency/phone rules).

## Further Notes

- Recorded in [ADR-0020](../../docs/adr/0020-teacher-plans-and-entitlements.md).
- All decision history is recorded in [Teacher Plans & Entitlements (`wayfinder:map`)](map.md) and its resolved child issues under [`.scratch/teacher-plans/issues/`](issues/).
