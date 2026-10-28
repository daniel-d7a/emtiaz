# 41: Single navigation chrome on course pages

**What to build:** The browse-courses page renders exactly one top bar. Anonymous visitors see the public bar once; signed-in users see the app shell only. No page renders its own copy of the public bar inside the root layout.

**Blocked by:** None (can start immediately).

**Status:** in-progress

- [ ] `/courses` shows one top bar when signed out.
- [ ] `/courses` shows the app shell (no second public bar) when signed in.
- [ ] Other public pages (`/`, `/login`, `/register`, `/join`, `/t/*`) keep their current single bar.
- [ ] No layout shift or double header remains on direct loads and client navigation.
