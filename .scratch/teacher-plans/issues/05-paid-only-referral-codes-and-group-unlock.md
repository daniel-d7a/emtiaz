# 05: Paid-Only Teacher Referral Codes & 4-Student Group Unlock

**What to build:** Issue a unique `Referral Code` exclusively to paid teachers (capped at 10 referrals), allow a referred teacher to redeem at most one referral code for an immediate gift, automatically unlock the referrer's reward once the referred teacher creates a group with at least 4 students, and display the Referral Card on the Teacher Profile across web and mobile.

**Blocked by:** 04: Promo Codes, 3-Slot Saved Gifts Inventory & Anti-Stacking Rules.

**Status:** done

- [x] Teachers receive a unique `referralCode` only once they have at least one paid subscription (`ADMIN_PAID`); unpaid teachers see an upgrade prompt in the Referral Card on their Profile.
- [x] A teacher (`taker`) can redeem at most one referral code in their lifetime (`occasion = REFERRAL_TAKER`), cannot redeem their own code or create a reciprocal `A ↔ B` loop, and a paid teacher (`giver`) can refer at most 10 teachers total.
- [x] On redemption, the taker immediately receives the configured referral gift (`referralGiftDays` of `referralPlanSlug`, following gift and unpaid-teacher rules), and the referral is recorded as `PENDING_GROUP`.
- [x] Once the referred teacher has at least one group with at least 4 enrolled students (via student join or roster import), the giver automatically receives their referral gift (`occasion = REFERRAL_GIVER` in `teacher_discounts` — applied, saved into their 3-slot Saved Gifts inventory, or marked dropped if all 3 slots are full).
- [x] Integration tests verify paid-only code generation, self/reciprocal/10-cap blocks, immediate taker reward, and the 4-student group threshold triggering the giver reward.
