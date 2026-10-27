# 36: Billing checkout

**What to build:** Wire the chosen provider into checkout for teacher plans and the sibling bundle, with subscription state persisted and entitlements enforced.

**Blocked by:** 35.

**Status:** ready-for-agent

- [ ] A teacher can complete checkout and the subscription is recorded.
- [ ] Entitlements unlock or restrict the product per the ADR.
- [ ] Webhooks are verified and idempotent.
- [ ] Failed, cancelled, and refunded payments leave correct state.
- [ ] Billing changes are audited and never expose secrets to the client.
