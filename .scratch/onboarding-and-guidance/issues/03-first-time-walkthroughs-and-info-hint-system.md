# 03: First-Time Dashboard Walkthroughs & Dual-Mode (i) Info Hint System

**What to build:** Build the reusable dual-mode `<InfoHint />` component (supporting both a 1-sentence popover and a mini multi-step onboarding modal) across core Teacher, Student, and Parent surfaces, and build the role-specific 3-step Welcome Tour Modal + interactive Getting Started Checklist on Teacher, Student, and Parent dashboards (auto-opened on first visit and re-openable anytime from the header).

**Blocked by:** 01: Country-Scoped Bilingual Grades, 30 General Tracks & Teacher Focus Persistence.

**Status:** done

- [x] `<InfoHint />` component (Web and Mobile) supports both simple 1-sentence mode (`hint="..."`) and multi-step modal mode (`steps={[{ title, body }, ...]}`).
- [x] `<InfoHint />` is wired into Teacher Courses vs. Groups header, Group `requiresEntryCode` & Entry Codes, Group Pacing (`unlockAllByDefault`), Gradebook & Written Grading, Teacher Profile Entitlements & Saved Gifts, Student Join Group by Code, and Parent Link Child.
- [x] First-time Teacher, Student, and Parent dashboard visits (`!onboardingCompletedAt`) auto-open the 3-step Welcome Tour Modal and display the interactive Getting Started Checklist card (Teacher: Create Course → Create Group → Add Students/Entry Codes; Student: Get Code → Join Group → Study & Take Quizzes; Parent: Link Child → Track Progress).
- [x] Completing or dismissing the tour sets `onboardingCompleted: true` via `PATCH /api/me`, and a header button allows re-opening the Platform Guide modal anytime on Web and Mobile.
- [x] Component and integration tests verify `<InfoHint />` modes, tour completion persistence, and Arabic/English translation parity.
