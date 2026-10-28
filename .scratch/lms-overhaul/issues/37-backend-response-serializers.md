# 37: Backend response serializers

**What to build:** Shape API responses through explicit serializers/resources instead of returning raw Drizzle rows, so `shared/api.ts` is the single contract and sensitive fields cannot leak by accident.

**Blocked by:** None (can start immediately).

**Status:** done

## Comments

Completed in `7528704` (`feat: add explicit backend response serializers`). Backend typecheck and 129 tests pass; web and mobile typecheck against the shared contract.

- [x] Each module returns typed response shapes that match `shared/api.ts`.
- [x] Password hashes, tokens, storage keys, and internal-only fields never reach a client.
- [x] Serializers are covered by backend specs.
- [x] Web and mobile clients continue to typecheck against the shared contract.
