# 06: Admin Plans Editor, Promo Codes Manager & Teacher Subscription/Discount Drawer

**What to build:** Build the Admin dashboard screens and endpoints to edit plans and platform billing settings, create and toggle promo codes, and inspect/manage any teacher's subscription snapshot, Saved Gifts, and immutable `Teacher Discount Record` ledger in the Admin Teachers directory.

**Blocked by:** 03: Student & Storage Limit Enforcement, First-Month Discount & Upgrade Gate, 04: Promo Codes, 3-Slot Saved Gifts Inventory & Anti-Stacking Rules, 05: Paid-Only Teacher Referral Codes & 4-Student Group Unlock.

**Status:** done

- [x] Admin Plans & Billing settings page allows editing any plan's bilingual names/descriptions, `OMR` and `EGP` monthly and yearly-discounted prices, `maxStudents`, `maxStorageBytes`, `maxGroups`, `trialDays`, and `isPublic` visibility, creating custom plans, and toggling `yearlyPlanDiscountEnabled`, `referralPlanSlug`, and `referralGiftDays`.
- [x] Admin Promo Codes manager allows creating, listing, and toggling `isActive` on promo codes (`code`, `planId`, `durationDays`, `maxUses`, `expiresAt`, `usedCount`).
- [x] Admin Teachers directory includes a Subscription, Gifts & Discount Ledger drawer showing the teacher's active snapshot, live student/storage usage, Saved Gifts, and full `teacher_discounts` history (every occasion and timestamp).
- [x] From the teacher drawer, an Admin can assign a Paid Subscription (locking the snapshot in `OMR` or `EGP`, optionally recording a `LIMIT_CROSS_<PLAN>` discount occasion, and generating the teacher's `referralCode`) or grant Trial/Gift days (with an optional Admin Override to bypass anti-stacking limits), with all actions recorded in `audit_logs`.
- [x] Integration and E2E smoke tests verify Admin plan edits, promo code creation, paid subscription assignment, trial grants, and audit logging.
