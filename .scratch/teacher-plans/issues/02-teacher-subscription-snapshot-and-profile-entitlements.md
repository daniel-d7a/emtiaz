# 02: Teacher Subscription Snapshot, Usage Meters & Profile Entitlements View

**What to build:** Evaluate a teacher's active entitlement from their time-bounded `Teacher Subscription` snapshot (or fall back to the live `Free` Plan when no active subscription exists), compute their monthly `Active Student Count` and `Lesson Storage Usage`, and display the private Entitlements & Plans section on the Teacher Profile across web and mobile with a pre-filled WhatsApp Upgrade CTA.

**Blocked by:** 01: Plan Catalog, Public Plans Endpoint & Teacher Landing Pricing.

**Status:** done

- [x] Active time-bounded `Teacher Subscription` records (`endsAt > now()`) enforce their snapshotted plan name, price, currency, and limits even if the underlying `Plan` catalog row is later edited; teachers with no active subscription (`endsAt <= now()`) evaluate against the live `Free` Plan.
- [x] `Active Student Count` counts distinct non-deleted students enrolled in the teacher's active groups (`isActive = true`, non-deleted group and course) unioned with distinct students who joined any of the teacher's groups during the current calendar month (so archiving a group mid-month does not reset the count, and a student in multiple active groups counts as 1).
- [x] `Lesson Storage Usage` sums `fileSizeBytes` of uploaded lesson attachments across all non-deleted courses owned by the teacher.
- [x] Teacher Profile (web and mobile) displays the teacher's current Plan name, status badge, expiration date, `Active Student Count` progress bar, `Lesson Storage Usage` progress bar, and an Upgrade Modal / WhatsApp CTA priced in the teacher's currency (`OMR` or `EGP`).
- [x] Public teacher storefront (`/t/<slug>`) never exposes plan or usage data to students, parents, or anonymous visitors.
- [x] Integration tests cover snapshot grandfathering, expiration fallback to `Free`, student deduplication across groups, mid-month group archiving retention, and storage byte calculation.
