# 03: Student & Storage Limit Enforcement, First-Month Discount & Upgrade Gate

**What to build:** Enforce student and storage limits on teacher and student actions, display the Upgrade Modal with the one-time-per-tier First-Month Limit-Crossing Discount (tracked in `Teacher Discount Record` to prevent griefing), and lock expired teachers whose usage exceeds `Free` limits into the Upgrade Gate while keeping student and parent access uninterrupted.

**Blocked by:** 02: Teacher Subscription Snapshot, Usage Meters & Profile Entitlements View.

**Status:** done

- [x] Roster import on group creation, entry code creation (`activeStudentCount + maxUses > maxStudents`), group reactivation (`isActive: false -> true`), and lesson attachment upload (`usedStorageBytes + fileSizeBytes > maxStorageBytes`) return a structured `PLAN_LIMIT_REACHED` response and open the Upgrade Modal on web and mobile when limits would be exceeded.
- [x] When a new unique student attempts to join a group via Join Code while the teacher is at `maxStudents`, the join is rejected with a polite capacity message to the student and an in-app notification is delivered to the teacher.
- [x] Teachers who cross a limit are offered the one-time First-Month Limit-Crossing Discount (`Pro`: `7 OMR` / `300 EGP`; `Ultimate`: `20 OMR` / `1000 EGP`) on any higher tier for which they do not yet have a `LIMIT_CROSS_<PLAN>` entry in `teacher_discounts`; teachers crossing the highest tier's limit are prompted to contact Administration for a Custom Plan.
- [x] When a teacher's subscription expires (`endsAt <= now()`) while their current `Active Student Count` or `Lesson Storage Usage` exceeds `Free` Plan limits, the teacher enters the **Upgrade Gate**: teacher workspace routes redirect to the Upgrade Gate screen and teacher workspace mutations are blocked until they upgrade to a suitable plan.
- [x] Enrolled students and linked parents continue accessing all courses, groups, lessons, quizzes, and grades normally while their teacher is at the Upgrade Gate.
- [x] Integration tests verify all five limit enforcement points, one-time discount eligibility via `teacher_discounts`, Upgrade Gate lockout for over-limit expired teachers, normal fallback for within-limit expired teachers, and uninterrupted student/parent access.
