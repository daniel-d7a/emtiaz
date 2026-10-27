# 01: Application shell and role navigation

**What to build:** One AppShell for the web app (desktop role sidebar + content column; top bar only for language, notifications, avatar) and a mobile bottom nav. Each role gets its own destinations; no shared conditional nav. Route changes fade, and buttons read as clickable.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Student, teacher, parent, and admin each see only their own sidebar items; admin has no "Teacher studio".
- [ ] Active route is highlighted; nav rows are 48px, keyboard focusable, and mirror correctly in RTL.
- [ ] Mobile bottom nav uses 4–5 role items, respects safe areas, and content clears the bar.
- [ ] Route transitions fade and honour `prefers-reduced-motion`.
- [ ] Buttons and links show a pointer cursor; no horizontal overflow at 360 / 768 / 1024 / 1280.
