# 03: Define First-Time Dashboard Walkthroughs, (i) Hint System & WhatsApp Report Problem CTA

**Type:** grilling
**Status:** resolved
**Blocked by:** [01: Define Role-Specific Auth & Multi-Step Signup Wizard](01-role-auth-and-multi-step-signup-wizard.md)

## Question

How do first-time users learn the platform after signup, how does the `(i)` hint component work, and how is the WhatsApp Report Problem / Feedback button presented everywhere? Specifically:
1. What does the **First-Time Onboarding Guide** look like when a Teacher, Student, or Parent enters their dashboard for the first time (e.g., a dismissible/re-openable interactive Getting Started checklist + guided modal tour: Teacher: `1. Create your first course` → `2. Create a group` → `3. Generate entry codes & share with students on WhatsApp`; Student: `1. Ask your teacher for the group join code & entry code` → `2. Enter code to join`; Parent: `1. Link your child's account` → `2. Follow their attendance, quizzes & grades`)?
2. How should the reusable **`(i)` Info Hint component** work across pages (supporting both a 1-sentence popover/tooltip and a mini multi-step modal with illustrations/steps), and which key screens should have `(i)` hints out of the box?
3. Where does the **Report Problem / Feedback (WhatsApp)** button appear (on every step of the signup/login wizard, in the app header/sidebar/footer on web, and in the header/profile on mobile), and does it use `supportWhatsapp` or a dedicated `feedbackWhatsapp` / `supportWhatsapp` setting in the Admin dashboard with a pre-filled context message (current page, user role, user name/phone)?

## Answer

1. **First-Time Dashboard Walkthrough & Interactive Getting Started Checklist**:
   - Shown on first dashboard visit (and re-openable anytime from a header **"Platform Guide / كيف أبدأ؟"** button) across web and mobile as both a **3-step Welcome Tour Modal** and an interactive **Getting Started Checklist Card**:
     - **Teacher**: 1) Create your master Course → 2) Create a Group (Cohort) → 3) Add Students & Entry Codes and share on WhatsApp.
     - **Student**: 1) Ask your teacher for the Group Join Code (+ Entry Code) → 2) Join your Group → 3) Study Lessons & Take Quizzes.
     - **Parent**: 1) Link your Child's Account → 2) Track Attendance, Quizzes & Monthly Reports.
2. **Reusable `<InfoHint />` Component (Web & Mobile)**:
   - Supports **simple mode** (`hint="..."` → 1-sentence popover/tooltip) and **multi-step mode** (`steps={[{ title, body }, ...]}` → mini multi-step onboarding modal with step dots and Next/Back controls).
   - Placed on: Teacher Courses vs. Groups header (multi-step), Group `requiresEntryCode` & Entry Codes (multi-step), Pacing & `unlockAllByDefault` (simple), Gradebook & Written Grading (simple), Teacher Profile Entitlements & Saved Gifts (multi-step), Student Join Group by Code (multi-step), and Parent Link Child (simple).
3. **Persistent "Report Problem / Feedback" WhatsApp CTA**:
   - Wired to the Admin-configured `supportWhatsapp` number (editable in Admin Settings → Platform Support and exposed via `/api/public/support`).
   - Displayed on **every step of the Auth & Onboarding Wizards** (`/login`, `/login/$role`, `/register`, `/register/$role`) and in the **authenticated Web and Mobile app chrome** (header/footer/profile), opening `wa.me/<supportWhatsapp>` with a pre-filled message containing the current page/screen and (if logged in) the user's name, role, and phone.
