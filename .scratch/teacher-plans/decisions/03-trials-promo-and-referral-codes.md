# 03: Define Free Trials, Promo Codes & Referral Gifts

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Plan Catalog & Subscription Snapshot Model](01-plan-catalog-and-snapshot-model.md)

## Question

How do trial days, promo codes, and referral codes grant or extend teacher entitlements? Specifically:
1. How does the `Early Bird` free month and Admin-granted "free trial days" work (is a trial an `endsAt` date on a target Plan like `Early Bird` or `Pro`, and can an Admin add "+N days" to any teacher's current subscription)?
2. How are **Promo Codes** structured and redeemed from the teacher's profile page (code string, target `Plan`, duration in days, global `maxUses`, per-teacher once-only rule, optional expiration date, and what happens if a teacher already has an active paid plan)?
3. How do **Referral Codes** work (does every teacher automatically get a unique referral code on their profile, when can another teacher redeem it, what gift Plan + days do both the referrer and referee receive, and how do we prevent self-referral or farming with empty teacher accounts)?

## Answer

1. **Gift & Trial Application Rules + 3-Slot Saved Gifts Inventory**:
   - **If teacher is on `Free` / expired**: The gift or trial activates immediately (`startsAt = now()`, `endsAt = now() + durationDays`).
   - **If teacher is on the SAME active plan (`currentPlan == giftPlan`)**: Extends `endsAt` by `+durationDays` (subject to the 1-gift-per-paid-cycle limit below).
   - **If teacher is on a DIFFERENT active plan (`currentPlan != giftPlan`)**: The gift is stored in the teacher's **Saved Gifts** inventory (`teacher_gifts` table, max **3 saved gifts** per teacher).
     - Any automatic gift arriving when the teacher already holds 3 saved gifts is dropped automatically; manual promo redemption when holding 3 saved gifts is blocked with a clear message.
     - Teachers can **delete** any saved gift from their inventory to free up a slot.
     - Attempting to activate a saved gift whose plan is lower than the teacher's currently active plan (`currentPlan > giftPlan`) shows *"You are already on a higher plan"*. Once their higher plan ends (or they are on the same/Free plan), they can activate it.
2. **Anti-Stacking ("No Living Off Gifts") Rules**:
   - **Unpaid teachers**: A teacher who has never had a paid subscription (`source = ADMIN_PAID`) can redeem **at most 1 Promo or Referral Taker code total** (plus the 1-time `Early Bird` trial if granted).
   - **Paid teachers**: A teacher can apply/activate **at most 1 gift per paid billing cycle** (tracked against their current paid subscription period in `teacher_discounts`). To activate another saved gift after that one is used, they must complete a new paid billing cycle (Admin direct overrides can explicitly bypass if needed).
3. **Promo Codes (`promo_codes`)**:
   - Fields: `id`, `code` (unique, case-insensitive), `planId`, `durationDays`, `maxUses` (nullable), `usedCount`, `expiresAt` (nullable), `isActive`.
   - Redeemable once per teacher from the Teacher Profile or Upgrade Gate; follows the Gift Application & Anti-Stacking rules above and logs `occasion = PROMO_CODE` in `teacher_discounts`.
4. **Referral Codes (`teacher_referrals`)**:
   - **Only paid teachers** (teachers who have at least one paid subscription record) receive a `referralCode` on their profile.
   - A paid teacher can refer **at most 10 other teachers** lifetime (`maxReferrals = 10`).
   - A taker can redeem at most 1 referral code ever (`REFERRAL_TAKER`), cannot refer themselves or their referrer, and receives their gift (`referralGiftDays = 7` of `referralPlanId`, configurable in Admin settings) immediately upon redemption (following the unpaid-teacher 1-code limit).
   - The giver receives their reward (`REFERRAL_GIVER`) **only after the taker creates at least 1 group with at least 4 enrolled students**, which is then applied or placed into the giver's Saved Gifts inventory (or dropped if their 3-slot inventory is full).
