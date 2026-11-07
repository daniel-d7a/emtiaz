# 04: Promo Codes, 3-Slot Saved Gifts Inventory & Anti-Stacking Rules

**What to build:** Allow teachers to redeem Promo Codes and manage their 3-slot `Saved Gift` inventory from their Profile and Upgrade Gate on web and mobile, enforcing tier comparison rules and anti-stacking caps so teachers cannot chain gifts indefinitely without paying.

**Blocked by:** 02: Teacher Subscription Snapshot, Usage Meters & Profile Entitlements View.

**Status:** done

- [x] Teachers can redeem an active, non-expired, non-exhausted `Promo Code` at most once from their Profile or Upgrade Gate (logged with `occasion = PROMO_CODE` in `teacher_discounts`).
- [x] Gift application rules: if the teacher is on `Free`/expired, the gift activates immediately (`now() + durationDays`); if on the same active plan, it extends `endsAt` by `+durationDays`; if on a different active plan, it is stored in the teacher's `Saved Gift` inventory (`teacher_gifts`, capped at 3 slots).
- [x] Teachers can view their `0–3` Saved Gifts on their Profile and Upgrade Gate, delete any Saved Gift to free a slot, or click Activate; clicking Activate on a lower-tier gift while a higher plan is active is blocked with *"You are already on a higher plan"*.
- [x] Anti-stacking enforcement: unpaid teachers (no `ADMIN_PAID` subscription history) may redeem at most 1 Promo/Referral code total, and paid teachers may apply/activate at most 1 gift per paid billing cycle.
- [x] Integration tests verify immediate activation on `Free`, same-plan extension, 3-slot Saved Gift storage, full-inventory blocking/dropping, deletion of saved gifts, higher-plan activation rejection, and unpaid/paid anti-stacking limits.
