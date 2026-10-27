# Emtiaz — working notes

Backlog reconstructed from the 31-item sprint list. `[x]` = shipped (see git log / ADRs).

## New Backlog

- all the follwing tasks are there for you to create a robust and production grade LMS experience, keep that in mind, before each task use the ponytail skill and also ask yourself, what is the best way I can create that to be a production grade SAAS LMS

[ ] add localization to
[ ] course types
[ ] specializatinos
[ ] true or false answers
[ ] question types
[ ] use react hook form for all forms please, no manual form handling, also use zod if you need schema validation
[ ] add fade view transition between all pages
[ ] all icon button should have proper tool tips in arabic/english
[ ] for components you need you can use shadCN if it has what you need
[ ] check shadCN for sidebars
[ ] upgrade to vite v8
[ ] anywhere that there is soft delete, I want to see the delete data by filtering for deleted, and I want the option to restore said data items
[ ] the user name is stuck in the nav bar even after logout and different login to other account
[ ] never use browser confirm, use custom modals
[ ] create separate pages for each role, never make them share a page and then show items conditionaly by role
[ ] explain to me when or where the parent invite codes are created first time, also I don't want that I want parent to link students by phone number
[ ] remove short answer questions for now
[ ] don't keep legacy database columns, the website is still underdevelopment, remove any unneeded data and reseed the database

### parent pages

[ ] just use info from the other notes to fix this,

### student main page

[ ] add a proper side bar
[ ] make the main page have stats and whatever latest thing there is, any notifications, any messages from teachers
[ ] add a courses page that shows all courses, the home page only shows 3 latest courses
[ ] fix the nav bar as other users

### student single group page

[ ] for each group the student has I want you to theme the page of it with the teacher them, and add a banner with the course image and data up top, with a link to the teacher public page under their name or something
[ ] for group cards use badges
[ ] opening a group I want to see the data ordered as units, with the current unit highlighted, in each unit there are lessons and quizes, clicking on a lesson takes you to a lesson page, that has a sidebar for materials, each with its name, type icon, and if clicked and material is previewable it is previewed in the center preview page, if not it is opened in a new tab
[ ] quizes open in a quiz page, where students can answer quizes (each question has answers full width and in one column) then submit, once a quiz is submitted the student gets the grade and correct answers, and they can be viewed later for the same quiz (quiz first time -> solve, quiz after solve -> answers)

### student profile page

[ ] add a simple profile page for student with name, email, phone, date of birth, grade (optional), image

### student course browser

[ ] add to student and public pages a courses browser, where students can browse courses, search by name, filter by teacher, spec, grade, course type, semester, (all where applicible) and of course each coures is themed with the teacher's theme

### admin dashboard main page

[ ] add icons to the stats cards
[ ] add a proper side bar with navigation links
[ ] I want the main page to only have stats, charts, and notifications if any
[ ] I don't want to see "teacher studio" as admin
[ ] update nav bar same as teacher

### admin teachers page

[ ] in the teachers page, I want a proper datatable (use tanstack datatable here, and if you need it elsewhere) that shows me each teacher personal data (name, email, phone) button to public page if available, spec, number of courses, groups, unique students across teacher courses and groups, with filters like name search, phone search, spec, and a proper actions column for soft delete, edit, and disable actions
[ ] allow me to create teacher accounts from here, add a button atop the table, that opens a modal

### admin students page

[ ] I want a proper datatable that shows me each studnet personal data (name, email, phone), a button to student profile that loads all its data (parent data, for each group total attendance percentage, total quiz grades, list of groups taken with us + teacher name + date taken), with filters like name search, phone search, and a proper actions column for soft delete, edit, add to / move to / remove from a group, and disable actions
[ ] allow me to create students accounts from here, add a button atop the table, that opens a modal

### admin parents page

[ ] I want a proper datatable that shows me each parent personal data (name, email, phone), a button to parent profile that loads all its data (all childern with links to child profile, any parent feedbacks, list of delivered reports), with filters like name search, phone search, and a proper actions column for soft delete, edit, add / remove a child, and disable actions
[ ] allow me to create parent accounts from here, add a button atop the table, that opens a modal

### admin courses page

[ ] I want a proper datatable that shows me each course data name, teacher, spec, groups count, a profile that shows me all the actual groups with links to them, link to teacher profile, with filters like name search, spec filter, teacher filter, and a proper actions column for soft delete, edit, and disable actions
[ ] allow me to create courses from here, add a button atop the table, that opens a modal

### admin settings page

[ ] notification settings should be a tab here
[ ] I want a robust logging system detailing all the changes to all models, and all the actions (endpoints) called with what data, by whom, and what type of response returned, I want to see everything and retain these logs to at least 30 days, find me a robust package that does that and use it, and I want to see them in a tab here, also add filters like user type, model / endpoint, type of action / model, if possible allow me to filter by user via phone number or a drop down for example
[ ] I want to log all errors or exceptions to a text file that I tail here (last 500 lines) and that is polled every few seconds
[ ] I want to be able to manage all categories here, grades, semesters, skills, and to be able to add and edit the names of them
[ ] some more settings I want here are theme and colors (background, main, secondary, ..etc), logo,
[ ] I want a robust permission system for admins only for now, and to be able to manage it from the settings by creating roles and assigning permissions, permissions are enforced frontend and backend, whatever is not allowed to a role shouldn't even be visible
[ ]

### teacher dashboard main page

[ ] add a proper teacher sidebar for the teacher
[ ] make each course a full width card, with badges for the counts, with proper 3 dot menu for actions,
[ ] split courses with a divider by course type
[ ] add cursor pointer to buttons
[ ] fix image to big error, make it a simple message, make it arabic
[ ] fix cors error after uplaod image
[ ] groups should not appear in the course card, only number of groups, clicking on a card should take you to a new page showing a table of groups and data about them (code, start/creation time, number of students, course progress, days, group status (done, in progress), ...etc) + actions (mark as done, edit, add student, change days, ...etc)
[ ] add some stat cards (total number of curriculums, groups, unique students)
[ ] to each course card add a latest lesson with its name

### teacher course curriculum

[ ] I want the collapsible cards to animate opening and closing
[ ] the up and down arrows to reorder the lessons or units don't work
[ ] I want every lesson to have its own list of materials, materials can be images, pdfs, youtube links, external links, I want these materials to show up in the correct type at the student, and whatever type can be embedded in the website at the should be embedded
[ ] make adding material to a lesson a modal
[ ] make every delete require a confirmation via a small modal
[ ] add better placeholders to quiz inputs
[ ] for MCQ inputs, true or false inputs, make them full width and in a column,
[ ] make adding a quiz a modal that triggers via a button next at the unit header, where I add a quiz name, add a question, the question can include an image with the text, or be text only or image only
[ ] when adding a question to a quiz, there should be a radio button next to all answers to check the correct answer
[ ] quiz MCQ questions can have 2 to 4 answers
[ ] I want when creating a quiz they show up as small items similar to lessons, and can be reordered among the lessons
[ ] there is a problem I added a unit quiz and I can't see it
[ ] at the top of the curriculum page there should be some stat cards, number of lessons, number of units, number of quizes, as well as on top of each unit it should have number of lessons and quizes
[ ] unit name should be editable by cliking it
[ ] make all actions have toasts (success, error) that dismiss after some time, use sonner toast

### group page

[ ] open all / close all buttons don't work
[ ] individual open / close lesson buttons don't work
[ ] I want to be able to hide lessons / quizes from a group
[ ] when copying a code I want an animation to assure me I copied it
[ ] I want another button to copy a direct join link
[ ] adding/deleting a grades column should be in a group settings page, and with it a list of current grades columns on the current groups, and a button to delete them
[ ] make sure the table is scrollable in both directions, and the titles and the student names are fixed
[ ] export CSV button should be at the top
[ ] I want another default group for each (attendance)
[ ] make the whatsapp join message configurable by group in the group settings, with a default message in arabic
[ ] group advertisements and join codes should be in the group settings
[ ] moving students should be an action button on the students table that opens a modal to let the teacher choose which group to move it to,
[ ] instead of delete there should be a revoke access button that asks for confirmation in a modal
[ ] student degrees should only be on attendance and quizes, not on units or lessons
[ ] adding a student to a group should be a button on top of students table, that has a search by phone number (phone number must be mandatory for students), that search is debounced and doesn't search unless there are 4 numbers at leas in the input
[ ] add a new tab called stats, that shows stats about the group, start data, number of lessons taken/all lessons, percentage of total lessons taken, same for units, charts for student attendance across all lessons, chart of avg grades per quiz, totals for students (total percentage grade, total percentage attendance) + a simple podium showing the teacher all students in order of total avg (grade + attendance)
[ ] in group settings allow teacher to change days of the week, time of day, add custom group name (group names are optional, if no name proveded name it <course>-<course_groups_count + 1>), mark as done / not done
[ ] instead of buttons to change pages make them tabs, as that is clearer

### create course page

[ ] when the course is a general skill allow the user to type in the skill name, and filter the available skills as they type, if one matchs they can choose it, if none they can input a new skill (skills are shared across all teachers)
[ ] when the course is an academic course allow the user to type in the semester name (seed in semesters 1 and 2), and filter the available semesters as they type, if one matchs they can choose it, if none they can input a new semester (semesters are shared across all teachers)
[ ] make adding a course its own page instead of a form that opens on top of the courses

### techer public page

[ ] make each course a full width card
[ ] split courses with a divider by course type
[ ] add a filter by course type
[ ] I want the user to have more and more customizations available for their landing page, I want a few custom layouts, colors, a banner page, a banner text, a top small banner scrolling text, font choices (for arabic and english), and make that reflect when students open their groups, and when a teacher opens their dashboard, make these customizations available via the profile edit page
[ ] I want each course in the public page to have more data set by the teacher, like an image, some preview material, maybe a preview video, some description, this data is visible on the card where appropriate, and in a single course page with the teacher theme and they can also alter its layout independently of the main landing page
[ ] always add a footer that has the teacher's contact data and support (us) contact data, support contact data is provided by the admin in the admin dashboard

### teacher navbar

[ ] make it have a circle containg the teacher's image (if none use a default user icon) that when clicked shows a link to the landing page, profile update page, log out, so the nav bar have it, the language switch and the notifications icon
[ ] make notifications icon close on click outside, and make it open and close animated

### teacher profile page

[ ] make it update profile instead of create profile
[ ] make the profile update page better, make it full width, 2 columns, and split it to a user data section and a personal page section


### mobile app
- in addition to all that is above that should also be in the mobile version

[ ] make the app properly RTL in arabic
[ ] use the same fonts as the website
[ ] add proper button states (clicking, loading spinner for loading, ...etc)
[ ] fix image uplaods as well
[ ] the design on mobile is ass, fix it to cards as discussed and make it mobile friendly
[ ] I want the app to substitute for the website, make it able to do everything for teachers, parents and students


## UI audit & fix — started 2026-10-27

Audit basis: `PRODUCT.md`, `DESIGN.md`, every page under `frontend/src/pages`, `frontend/src/routes/__root.tsx`, `frontend/src/components`, `landing/`, `mobile/src`. Mode is **Operate** for the app, **Persuade** for landing/pricing, **Read** for the public teacher page. Work top-down; foundations first.

### Audit verdict (current state)

- **P0 — no application shell.** The whole product is one sticky top bar; no role sidebar, no mobile bottom nav, no active-route state (`frontend/src/routes/__root.tsx`).
- **P0 — every role shares one dashboard pattern.** Admin students/teachers/parents/courses are tabs of one 525-line page with conditional rendering; student/teacher/parent pages each carry their own one-off tab bars.
- **P1 — design-system drift.** Shadow utilities (`shadow-sm`, `shadow-md`, `shadow-lg`) contradict the flat system; `text-secondary` is used for ordinary section headings; `border-border` is used where no token exists (`Profile.tsx:151,176`); raw colours appear in mobile (`#fff`, error reds).
- **P1 — missing interaction states.** No toasts, no confirm dialogs (`window.confirm` in admin/parent/profile), no skeleton/loading on most buttons, no optimistic feedback; several icon-only buttons lack tooltips.
- **P1 — navigation identity bug.** The signed-in user can stay in the top bar after logout and a different login (session cache). Fix with the session work, not only visually.
- **P1 — tables are unreadable.** Gradebook has no sticky header/columns, no two-axis scroll container, export is below the table, delete-column sits in a header cell.
- **P1 — mobile.** No bottom navigation, no safe-area handling, no RTL verification, card layout not adapted, 44px targets missing.
- **P1 — fabricated proof still on the landing page.** Demo reviews/screenshots must be removed or clearly labelled (PRODUCT.md evidence rule).

### 0. Foundations (block everything else)

- [ ] Build one `AppShell`: desktop role sidebar + content column + mobile bottom nav; top bar only for language, notifications, avatar menu.
- [ ] Sidebar per role, never shared conditional items: student (Home, Courses, Profile), teacher (Home, Courses, Public page, Profile), parent (Children, Profile), admin (Overview, Teachers, Students, Parents, Courses, Settings).
- [ ] Active route highlight, 48px nav rows, keyboard focus, RTL mirroring, collapsed rail for tablet.
- [ ] Mobile bottom nav with 4–5 role items, safe-area inset, current-tab state; content clears the bar.
- [ ] Remove "Teacher studio" and every teacher-only item from the admin shell.
- [ ] Route fade transition on every navigation; honour `prefers-reduced-motion` (do not globally kill useful feedback).
- [ ] Add `sonner` toasts for every mutation: success, error, copied, restored, sent.
- [ ] Add `ConfirmDialog` (focus trap, Escape, scroll lock, focus return) and replace every `window.confirm`.
- [ ] Add `IconButton` primitive with Arabic/English tooltip + `aria-label`; migrate every icon-only control.
- [ ] Add `Dialog`/`Sheet` primitives and use them for course creation, quiz builder, material add, move student, revoke access, admin create/edit.
- [ ] Add `Skeleton` page/table/card states; keep `Loading` only for in-place actions.
- [ ] Add `EmptyState` with a clear next action per surface (no bare `—`).
- [ ] Add `Badge` and `StatCard` primitives (status/counts only; stats get one icon, one number, one label).
- [ ] Forms: migrate every form to `react-hook-form` + `zod`; inline field errors; pending/disabled states; no manual `useState` per field.
- [ ] Tables: adopt `@tanstack/react-table` for admin directories, groups, gradebook; sticky header + sticky first column, two-axis scroll, filters/sorting/pagination.
- [ ] Remove all shadow utilities; depth comes from 1px `line` borders and tonal fills only.
- [ ] Typography pass: 16px body, 18px titles, 400/600–700 only, tabular numerals for grades/counts, no decorative eyebrow above headings.
- [ ] Colour pass: terracotta only for the single attention point; ordinary section headings use ink/teal, not terracotta.
- [ ] RTL pass: chevrons, table column order, sidebar side, dialogs, progress, dates, phone/code inputs (`dir="ltr"` only on the value).
- [ ] Responsive pass at 360 / 768 / 1024 / 1280: no horizontal page overflow, no clipped dialogs, no sub-44px targets.
- [ ] Fix session/identity: `no-store` session fetch, set session from auth response, clear on logout, bust avatar URL; verify two consecutive logins in one tab.
- [ ] Replace `window.confirm` on: admin delete, parent unlink, parent-code rotate (removed with phone linking), module/lesson/quiz/material delete, revoke access.
- [ ] Add `aria-label`/tooltip to: curriculum reorder + delete, gradebook column delete, roster remove, taxonomy delete, notification bell, avatar menu.
- [ ] Add a `/impeccable audit` pass + `impeccable detect` over changed UI before closing this section.

### 1. Student

- [ ] Home: greeting, stats (active groups, lessons done, average grade), 3 latest courses, latest announcements/notifications, no full catalogue.
- [ ] Separate `/student/courses` browser: search, filter by teacher, specialization, grade, course type, semester; teacher-themed cards; server-side filters where possible.
- [ ] Sidebar + mobile nav; profile entry.
- [ ] Group page: teacher theme, banner with course image/title/teacher link, units ordered with current unit highlighted.
- [ ] Unit → lessons/quizzes ordered as items; locked/done/current states with badges.
- [ ] Lesson page: materials sidebar (name, type icon, previewable inline in centre pane, otherwise new tab), completed action, quiz entry.
- [ ] Quiz page: one-column full-width answers, submit confirmation, result with correct answers, revisit shows answers instead of re-solving.
- [ ] Profile page: name, email, phone, date of birth, optional grade, image; real update flow.
- [ ] Remove the parent-code card from the student profile (phone linking replaces it).

### 2. Teacher

- [ ] Home: stat cards (curricula, groups, unique students); full-width course cards with type chip, counts badges, latest lesson, 3-dot menu; divider by course type; no group list inside the card.
- [ ] New page per course: groups table (code, created, students, progress, days, status) + actions (mark done, edit, add student, change days, open group).
- [ ] Course creation moves to its own page; skill/semester comboboxes filter existing taxonomy and allow creating a new shared value.
- [ ] Group page tabs: Pacing, Gradebook, Roster, Stats, Settings. No page-number buttons.
- [ ] Pacing: working open/close all + per-item toggles, hide lessons/quizzes, copy feedback animation, copy direct join link, group join message in settings.
- [ ] Gradebook: sticky student column + header, two-axis scroll, export at top, attendance default column, columns managed in Settings, delete confirmations.
- [ ] Roster: add-student button with debounced phone search (≥4 digits), move-student modal, revoke-access confirm, no browser confirm.
- [ ] Stats: start date, lesson/unit completion, attendance chart, avg quiz grade chart, totals per student, ordered podium.
- [ ] Settings: custom name with `<course>-<n>` fallback, days/time, mark done/not done, WhatsApp message, ads/join codes, grade columns.
- [ ] Curriculum: animated accordions, reorder arrows actually reorder, per-lesson materials modal (image/PDF/YouTube/external), quiz builder modal with image+text, radio correct answer, 2–4 MCQ options, quiz items reorder with lessons, top stat cards, unit rename inline, sonner toasts.
- [ ] Profile: "update profile" wording, full-width two-column layout (account / public page), theme customisation (layout, colours, banner, scrolling text, Arabic+English fonts).
- [ ] Public page: full-width course cards, type divider + filter, richer course cards, course detail page, footer with teacher + platform support contacts.
- [ ] Navbar: avatar circle menu (public page, profile, logout), notifications close on outside click + animated.
- [ ] Fix image-too-large message (Arabic, plain), CORS after upload.

### 3. Admin

- [ ] Overview: stats + charts + notifications only; icons on stat cards; no management tabs.
- [ ] Dedicated pages: Teachers, Students, Parents, Courses, Settings (not one tabbed dashboard).
- [ ] Each directory: datatable (name/email/phone, filters, pagination), row profile, actions (edit, suspend, soft delete, restore), create-account modal.
- [ ] Teacher row: public-page link, spec, course/group counts, unique students.
- [ ] Student row: profile with parent data, per-group attendance %, quiz totals, groups + teacher + date.
- [ ] Parent row: profile with children links, feedback, delivered reports; add/remove child.
- [ ] Course row: spec, groups, teacher link, groups list, actions, create modal.
- [ ] Settings tabs: Notifications, Audit log, Error tail (500 lines, polled), Taxonomy (grades/semesters/skills add+edit), Branding (theme/logo/colours), Admin roles/permissions.
- [ ] Robust audit logging with filters (actor, model/endpoint, action, date); ≥30-day retention; backend enforcement for roles.
- [ ] Soft-delete filter + restore on every directory.
- [ ] Remove "Teacher studio" from admin navigation.

### 4. Parent

- [ ] Separate Children page and Profile page, no shared student shell.
- [ ] Link child by phone number (mandatory student phone), normalized and debounced; remove invite-code UI.
- [ ] Child cards: groups, progress, attendance, grades, reports; unlink via modal.
- [ ] Clear read-only language; no action that implies the parent can edit grades.

### 5. Public / landing

- [ ] Audit against `DESIGN.md`: remove all shadows, one terracotta accent per screen, flat borders.
- [ ] Remove fabricated demo reviews/screenshots or label them unmistakably as illustrative (PRODUCT.md).
- [ ] Reconcile pricing with "no billing"; do not imply checkout exists.
- [ ] RTL/LTR pass, OG/favicon, accessibility pass, mobile nav.
- [ ] Teacher public page: theme, banner, layout, course detail, footer contacts.

### 6. Mobile

- [ ] Proper RTL + Cairo/DM Sans to match web.
- [ ] Button states: pressed, disabled, loading spinner.
- [ ] Card-based layouts, bottom-tab navigation, safe areas.
- [ ] Upload flow parity (avatar/materials) with real errors.
- [ ] Teacher/parent/student parity with web.

### 7. Quality gates (per UI batch)

- [ ] `npm run typecheck` (frontend + backend) and `npm test` (frontend + backend).
- [ ] `impeccable detect` on changed files; zero unexplained findings.
- [ ] Playwright smoke: login → dashboard → group → lesson → quiz, in Arabic and English.
- [ ] Manual check at 360 / 768 / 1280, RTL + LTR, keyboard-only, reduced motion.
- [ ] No `window.confirm`, no `shadow-*`, no raw hex in app components, no untranslated UI copy.

## Backlog (31 items)

1. [x] Why have both `web/` and `frontend/`? — answered: `frontend/` is source, `web/` is only container packaging (Dockerfile + Caddyfile) because the image needs repo-root `landing/` in its build context. Rename to `deploy/web/` if it still feels confusing.
2. [x] Use Caddy instead of nginx — done (`web/Caddyfile`, zstd/gzip, SPA + landing + `/api` proxy, extensionless pages).
3. [x] Make the mobile app a proper app with navigations, and add teacher + parent capabilities — teacher slice (courses → groups → pacing, roster, announcements); parent slice (children, link code, progress, grades); per-role React Navigation native stacks.
4. [x] Student + teacher profiles with user images, page on web and mobile — `/profile` on web, Profile screen on mobile, presigned avatar upload, `GET /api/me` + `/api/me/avatar`.
5. [x] Remove stub upload from file upload — unconfigured storage now returns 503; no fake URLs.
6. [x] Remove every mention of MinIO/s3rver — docs/ADR/compose/scripts purged, `rustfsadmin` creds.
7. [x] Upgrade the landing page — large hero + dashboard mock, scroll reveals, 8 feature cards, demo student/teacher reviews, parent section, pricing.
8. [x] Landing page for teachers — `/landing/teachers`.
9. [x] Pricing plans for teachers/students + sibling bundle — presented on landing (teacher 15, plus 25, student 3, sibling +1 OMR). No billing/checkout yet.
10. [x] Learn how to run the mobile app — `mobile/README.md` + README section (Expo Go, same LAN, API :3000).
11. [x] Add more to the ADRs — ADR-0005 zod validation, 0006 HTTP hardening, 0007 avatars, 0008 TanStack Router; 0002/0003/0004 updated.
12. [x] Always call it سلطنة عُمان instead of عُمان — landing, i18n, mobile login.
13. [x] Frontend → TanStack Router with code-based routing + route loaders — done, react-router-dom removed.
14. [x] Split the UI component file into multiple files — `components/ui/*` + barrel.
15. [x] Split the auth guard file into multiple files — express types, `Public` decorator, `toWebHeaders`, `AuthGuard`, `RolesGuard`.
16. [ ] Update Drizzle to version 1.
17. [ ] Fix Jest types not found; potentially move to Vitest.
18. [ ] Multiple user tables (students, teachers, parents, admins) instead of one `user` table + role column.
19. [x] Explain the manual grade columns and their values (docs).
20. [ ] Add resources for backend responses (response shaping/serializers).
21. [x] Make all user deletes (student, teacher, admin) a soft delete.
22. [x] Rename `r2` service and all storage naming to `storageDriver`.
23. [x] Explain the difference between the client and the presign client in `r2` (docs, mirrors ADR-0002 key env vars).
24. [x] Split notification service into files: interface, mock service, real service.
25. [x] Notification channels (in-app, WhatsApp, email) + types (admin/marketing, parent monthly, teacher) + admin toggles per channel. — in-app inbox, monthly parent summaries, and admin toggles shipped.
26. [x] Proper file structure for the mobile app, and split the mobile UI file into multiple files.
27. [x] Use TanStack Query for data fetching in the mobile app too.
28. [x] No ASCII arrows in web/mobile UI — use icons (mobile back buttons `←`, teacher Group `→` still present).
29. [x] General quizzes on a whole course or a module.
30. [x] Configurable landing page per teacher with generated links (paths: /t/<slug>).
31. [x] Structured logging with request IDs (pino) instead of `console.log`.

## New tasks I want to do now

- [x] Parent role: decide the parent↔student relation (invite code? phone match?) and add read-only progress/grades; unblocks #3, #25.
- [ ] Billing: pick a provider and wire checkout for the plans + sibling bundle; unblocks #9 for real.
- [x] Unify migrations on the drizzle-kit journal (drop the custom count-based migrator) — two migrators sharing one table is a footgun.
- [x] Per-account login lockout (N failures → temporary lock); today only IP limits exist.
- [x] CI: GitHub Actions for typecheck + backend tests + frontend tests + docker build.
- [x] Backups: `pg_dump` + RustFS snapshot scripts and a restore runbook.
- [x] Playwright smoke test: login → group → lesson → quiz (web).
- [ ] OpenAPI/Swagger generation so web/mobile clients have a contract.
- [ ] Shared API types or a generated client for web + mobile (less drift than hand-written types).
- [x] Avatar lifecycle: delete the replaced object (or add bucket lifecycle rules) to stop orphan growth.
- [x] Landing polish: real screenshots, OG/social meta, favicon.
- [x] Accessibility pass: labels, focus rings, contrast, keyboard nav.
- [x] Email channel behind `NotificationsService` (provider decision).
- [x] Redis-backed throttle storage + lockout for multi-instance deploys.
