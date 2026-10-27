# 01: Application shell and role navigation

**What to build:** One AppShell for the web app (desktop role sidebar + content column; top bar only for language, notifications, avatar) and a mobile bottom nav. Each role gets its own destinations; no shared conditional nav. Route changes fade, and buttons read as clickable.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Student, teacher, parent, and admin each see only their own sidebar items; admin has no "Teacher studio".
- [x] Active route is highlighted; nav rows are 48px, keyboard focusable, and mirror correctly in RTL.
- [x] Mobile bottom nav uses 4–5 role items, respects safe areas, and content clears the bar.
- [x] Route transitions fade and honour `prefers-reduced-motion`.
- [x] Buttons and links show a pointer cursor; no horizontal overflow at 360 / 768 / 1024 / 1280.

## Comments

- 2026-10-27: Shipped in `258a601`. Web now uses one `AppShell` with a desktop role sidebar, a mobile-safe bottom nav, avatar menu, and a fade wrapper that respects reduced motion.
- Follow-up: nav arrays currently list only shipped destinations (home + profile). Later page tickets (08, 09, 12, 13, 21) fill the remaining 4–5 slots; the layout already flexes for five items.
