# 37: Backend response serializers

**What to build:** Shape API responses through explicit serializers/resources instead of returning raw Drizzle rows, so `shared/api.ts` is the single contract and sensitive fields cannot leak by accident.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Each module returns typed response shapes that match `shared/api.ts`.
- [ ] Password hashes, tokens, storage keys, and internal-only fields never reach a client.
- [ ] Serializers are covered by backend specs.
- [ ] Web and mobile clients continue to typecheck against the shared contract.
