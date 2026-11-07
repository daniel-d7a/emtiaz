# 01: Define Plan Catalog & Subscription Snapshot Model

**Type:** grilling
**Status:** resolved
**Blocked by:** None (can start immediately)

## Question

What is the exact schema and lifecycle for `Plan` and `Teacher Subscription`? Specifically:
1. What fields belong on the editable `Plan` catalog table (`Free`, `Early Bird`, `Pro`, `Ultimate` — bilingual names/descriptions, monthly & yearly prices in `OMR` and `EGP`, `maxStudents`, `maxStorageBytes`, `maxGroups`, `trialDays`, `isPublic`, `isDefault`) vs. the snapshotted `Teacher Subscription` record?
2. When an Admin edits a `Plan`'s price or limits in the Admin dashboard, which teachers are affected (only new assignments/renewals vs. current Free-tier teachers)?
3. What happens when a teacher's paid subscription or trial reaches its `endsAt` date (automatic fallback to the `Free` plan snapshot, read-only behavior when over the 10-student / 1 GB Free limit, and grace period if any)?

## Answer

1. **Seeded `plans` catalog table**:
   - Fields: `id`, `slug` (`free`, `early-bird`, `pro`, `ultimate`), `nameAr`, `nameEn`, `descriptionAr`, `descriptionEn`, `monthlyPriceOmr`, `yearlyMonthlyPriceOmr`, `monthlyPriceEgp`, `yearlyMonthlyPriceEgp`, `maxStudents` (nullable), `maxStorageBytes` (nullable), `maxGroups` (nullable), `trialDays` (default 0), `isPublic` (boolean), `isDefault` (boolean), `displayOrder`.
   - Seeded values:
     - `free` (الباقة المجانية / Free): `0 OMR` / `0 EGP`, `maxStudents = 10`, `maxStorageBytes = 1 GB`, `maxGroups = null`, `trialDays = 0`, `isPublic = true`, `isDefault = true`.
     - `early-bird` (باقة الرواد / Early Bird): `5 OMR` / `300 EGP` monthly (`5 OMR` / `300 EGP` yearly-monthly), `maxStudents = 500`, `maxStorageBytes = 100 GB`, `maxGroups = null`, `trialDays = 30`, `isPublic = true`.
     - `pro` (الباقة الاحترافية / Pro): `10 OMR` (`7 OMR` yearly-monthly) / `500 EGP` (`300 EGP` yearly-monthly), `maxStudents = 50`, `maxStorageBytes = 10 GB`, `maxGroups = null`, `trialDays = 0`, `isPublic = false`.
     - `ultimate` (الباقة المتكاملة / Ultimate): `25 OMR` (`20 OMR` yearly-monthly) / `1500 EGP` (`1000 EGP` yearly-monthly), `maxStudents = 200`, `maxStorageBytes = 50 GB`, `maxGroups = null`, `trialDays = 0`, `isPublic = false`.
   - Platform settings (`notification_settings`) adds `yearlyPlanDiscountEnabled: boolean` (default `false`) to toggle the yearly discount UI without code changes.
2. **Teacher Subscription Snapshot & Grandfathering**:
   - `teacher_subscriptions` stores the active entitlement snapshot for a teacher: `planId`, `planSlug`, `planNameAr`, `planNameEn`, `price`, `currency` (`OMR` | `EGP`), `billingCycle` (`MONTHLY` | `YEARLY`), `maxStudents`, `maxStorageBytes`, `maxGroups`, `startsAt`, `endsAt`, `source` (`ADMIN` | `TRIAL` | `PROMO` | `REFERRAL`).
   - Time-bounded subscriptions (`endsAt > now()`) strictly enforce their snapshotted limits and price regardless of subsequent Admin edits to the `plans` table.
   - Teachers on the `Free` tier (no active row or `endsAt <= now()`) evaluate against the live `free` plan row in `plans`, allowing Admin to adjust Free-tier limits globally.
3. **Expiration & Upgrade Gate Lockout**:
   - When `endsAt <= now()`, the teacher automatically falls back to the `Free` plan (`10` students, `1 GB` storage).
   - If the teacher's current student count or storage usage exceeds the `Free` plan limits upon fallback, the teacher enters the **Upgrade Gate**: all teacher workspace routes redirect to the Upgrade / Profile Gate screen (showing usage, plans, Promo Code redemption, and the Contact Admin on WhatsApp CTA) and teacher write/workspace APIs return `402`/`403` until they upgrade to a plan whose limits cover their current usage.
   - Enrolled **students and linked parents continue as normal** with full access to the teacher's existing courses, groups, lessons, and quizzes even while the teacher is at the Upgrade Gate.
