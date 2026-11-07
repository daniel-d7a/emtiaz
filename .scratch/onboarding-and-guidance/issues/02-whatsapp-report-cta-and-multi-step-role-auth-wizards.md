# 02: Persistent WhatsApp Report Problem CTA & Role-Specific Multi-Step Auth Wizards

**What to build:** Add live per-step email/phone availability validation (`POST /api/onboarding/check-availability`), build the persistent WhatsApp Report Problem / Feedback button wired to Admin `supportWhatsapp` across all onboarding steps and authenticated app chrome, and build the role-tailored Login screens (`/login`, `/login/$role`) and 4-step Signup Wizards (`/register`, `/register/$role`) for Teacher, Student, and Parent on Web and Mobile.

**Blocked by:** 01: Country-Scoped Bilingual Grades, 30 General Tracks & Teacher Focus Persistence.

**Status:** done

- [x] `POST /api/onboarding/check-availability` validates email uniqueness and country-specific phone format + uniqueness before advancing wizard steps.
- [x] Persistent **Report Problem / Feedback (WhatsApp)** button is displayed on every step of Login/Register and in the authenticated Web and Mobile app chrome, opening `wa.me/<supportWhatsapp>` with pre-filled screen and user context.
- [x] `/login` and `/login/$role` (`teacher`, `student`, `parent`) provide role-tailored login tabs and copy with direct links to `/register/$role` (preserving `?join=` and `?entry=`).
- [x] Teacher 4-step wizard (`Step 1: Name, Email, Password` → `Step 2: Country & Phone` → `Step 3: Academic Grades or General Track` → `Step 4: Congratulations`) validates each step and logs the teacher into `/teacher/dashboard`.
- [x] Student and Parent 4-step wizards (`Step 1: Account` → `Step 2: Country & Phone` → `Step 3: Country Grade + optional Group Join Code for Student / optional Child Phone for Parent` → `Step 4: Congratulations`) work end-to-end on Web and Mobile.
- [x] Integration and UI tests verify step availability checks, role registration payloads, and bilingual parity.
