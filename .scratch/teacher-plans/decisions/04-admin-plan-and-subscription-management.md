# 04: Define Admin Plan Management & Teacher Profile Entitlements View

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Plan Catalog & Subscription Snapshot Model](01-plan-catalog-and-snapshot-model.md), [02: Define Student & Storage Limit Calculation and Upgrade Modal UX](02-limit-calculation-and-enforcement-ux.md), [03: Define Free Trials, Promo Codes & Referral Gifts](03-trials-promo-and-referral-codes.md)

## Question

How do teachers view their plan/usage/codes and how do admins manage plans, teacher subscriptions, and promo codes? Specifically:
1. What exact sections appear on the **Teacher Profile** page (only visible to the teacher: current plan name, expiration/renewal date, student usage bar `X / Y`, storage usage bar `X MB / Y GB`, promo code redemption input, referral code share card, and "Upgrade / View Plans" button)?
2. How does the "Contact Administration" upgrade CTA work (pre-filled WhatsApp message to `supportWhatsapp` with teacher name, email/phone, requested plan, and currency `OMR`/`EGP`)?
3. What controls exist in the **Admin Dashboard** (Plans editor + yearly discount feature flag toggle, Promo Codes manager, and per-teacher subscription assignment / "+N trial days" modal in the Admin Teachers directory)?

## Answer

1. **Teacher Profile Entitlements, Saved Gifts & Referral Card (Web + Mobile)**:
   - Visible only to the authenticated teacher on their Profile page (never on public `/t/<slug>`) and reused on the **Upgrade Gate** screen when locked out:
     - **Current Plan Card**: Active plan name, status badge (`Active` / `Trial` / `Free` / `Expired — Upgrade Required`), expiration date (`endsAt`), and **"Upgrade / View Plans"** button.
     - **Usage Meters**: Progress bars for Monthly Active Students (`activeStudentCount / maxStudents`) and Lesson File Storage (`usedStorageMB / maxStorageGB`).
     - **Redeem Code Input**: Single input accepting either a Promo Code or a Referral Code with clear bilingual feedback.
     - **Saved Gifts Inventory (`0–3` slots)**: Lists each saved gift (`planName`, `+N days`, source) with an **Activate** button (enforcing the higher-plan check and 1-gift-per-paid-cycle rule) and a **Delete** button.
     - **Referral Card**: Paid teachers see their unique `referralCode`, copy/WhatsApp share button, referral count (`X / 10`), and pending vs. unlocked rewards; unpaid teachers see a prompt to upgrade to a paid plan to unlock their referral code.
2. **WhatsApp Upgrade CTA & Public Plans Endpoint**:
   - Clicking **Upgrade** on any plan opens `wa.me/<supportWhatsapp>` with a pre-filled bilingual message including teacher name, phone/email, selected plan (`Early Bird` / `Pro` / `Ultimate` / `Custom Plan`), billing cycle, and price in the teacher's `Country` currency (`OMR` or `EGP`, reflecting any eligible First-Month Limit-Crossing Discount).
   - `GET /api/public/plans` exposes public plans + `yearlyPlanDiscountEnabled` so `/landing/teachers` (with an `OMR / EGP` switcher for anonymous visitors) and in-app plan modals always reflect live Admin-configured plans.
3. **Admin Dashboard Controls**:
   - **Plans & Billing Settings**: Edit any plan's bilingual names, `OMR` & `EGP` monthly/yearly prices, `maxStudents`, `maxStorageBytes`, `trialDays`, and `isPublic` visibility; create custom plans; toggle `yearlyPlanDiscountEnabled`; configure `referralPlanId` and `referralGiftDays`.
   - **Promo Codes Manager**: Create, list, and toggle `isActive` on promo codes (`code`, `planId`, `durationDays`, `maxUses`, `expiresAt`, `usedCount`).
   - **Admin Teachers Directory — Subscription, Gift & Discount Ledger Drawer**: View a teacher's active subscription snapshot, usage meters, Saved Gifts, and full `teacher_discounts` history; assign a **Paid Subscription** (locking the snapshot, optionally recording the First-Month Limit-Crossing Discount, and unlocking the teacher's Referral Code); or grant a **Gift / Trial Days** (with an optional Admin Override checkbox to bypass anti-stacking limits).
