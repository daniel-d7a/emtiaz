# Specification: Existing Features Logic & ADR Reconciliation

## Problem Statement

As Emtiaz expanded from initial prototypes toward production launch, contradictions and logic gaps emerged across core features and architecture documentation:
1. **Conflicting Documentation and Billing Claims**: Platform documentation and ADRs still described an automated third-party payment gateway checkout (Thawani) and student-paid subscriptions, whereas the business model is manual Admin fulfillment via WhatsApp, promo codes, and referral codes with permanently free students and parents.
2. **Quiz Scoring Inconsistencies and Attempt Destruction**: Teachers accidentally wiped all student submissions across all groups whenever editing a quiz title or prompt because the system gave no warning. Furthermore, open-ended written questions had inconsistent maximum point rules between grading screens and group analytics, and pending ungraded attempts artificially skewed student grade averages downward.
3. **Misleading Attendance Percentages and Scoping Leakage**: Parents and students saw punishingly low attendance marks (such as 5%) on active courses because attendance was divided by the total lessons in the course curriculum rather than lessons where attendance was actually taken. In addition, lessons and quizzes hidden for a cohort leaked into teacher gradebook and progress calculations, and students enrolled in multiple cohorts could access cohort-restricted attachments in locked groups.
4. **Permanent Cohort Disconnection upon Soft-Delete**: When administrators soft-deleted a student account and later restored it, the student remained permanently detached from all cohorts while their past gradebook scores were left orphaned. Suspended teachers' cohorts remained open for public registration, and archived cohorts allowed active submissions.
5. **Security and Enrollment Vulnerabilities**: Phone sign-in was vulnerable to brute-force credential stuffing because lockout protections only monitored email sign-in routes. Anyone knowing a student's phone number could link to their account and view private grades, phone-only users could accidentally lock themselves out by clearing their phone number, and teachers adding students in bulk could inadvertently attach accounts belonging to teachers or parents.

## Solution

A cohesive platform reconciliation that aligns all system behavior with the domain model and architecture decisions:
1. **Purge Automated Gateway Claims**: All references to automated payment gateways, hosted checkout redirects, and public webhooks are replaced with the manual Admin WhatsApp fulfillment and promo/referral code model across all ADRs and guides.
2. **Defensive Quiz Lifecycle and Unified Grading**: Editing an existing quiz requires confirmation warning the teacher that previous attempts will be cleared. Written questions strictly respect configured point values with manual teacher grading, pending attempts are excluded from grade averages until reviewed, and Student, Parent, and Teacher dashboards calculate grade averages using one unified formula.
3. **Accurate Attendance and Strict Cohort Pacing**: Attendance percentage divides present marks by lessons where attendance was actually recorded for that student in visible lessons. Cohort-hidden lessons and quizzes are excluded from teacher gradebook and statistics, and lesson file downloads strictly enforce group unlock visibility.
4. **Reversible Soft-Deletes and Cohort State Guards**: Soft-deleting a student preserves cohort membership rows while hiding them from active rosters, allowing complete restoration when reactivated. Suspended and soft-deleted teachers have their groups hidden from public registration, and archived groups become read-only for enrolled members while blocking new enrollments and writes.
5. **Hardened Identity and Private Parent Linking**: Phone sign-in enforces the 5-attempt/15-minute account lockout. Phone numbers are mandatory for non-admin accounts and automatically sync synthetic email credentials. Parents link to their children using an 8-character student Monitoring Code and QR code displayed on the Student Profile, closing the phone-enumeration privacy vulnerability. Parents are granted avatar upload permissions, and bulk student imports reject conflicting non-student phone numbers.

## User Stories

### Authentication & Account Security
1. As an account holder signing in with my phone number, I want failed password attempts to trigger a temporary lockout after 5 tries, so that my account is protected against credential stuffing.
2. As a phone-only user, I want my phone number to be permanent and non-clearable in my profile settings, so that I cannot accidentally lock myself out of the application.
3. As a phone-only user, I want my synthetic login email to update automatically whenever my phone number changes, so that my account credentials never become desynchronized.
4. As a parent, I want to upload and update my profile avatar, so that I have the same personalization options as teachers and students without encountering permission errors.
5. As an administrator reviewing the audit log, I want all user restoration and status toggle actions to be accurately attributed, so that platform governance remains accountable.

### Quizzes, Written Grading & Academic Evaluation
6. As a teacher editing an existing quiz, I want to see a clear confirmation warning that saving changes will clear previous student attempts, so that I do not accidentally delete student grades.
7. As a teacher adding a written question to a quiz, I want to assign custom point values that default to 10 points, so that written assessments accurately reflect their relative academic weight.
8. As a teacher grading a written submission, I want the system to validate that my entered score does not exceed the question's maximum point value, so that grading mistakes are prevented.
9. As a teacher reviewing group statistics, I want written questions to be summed using their configured point values, so that the assessment maximum scores and class averages are mathematically correct.
10. As a student submitting a quiz with written questions, I want my score to be marked as pending review without pulling down my overall grade average to 0%, so that my performance record remains representative while waiting for teacher feedback.
11. As a student with multiple quiz attempts, I want the system to highlight my highest graded attempt over any unreviewed pending attempt, so that my confirmed marks are displayed in my gradebook view.
12. As a parent reviewing my child's progress, I want the group grade average to match the exact percentage shown on the student's and teacher's dashboards, so that our family and teachers share a single source of truth.
13. As a student or parent viewing grades, I want unattempted quizzes and unassigned manual grade cells to be treated as not yet graded rather than zero, so that incomplete courses do not artificially deflate grade averages.

### Cohort Pacing, Attendance & Learning Materials
14. As a student attending classes, I want my attendance percentage to divide my attended sessions by the total sessions where attendance was actually recorded, so that unheld future lessons do not count as absences.
15. As a parent monitoring my child's attendance, I want to see a ratio of attended sessions over held sessions, so that I immediately know if my child has missed any conducted classes.
16. As a teacher hiding a lesson or quiz for a specific cohort, I want that item to be excluded from that cohort's gradebook columns, group statistics, and course progress totals, so that the cohort curriculum matches what students see.
17. As a student enrolled in multiple cohorts of the same course, I want to view cohort-specific attachments only in the cohorts where that lesson is unlocked and visible, so that cohort pacing boundaries are respected.
18. As a student transferring between cohorts of the same course, I want my completed lessons and attendance history in that course to carry over, so that I do not lose academic credit.

### Cohort Access, Inactive State & Life-Cycle Governance
19. As a teacher archiving an inactive cohort, I want enrolled students and parents to retain read-only access to their past lessons, notes, and grades, so that their learning records remain accessible.
20. As a teacher archiving an inactive cohort, I want student writes and new enrollments to be blocked until the cohort is reactivated, so that no new activity occurs in a closed cohort.
21. As an administrator restoring a previously soft-deleted student, I want their cohort enrollments, quiz attempts, and manual grades to be restored intact, so that the student resumes their studies seamlessly.
22. As a teacher viewing my cohort roster, attendance sheet, and gradebook, I want soft-deleted accounts to be omitted from the active student list, so that deleted accounts do not clutter day-to-day teaching.
23. As a teacher viewing my cohort roster, I want temporarily suspended students to remain visible in the list, so that I know they are still part of the cohort during a temporary disciplinary hold.
24. As a prospective student entering a group join code, I want the join attempt to be rejected if the course's owning teacher is suspended or deleted, so that students cannot join unmonitored cohorts.
25. As a public visitor browsing a teacher's storefront, I want to see the teacher's phone number and genuine contact email in the footer while internal synthetic emails are omitted, so that prospective students can reach the teacher directly.

### Enrollment & Parent-Child Relationship Management
26. As a student, I want to find a unique 8-character Monitoring Code and scannable QR code on my profile, so that I can easily share it with my parents to link our accounts.
27. As a parent creating an account or linking to a child, I want to enter my child's Monitoring Code or scan their QR code, so that I link securely without exposing my child's phone number to enumeration attacks.
28. As a student joining a cohort using a join code, I want to receive an instant in-app notification confirming my enrollment, so that I know my registration was successful.
29. As a parent, I want to receive an immediate in-app notification when my linked child joins a cohort, so that I stay informed of their educational activities.
30. As a teacher generating cohort join codes, I want all generated codes to follow a consistent 6-character format with an "OM" prefix, so that join codes are simple to share over WhatsApp.
31. As a teacher importing a cohort roster in bulk, I want the system to reject any phone numbers that belong to existing teachers, parents, or deleted accounts, so that role integrity is maintained.

---

## Implementation Decisions

### Architectural & Identity Decisions
- **Payment Gateway Removal**: All references to automated payment gateway checkout, hosted redirects, webhook endpoints, and billing feature flags are removed from the system. Subscriptions are fulfilled directly by Administration via WhatsApp, promo codes, and referral codes.
- **Monitoring Code Entity**: The student identity model is extended with a unique, 8-character alphanumeric `monitoringCode` drawn from an unambiguous character set. This code replaces the student phone number as the sole mechanism for establishing parent-child links.
- **Soft-Delete Invariant**: Soft-deleting a user sets status flags and revocation timestamps while preserving cohort membership rows in place. Directory, roster, and gradebook queries filter against the active user state, enabling full restoration when an account is un-deleted.
- **Phone Number Synchronization**: Non-administrative users require a valid phone number. Updates to phone numbers on synthetic email accounts automatically synchronize the synthetic email identifier to maintain valid credentials.
- **Role Permission Parity**: Storage controllers grant parent roles permission to upload and delete profile avatars alongside teachers, students, and administrators.

### Assessment & Grading Decisions
- **Exclusive-Arc Quizzes**: Quizzes attach to a course, module, or lesson using mutually exclusive database constraints, with multiple ordered quizzes supported per target.
- **Written Assessment Point Modeling**: Written assessment items store configurable point values defaulting to 10 points. Manual grading verifies that submitted marks fall within the range of 0 to the question's maximum point value.
- **Pending Review Isolation**: Attempts containing unreviewed written questions remain flagged as pending and are excluded from numeric grade averages across all user roles until reviewed by the teacher.
- **Best Attempt Hierarchy**: Best score selection resolves the highest-scoring graded attempt first, falling back to the latest pending attempt only when no graded score exists.
- **Canonical Grade Percentage**: A student's grade percentage in a cohort is the sum of best graded quiz scores and non-null manual marks divided by the sum of their maximum possible points. Unattempted items are treated as ungraded.
- **Quiz Edit Warning Interaction**: The quiz builder interface displays a confirmation prompt prior to saving edits on an existing assessment, notifying the teacher that existing student attempts will be cleared.

### Scoping & Cohort Governance Decisions
- **Held-Session Attendance Formula**: Attendance percentages divide attended sessions by the total visible sessions where attendance was recorded for that student in that cohort.
- **Curriculum Filtering**: Lessons and quizzes hidden for a cohort are filtered out of cohort gradebooks, class analytics, and course progress indicators.
- **Attachment Authorization**: Lesson material downloads check the requesting cohort context to ensure that cohort-specific files are accessible only when the lesson is unlocked and visible in that cohort.
- **Inactive Cohort Read-Only State**: Cohorts marked as inactive permit enrolled students and linked parents to view materials and grades in read-only mode, while rejecting write operations and new enrollments.
- **Storefront Privacy Protection**: Public teacher landing endpoints expose real contact details while masking internal synthetic email addresses as null.
- **Standardized Join Codes**: Cohort join codes are standardized to 6-character strings composed of the country prefix followed by four numeric digits.

---

## Testing Decisions

### Test Quality & Principles
- **Behavior Over Implementation**: Tests verify public API responses, status codes, access control guarantees, and database state changes rather than internal service method calls.
- **End-to-End Integrity**: Multi-role scenarios verify that actions taken by one role (such as a teacher grading a quiz or an admin restoring a student) reflect accurately across dependent roles.
- **Failure Visibility**: Security and validation rules (lockouts, invalid monitoring codes, out-of-bounds grades, unauthorized file downloads) are tested with explicit negative assertions.

### Modules Tested
- **Authentication & Security Module**: Verification of phone sign-in lockout counters, lockout window expirations, synthetic email synchronization, and parent avatar upload permissions.
- **Parent & Student Link Module**: Verification of monitoring code generation, code uniqueness, parent linking via code entry and QR payload, and rejection of invalid codes.
- **Quiz & Grading Module**: Verification of written question point limits, pending attempt exclusion from class averages, best attempt ranking, and score recomputation.
- **Attendance & Pacing Module**: Verification of attended-over-marked session percentages, exclusion of hidden curriculum items from gradebook columns, and cohort attachment scoping.
- **Admin Directory & Cohort Governance Module**: Verification of cohort membership preservation through user soft-delete and restore cycles, inactive group write rejections, and storefront email masking.

### Prior Art
- Existing test suites in `backend/src/auth/login-lockout.spec.ts` provide the testing pattern for rate limits and lockouts.
- Existing module specs in `backend/src/modules/teacher/teacher.spec.ts`, `backend/src/modules/parent/parent.spec.ts`, and `backend/src/modules/admin/admin.spec.ts` provide the testing patterns for multi-role workflows and database assertions.

---

## Out of Scope

- **Automated Payment Gateways**: Building or configuring external payment providers (Thawani, Stripe, or local gateways) is permanently out of scope; Emtiaz uses manual Administration fulfillment.
- **Paid Student Subscriptions**: Students and parents are permanently 100% free; only teachers purchase subscription plans.
- **Multi-Step Onboarding Wizard UI**: The full visual onboarding wizard with curriculum selection is tracked in a separate Onboarding & Auth effort; this specification provides the underlying data model, country selection, and phone validation rules.
- **Automated Machine-Grading of Written Answers**: AI or keyword-based automatic grading of open-ended written questions is out of scope; written responses require human teacher evaluation.

---

## Further Notes

- Architecture decisions are recorded in [ADR-0020](../../docs/adr/0020-teacher-plans-and-entitlements.md), [ADR-0021](../../docs/adr/0021-exclusive-arc-quizzes-and-written-grading.md), [ADR-0022](../../docs/adr/0022-group-entry-codes.md), and [ADR-0023](../../docs/adr/0023-soft-delete-and-restore.md).
- Domain language is codified in [GLOSSARY.md](../../GLOSSARY.md).
- Implementation is tracked in vertical slices under `.scratch/logic-and-adr-audit/issues/`.
