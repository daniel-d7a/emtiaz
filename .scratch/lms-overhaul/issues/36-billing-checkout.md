# 36: Billing checkout

**What to build:** Wire the chosen provider into checkout for teacher plans and the sibling bundle, with subscription state persisted and entitlements enforced.

**Blocked by:** 35.

**Status:** ready-for-agent

## Comments

Blocked on a Thawani merchant account (`THAWANI_API_KEY`, `THAWANI_PUBLISHABLE_KEY`, `THAWANI_WEBHOOK_SECRET`) and a product decision on the teacher checkout UI. The provider decision is complete in ADR-0020; no checkout code has been written because it cannot be exercised or verified without those credentials.

- [ ] A teacher can complete checkout and the subscription is recorded.
- [ ] Entitlements unlock or restrict the product per the ADR.
- [ ] Webhooks are verified and idempotent.
- [ ] Failed, cancelled, and refunded payments leave correct state.
- [ ] Billing changes are audited and never expose secrets to the client.
