# 40: Bilingual Playwright smoke coverage

**What to build:** The existing browser smoke path (login → dashboard → group → lesson → quiz) runs in both Arabic and English, so a language switch cannot silently break navigation, labels, or RTL. Keep the parent and public-teacher smoke tests working.

**Blocked by:** None (can start immediately).

**Status:** done

## Comments

Coverage added in `f3739ca` (`test: cover bilingual smoke flows`). Verified in Docker with `6 passed`:

```bash
docker run --rm --network host -v "$PWD/frontend:/work" -w /work mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

The host run cannot launch Chromium because `libnspr4.so` is missing and sudo is unavailable.

- [x] The student smoke flow passes with the UI in Arabic.
- [x] The same flow passes with the UI in English.
- [x] The parent and public-teacher smoke tests still pass in both languages where their assertions are language-dependent.
- [x] `npm run test:e2e` passes against a seeded stack.
