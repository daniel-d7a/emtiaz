# 03: Student web join with entry code

**What to build:** The student join form accepts an optional entry code alongside the group code. QR join links carry the entry code through login, registration, and the instant-join landing page, so scanning opens the correct group flow.

**Blocked by:** 01.

**Status:** done

- [x] Student dashboard join form sends an optional entry code.
- [x] `/join/:joinCode?entry=CODE` passes the entry code through the onboarding join.
- [x] Quick registration from a QR join link uses the same entry code.
- [x] Missing or wrong entry codes show a clear error.
