# Teacher Plans & Entitlements (`wayfinder:map`)

## Destination

Produce `.scratch/teacher-plans/spec.md` and [ADR-0020](../../docs/adr/0020-teacher-plans-and-entitlements.md) covering teacher subscription plans (`Free`, `Early Bird`, `Pro`, `Ultimate`), country-based currency (`OMR` / `EGP`), student and storage limit enforcement, trials, promo codes, referral gifts, teacher profile entitlements view, and admin subscription management.

## Notes

- **Domain**: Teacher Monetization, Plans & Entitlements (students and parents are always 100% free).
- **Skills to consult**: `grilling`, `domain-modeling`, `emtiaz-api`, `emtiaz-authz`, `emtiaz-ui`, `emtiaz-mobile`.
- **Standing preferences**:
  - Platform marketing copy does not lock the brand to a single country; users pick their `Country` (`OM` or `EG`) at signup to validate their phone number and determine plan currency (`OMR` vs. `EGP`).
  - Free plan limit is **10 unique active students and 1 GB of lesson file storage** (not a 1-group cap).
  - All 4 plans (`Free`, `Early Bird`, `Pro`, `Ultimate`) are seeded in DB; only `Free` and `Early Bird` (5 OMR / 300 EGP per month, no limits, 1 free month) are publicly visible at launch, while `Pro`, `Ultimate`, and the yearly discount banner are controlled via Admin settings / feature flags.
  - Purchased/assigned plans snapshot their name, price, currency, limits, and end date on the teacher so future catalog edits never break grandfathering.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Define Plan Catalog & Subscription Snapshot Model](decisions/01-plan-catalog-and-snapshot-model.md): Seed 4 plans (`Free` 10 students/1GB, `Early Bird` 500 students/100GB/30d trial at 5 OMR/300 EGP, `Pro` 50/10GB, `Ultimate` 200/50GB) with `yearlyPlanDiscountEnabled` flag; snapshot time-bounded subscriptions for grandfathering while `Free` reads live catalog; expired teachers over `Free` limits hit an Upgrade Gate while students and parents continue normally.
- [Define Student & Storage Limit Calculation and Upgrade Modal UX](decisions/02-limit-calculation-and-enforcement-ux.md): Count distinct students in active groups unioned with current-month joins; sum `lesson_attachments.file_size_bytes` across non-deleted courses; enforce at roster import, entry code creation, group reactivation, lesson upload, and student join; offer a one-time-per-tier first-month limit-crossing discount (`7 OMR`/`300 EGP` Pro, `20 OMR`/`1000 EGP` Ultimate) tracked by occasion in `teacher_discounts` to prevent griefing.
- [Define Free Trials, Promo Codes & Referral Gifts](decisions/03-trials-promo-and-referral-codes.md): Gifts activate on `Free`, extend on same plan, or save in a deletable max-3 Saved Gifts inventory (blocking lower-plan activation while on a higher plan); unpaid teachers get max 1 promo/referral code and paid teachers get max 1 gift per paid cycle; only paid teachers get referral codes (max 10 referrals) and earn the giver gift once the taker has a group with >=4 students.
- [Define Admin Plan Management & Teacher Profile Entitlements View](decisions/04-admin-plan-and-subscription-management.md): Teacher Profile & Upgrade Gate show plan card, student/storage meters, promo/referral redeem input, 3-slot Saved Gifts manager, and paid-only Referral Card; Upgrade CTAs open pre-filled WhatsApp to `supportWhatsapp` with eligible first-month discount and `GET /api/public/plans` powers `/landing/teachers`; Admin dashboard adds Plans & Billing settings, Promo Codes manager, and per-teacher Subscription/Gift/Discount Ledger drawer.

## Not yet specified

_None — all decision tickets are resolved and the way to the destination is clear._

## Out of scope

- **Automated payment gateways**: Upgrades are triggered via a "Contact Administration" WhatsApp CTA and fulfilled by an Admin or promo/referral code; no automated payment gateway is used.
- **Student or Sibling paid plans**: Students are permanently free; only teachers pay.
- **Multi-step signup/onboarding UI flow**: Tracked in its own separate Onboarding & Auth effort (which supplies the `country` field on `user`).
