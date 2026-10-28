# 35: Billing provider decision

**What to build:** Choose a billing provider and document the decision (ADR), covering Oman/GCC payment methods, teacher plans, the sibling bundle, subscription lifecycle, refunds, and how entitlements map to teachers/students. This is a decision ticket, not the checkout implementation.

**Blocked by:** None (can start immediately).

**Status:** done

## Comments

Decision recorded in `docs/adr/0020-billing-provider.md` and committed in `b03630e`. Thawani hosted checkout, OMR, monthly teacher and family plans, VAT-inclusive pricing, and read-only lapse behavior. Landing and PRODUCT.md updated.

- [x] An ADR names the provider, currency, payment methods, and licensing model.
- [x] Entitlement rules state what a lapsed subscription does to courses, groups, and students.
- [x] Tax/invoice handling for Oman is addressed.
- [x] Landing and product docs are updated to match the decision.
