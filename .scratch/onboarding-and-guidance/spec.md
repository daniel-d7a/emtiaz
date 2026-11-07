# Role Auth, Multi-Step Onboarding, Country Taxonomy & In-App Guidance Specification

**Status:** ready-for-agent

## Problem Statement

New teachers, students, and parents currently face a single flat registration form and a generic login screen that do not reflect their role, country (`OM` vs. `EG`), or teaching mode (`ACADEMIC` vs. `GENERAL`). Academic `grades` are only seeded for Oman's high school levels in a single language string, and general `categories` have only a handful of English-named entries rather than a rich bilingual taxonomy. Finally, once users land in their dashboard, there is no first-time onboarding guide explaining how courses, groups, and entry codes work, no contextual `(i)` hints on complex controls, and no ubiquitous one-click button to report a problem or reach Administration on WhatsApp.

## Solution

Deliver a cohesive onboarding, taxonomy, and guidance experience across backend, web, and mobile:

1. **Country-Scoped Bilingual `Grades` & 30 Seeded Bilingual `Categories` (Tracks)**:
   - Upgrade `grades` to store `country` (`OM` | `EG`), `nameAr`, and `nameEn`, seeded with Oman Grades 1–12 and Egypt Primary 1–6, Preparatory 1–3, and Secondary 1–3.
   - Upgrade `categories` to store `nameAr` and `nameEn`, seeded with 30 bilingual General Course Tracks.
   - Persist each teacher's `courseFocus` (`ACADEMIC` | `GENERAL`) on `user` and their taught grades in `teacher_grades` (`teacherId`, `gradeId`) so course creation defaults to their focus and country's grades.
2. **Role-Specific Auth & Multi-Step Signup Wizards (`Teacher`, `Student`, `Parent`)**:
   - Provide role-tailored Login screens (`/login` and `/login/$role`) and a 4-screen Multi-Step Signup Wizard (`/register` role selector and `/register/$role`) with per-step email/phone availability validation (`POST /api/onboarding/check-availability`) and a Congratulations screen before entering the dashboard.
3. **First-Time Dashboard Walkthroughs, `<InfoHint />` Component & Persistent WhatsApp Report Problem CTA**:
   - Show a role-specific 3-step Welcome Tour Modal on first dashboard visit alongside an interactive Getting Started Checklist card (and a header button to re-open the guide anytime).
   - Provide a reusable `<InfoHint />` component supporting both a 1-sentence popover/tooltip and a mini multi-step modal on key Teacher, Student, and Parent surfaces.
   - Display a persistent **Report Problem / Feedback (WhatsApp)** button on every step of the Auth/Onboarding wizards and inside the Web and Mobile app chrome, redirecting to the Admin-configured `supportWhatsapp` number with pre-filled context.

## User Stories

1. As a teacher, student, or parent visiting `/login` or `/login/$role`, I want a role-tailored login screen with a clear switcher between Teacher, Student, and Parent, so that I know I am signing into the right workspace and can jump to the matching registration wizard.
2. As a new teacher on `/register/teacher`, I want Step 1 to collect my Name, Email, and Password and immediately verify that my email is not already registered when I click Next, so that I do not fill out three steps only to fail on a duplicate email.
3. As a new teacher, student, or parent on Step 2 of registration, I want to select my Country (`OM — سلطنة عُمان` or `EG — مصر`) and enter my Phone Number with live country-specific format and uniqueness validation before advancing to Step 3.
4. As a new teacher on Step 3 of registration, I want to choose whether my `Course Focus` is `ACADEMIC` (مناهج دراسية) or `GENERAL` (دورات عامة / مهارات), so that the platform tailors my setup and course creation defaults.
5. As a new teacher who chooses `ACADEMIC` on Step 3, I want to multi-select the Grades I teach from my country's seeded list (Grades 1–12 for Oman; Primary 1–6, Preparatory 1–3, and Secondary 1–3 for Egypt) or type a custom grade, along with my academic subject, so that my taught grades are saved to my profile.
6. As a new teacher who chooses `GENERAL` on Step 3, I want to pick my specialization Track from 30 seeded bilingual tracks (in Arabic or English) or enter a custom track, so that my specialization is saved to my profile.
7. As a new student on Step 3 of registration, I want to select my school Grade (filtered by my chosen Country `OM` or `EG`) and optionally enter a Group `Join Code` (+ `Entry Code`), so that I can join my teacher's cohort right during signup.
8. As a new parent on Step 3 of registration, I want to optionally enter my child's student phone number (or skip to link later), so that I can connect to my child's account immediately.
9. As a newly registered Teacher, Student, or Parent completing Step 3, I want to see a Step 4 Congratulations screen summarizing my account setup with a button to enter my dashboard.
10. As a user on any step of `/login` or `/register/$role`, I want to see a prominent "Report a Problem / Contact Support" WhatsApp button that opens a pre-filled chat with the Admin-configured `supportWhatsapp` number, so that I can get help immediately if I get stuck during signup.
11. As a teacher opening the New Course form, I want the Course Type (`ACADEMIC` vs. `GENERAL`) to default to my saved `courseFocus` and the Grade dropdown to show my country's grades (with my taught grades prioritized), so that creating a course takes fewer clicks.
12. As a teacher viewing my Profile page, I want to edit my `courseFocus`, taught `grades`, and specialization `Category` anytime.
13. As an Admin in Admin Settings → Taxonomy, I want to view, create, and edit bilingual `nameAr` and `nameEn` (and `country` on `grades`) for all Grades and Categories, including any custom entries typed by teachers during onboarding.
14. As a first-time Teacher entering `/teacher/dashboard`, I want to see a 3-step Welcome Tour Modal and an interactive Getting Started Checklist (`1. Create a Course` → `2. Create a Group` → `3. Add Students & Entry Codes`) that checks off items as I complete them, so that I immediately know how to launch my first cohort.
15. As a first-time Student entering `/student/dashboard`, I want to see a Welcome Tour and Getting Started guide explaining how to ask my teacher for a Group Join Code (+ Entry Code), join the group, and access lessons and quizzes.
16. As a first-time Parent entering `/parent/children`, I want to see a Welcome Tour and Getting Started guide explaining how to link my child's account and monitor their attendance, grades, and monthly reports.
17. As any Teacher, Student, or Parent, I want a button in the app header/profile to re-open the Platform Guide modal whenever I need a refresher.
18. As a user seeing an `(i)` Info Hint icon next to a feature header or setting, I want clicking it to open either a concise 1-sentence explanation popover or a mini multi-step onboarding modal explaining how that feature works.
19. As an authenticated user on web or mobile, I want a clear "Report Problem / Feedback" WhatsApp button in the app chrome that opens `wa.me/<supportWhatsapp>` with my current screen and account context pre-filled, so that I can always reach Administration in one click.

## Implementation Decisions

### 1. Schema & Seeded Taxonomy (`backend/src/db/schema.ts`, `seed.ts`)
- **`grades` table**:
  - Add `country` (`countryEnum('country').notNull().default('OM')`), `nameAr` (`text('name_ar').notNull()`), and `nameEn` (`text('name_en').notNull()`), keeping `name` populated (`nameEn`) for backward compatibility.
  - Seed **Oman (`OM` — 12 grades, `displayOrder` 1–12)**:
    - `Grade 1` / `الصف الأول` through `Grade 12` / `الصف الثاني عشر`.
  - Seed **Egypt (`EG` — 12 grades, `displayOrder` 1–12)**:
    - Primary 1–6: `1st Grade Primary Education` / `الصف الأول الابتدائي` through `6th Grade Primary Education` / `الصف السادس الابتدائي`.
    - Preparatory 1–3: `1st Grade Preparatory Education` / `الصف الأول الإعدادي` through `3rd Grade Preparatory Education` / `الصف الثالث الإعدادي`.
    - Secondary 1–3: `1st Grade Secondary Education` / `الصف الأول الثانوي` through `3rd Grade Secondary Education` / `الصف الثالث الثانوي`.
- **`categories` table (General Course Tracks)**:
  - Add `nameAr` (`text('name_ar').notNull()`) and `nameEn` (`text('name_en').notNull()`), keeping `name` populated (`nameEn`).
  - Seed the **30 approved bilingual tracks** in both `seed.ts` and `test-helpers.ts`.
- **Teacher Focus, Taught Grades & Onboarding Tour State (`user` & `teacher_grades`)**:
  - Add `courseFocus` (`courseTypeEnum('course_focus').default('ACADEMIC')`) and `onboardingCompletedAt` (`timestamp('onboarding_completed_at')`, nullable — set when the user finishes or dismisses their first-time dashboard welcome tour) to `user`.
  - Create `teacher_grades` table (`id` uuid PK, `teacherId` FK → `user.id` cascade, `gradeId` FK → `grades.id` cascade, unique index on `(teacherId, gradeId)`).
- **Custom Taxonomy Entries**:
  - When a teacher supplies a custom grade name (for their `country`) or custom category/track name during onboarding or profile update, case-insensitively match against `name`, `nameAr`, or `nameEn`; if none matches, insert a new row with `name = input, nameAr = input, nameEn = input` (and `country = teacher.country` for grades).

### 2. Onboarding & Taxonomy API Contracts (`shared/api.ts`, Web, Mobile)
- **`POST /api/onboarding/check-availability`**:
  - Accepts `{ email?: string, phoneNumber?: string, country?: Country }`.
  - Validates phone format for `country` (when `phoneNumber` is provided) and checks whether `email` or normalized `phoneNumber` is already registered by a non-deleted user, returning `{ available: boolean, field?: 'email' | 'phoneNumber', reason?: string }` so Wizard Steps 1 and 2 validate before advancing.
- **`GET /api/onboarding/grades?country=OM|EG` & `GET /api/onboarding/categories`**:
  - Returns `{ id, name, nameAr, nameEn, country, displayOrder }[]` for grades (filtered by `country` when passed) and `{ id, name, nameAr, nameEn }[]` for the 30+ categories.
- **Role Registration Endpoints**:
  - `POST /api/onboarding/teacher`: Accepts `{ name, email, password, country, phoneNumber, courseFocus: 'ACADEMIC' | 'GENERAL', gradeIds?: string[], customGrades?: string[], subject: string }`, creates the teacher, links `teacher_grades`, and sets `courseFocus` and `subjectCategoryId`.
  - `POST /api/onboarding/student`: Accepts `{ name, password, email?: string, country, phoneNumber, gradeId?: string }`.
  - `POST /api/onboarding/parent`: Accepts `{ name, password, email?: string, country, phoneNumber, studentPhone?: string }`.
- **Profile & Tour State (`GET /api/me`, `PATCH /api/me`)**:
  - `GET /api/me` includes `courseFocus`, `taughtGrades: { id, name, nameAr, nameEn, country }[]`, and `onboardingCompletedAt`.
  - `PATCH /api/me` allows updating `courseFocus`, `gradeIds`, `customGrades`, `subject`, and `onboardingCompleted: boolean` (which stamps `onboardingCompletedAt`).
- **Admin Taxonomy Endpoints (`POST/PATCH /api/admin/grades`, `POST/PATCH /api/admin/categories`)**:
  - Support `nameAr`, `nameEn`, and `country` (`OM` | `EG` for grades).

### 3. UI Surfaces: Role Auth, Multi-Step Wizards, Walkthroughs, `<InfoHint />` & WhatsApp Report CTA
- **Role Auth & Multi-Step Signup (`/login`, `/login/$role`, `/register`, `/register/$role` on Web & Mobile)**:
  - Role-specific login tabs (`teacher`, `student`, `parent`) and 4-step registration wizard (Step 1: Account → Step 2: Country & Phone → Step 3: Focus/Grade/Child → Step 4: Congratulations).
- **Reusable `<InfoHint />` Component (`frontend/src/components/ui/InfoHint.tsx` & Mobile equivalent)**:
  - Props: `{ title?: string; hint?: string; steps?: { title: string; body: string }[] }`.
  - Renders an accessible `(i)` icon button (`aria-label`); opens a popover/dialog with the 1-sentence `hint` or a stepped modal carousel with Next/Previous controls when `steps` is passed.
  - Placed on: Teacher Courses vs. Groups header, Group Entry Codes & `requiresEntryCode`, Group Pacing (`unlockAllByDefault`), Gradebook & Written Grading, Teacher Profile Entitlements & Saved Gifts, Student Join Group by Code, and Parent Link Child.
- **First-Time Dashboard Walkthrough (`OnboardingGuide.tsx` & Mobile equivalent)**:
  - Auto-opens the 3-step Welcome Tour Modal on first dashboard visit (`!user.onboardingCompletedAt`) and renders the interactive Getting Started Checklist card on Teacher, Student, and Parent dashboards (plus a header button to re-open the tour anytime).
- **Persistent "Report Problem / Feedback" WhatsApp Button (`ReportProblemButton.tsx` & Mobile equivalent)**:
  - Reads `supportWhatsapp` from `/api/public/support` (cached via React Query).
  - Rendered on every step of Login/Register and in the authenticated Web AppShell and Mobile header/profile, opening `wa.me/<digits>` with a pre-filled bilingual message including current route and user context.

## Testing Decisions

- **Primary Seam — Backend HTTP Integration (`backend/src/modules/onboarding/onboarding.spec.ts`, `admin.spec.ts`, `teacher.spec.ts`)**:
  - Verify seeded Oman (12) and Egypt (12) bilingual grades and 30 bilingual general categories.
  - Verify `GET /api/onboarding/grades?country=OM` vs. `country=EG` filtering.
  - Verify `POST /api/onboarding/check-availability` for duplicate email, duplicate phone, and mismatched country phone formats.
  - Verify `POST /api/onboarding/teacher` with `ACADEMIC` (saving `courseFocus = 'ACADEMIC'` and `teacher_grades`, including custom grades) and `GENERAL` (saving `courseFocus = 'GENERAL'` and custom/seeded category).
  - Verify `PATCH /api/me` updating `courseFocus`, `gradeIds`, and `onboardingCompleted`.
  - Verify Admin creating and editing bilingual `grades` (with `country`) and `categories`.
- **Frontend Unit & Component Seam (`frontend/src/components/ui.spec.tsx`, `frontend/src/lib/i18n.spec.ts`)**:
  - Verify `<InfoHint />` in both 1-sentence mode and multi-step modal mode.
  - Verify Arabic/English translation parity across all new onboarding, taxonomy, walkthrough, and hint keys.

## Out of Scope

- Automated email password reset (tracked separately with email provider setup).
- Student profile Parent Monitoring QR code (tracked separately under the QR codes effort).
