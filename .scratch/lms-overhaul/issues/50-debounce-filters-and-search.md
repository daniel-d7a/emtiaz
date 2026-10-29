# 50: Debounce filters and search

**What to build:** Add a 300ms debounce to text filters and search inputs across the web app so lists do not refetch on every keystroke. Use one shared hook rather than per-page timers.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A shared debounce hook exists and is used by the course browser and admin directory/search filters.
- [ ] Typing in a search or text filter waits 300ms before the query changes.
- [ ] Clearing a filter applies immediately.
- [ ] No duplicate fetches or stale results while typing.
- [ ] Checked in Arabic and English at 360 / 768 / 1280.
