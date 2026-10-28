# 40: Bilingual Playwright smoke coverage

**What to build:** The existing browser smoke path (login → dashboard → group → lesson → quiz) runs in both Arabic and English, so a language switch cannot silently break navigation, labels, or RTL. Keep the parent and public-teacher smoke tests working.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The student smoke flow passes with the UI in Arabic.
- [ ] The same flow passes with the UI in English.
- [ ] The parent and public-teacher smoke tests still pass in both languages where their assertions are language-dependent.
- [ ] `npm run test:e2e` passes against a seeded stack.
