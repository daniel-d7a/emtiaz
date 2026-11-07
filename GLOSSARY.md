# Emtiaz

Arabic-first cohort LMS where teachers build a master course curriculum once, run independent student cohorts (groups) from it, and give parents read-only visibility into their children's progress.

## Language

### Core Curriculum & Cohorts

**Course**:
A teacher's master curriculum (modules, lessons, materials, and quizzes), classified as either academic (tied to a grade and semester) or general (tied to a specialization category).
_Avoid_: Class, subject, program

**Course Focus**:
A teacher's primary teaching mode chosen during onboarding (`ACADEMIC` for school-curriculum courses tied to country-specific Grades, or `GENERAL` for skill/subject tracks tied to Categories), used to default their course creation flow.
_Avoid_: Teacher type, mode

**Grade**:
A bilingual (`nameAr`, `nameEn`), country-scoped (`OM` for Oman or `EG` for Egypt) school level used to classify academic courses and student grade levels.
_Avoid_: Class year, level

**Category (Track)**:
A bilingual (`nameAr`, `nameEn`) skill or subject area (seeded with 30 entries such as English, German, Programming) used to classify general courses and teacher specializations.
_Avoid_: Tag, department

**Group**:
A single cohort of students studying a Course with its own join code, pacing, attendance, and gradebook.
_Avoid_: Cohort, batch, section, classroom

**Join Code**:
A group's public code that identifies which Group a student is joining.
_Avoid_: Invite code, class code

**Entry Code**:
A teacher-generated, usage-capped secret code required alongside the Join Code when a Group restricts open enrollment.
_Avoid_: Access token, voucher, passkey

**Monitoring Code**:
A unique code and QR code belonging to a student that a parent enters or scans to link to that child and view their progress, attendance, grades, and monthly reports.
_Avoid_: Parent invite code, family token

### Subscriptions & Entitlements

**Country**:
A user's market (Oman or Egypt), chosen at signup to validate their phone number, seed academic grades, and select their pricing currency (`OMR` vs. `EGP`) when viewing or purchasing a Plan. Marketing copy stays country-neutral.
_Avoid_: Region, locale, market

**Plan**:
A subscription tier (`Free`, `Early Bird`, `Pro`, `Ultimate`, or custom) that defines a teacher's maximum active students and lesson storage quota. Students and parents never pay or hold a Plan.
_Avoid_: Subscription tier, package, membership

**Teacher Subscription**:
The snapshot of the Plan currently active on a teacher's account, locking in the plan name, price, currency, limits, and expiration date so future catalog edits do not affect existing subscribers. When expired, the teacher falls back to the live `Free` Plan.
_Avoid_: Billing account, license

**Upgrade Gate**:
The lock state shown to a teacher whose subscription has expired while their current student count or storage usage exceeds the `Free` Plan limits. It blocks teacher workspace actions while allowing the teacher to view plans, redeem a promo code, or contact Administration on WhatsApp; enrolled students and linked parents continue accessing existing courses and groups normally.
_Avoid_: Suspension, account ban

**Active Student Count**:
The number of unique non-deleted students enrolled across a teacher's currently active Groups, unioned with any distinct students who joined any of the teacher's Groups during the current calendar month.
_Avoid_: Seat count, total enrollments

**Lesson Storage Usage**:
The total byte size of uploaded lesson files across all non-deleted Courses owned by a teacher (excluding external links, avatars, banners, and quiz images).
_Avoid_: Disk quota, bucket usage

**Teacher Discount Record**:
An immutable audit entry attached to a teacher recording every discount, trial, promo, or referral gift granted to them along with its occasion, preventing repeat exploitation of one-time offers.
_Avoid_: Coupon log

**Saved Gift**:
A plan entitlement reward stored in a teacher's 3-slot inventory when received while the teacher is on a different active Plan. A teacher can hold at most 3 Saved Gifts (any automatic 4th gift is dropped), can delete unwanted gifts to free a slot, and can redeem at most 1 gift per paid billing period.
_Avoid_: Credit, voucher balance

**Promo Code**:
An admin-created code tied to a specific Plan, duration in days, optional maximum uses, and optional expiration date that a teacher can redeem from their profile or Upgrade Gate.
_Avoid_: Discount coupon

**Referral Code**:
A unique code issued only to teachers who have purchased a paid Plan, allowing them to refer up to 10 other teachers; the referred teacher receives their gift immediately on redemption, while the referring teacher receives their gift only after the referred teacher creates a group with at least 4 students.
_Avoid_: Affiliate link, invite code
