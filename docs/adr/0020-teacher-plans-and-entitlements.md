# ADR-0020: Teacher-only plans, snapshotted subscriptions, and anti-griefer gift ledger

Date: 2026-11-07

Emtiaz serves teachers in both Oman (`OMR`) and Egypt (`EGP`), while students and parents remain 100% free. Upgrades are fulfilled directly by Administration via WhatsApp alongside promo codes, referral codes, and trial days — with no automated payment gateway. We store editable catalog tiers in `plans` (`Free`: 10 students / 1 GB; `Early Bird`: 500 students / 100 GB with 30-day free trial at 5 OMR / 300 EGP; `Pro`: 50 students / 10 GB at 10 OMR / 500 EGP; `Ultimate`: 200 students / 50 GB at 25 OMR / 1500 EGP) and lock active time-bounded entitlements in `teacher_subscriptions` (snapshotting plan name, price, currency, limits, and `ends_at`) so catalog edits never break grandfathering.

## Consequences

- **Monthly active student & storage limits**: Student usage counts distinct non-deleted students in active groups unioned with current-month joins (preventing mid-month group archiving from resetting the count). Storage usage sums `lesson_attachments.file_size_bytes` across non-deleted courses.
- **Upgrade Gate on expiration over Free limits**: When `ends_at <= now()` and usage exceeds `Free` limits, the teacher enters the Upgrade Gate (blocking teacher workspace actions except viewing plans, redeeming codes, or contacting Administration on WhatsApp), while enrolled students and linked parents keep full access.
- **Anti-griefer ledger & 3-slot Saved Gifts**: `teacher_discounts` records every discount/gift by occasion (`LIMIT_CROSS_PRO`, `LIMIT_CROSS_ULTIMATE`, `EARLY_BIRD_TRIAL`, `PROMO_CODE`, `REFERRAL_GIVER`, `REFERRAL_TAKER`) so one-time offers cannot be repeated. Gifts for a different plan tier land in `teacher_gifts` (max 3 slots, lower-tier activation blocked while on a higher plan). Unpaid teachers can redeem at most 1 code total; paid teachers can apply at most 1 gift per paid cycle; only paid teachers receive a referral code (max 10 referrals), and the giver reward unlocks only after the referred teacher has a group with at least 4 students.
