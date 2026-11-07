# Emtiaz Application Overview

## 1. Purpose

Emtiaz is an Arabic-first learning platform for Oman. Teachers use it to build courses and run groups. Students use it to join groups, study lessons, and take quizzes. Parents use it to follow their children. Admins use it to operate the platform.

The platform has two main parts:

- A public part. Visitors can find teachers and published courses.
- A private part. Teachers, students, and parents use it after login.

The product is pre-launch. Billing and a full tutor marketplace are not built.

## 2. Terms

- **Course**: The master curriculum that a teacher writes once.
- **Group**: A cohort of students that studies one course. A course can have many groups.
- **Module**: A unit inside a course.
- **Lesson**: A study item inside a module.
- **Material**: A file, external link, or YouTube link attached to a lesson.
- **Quiz**: A set of questions attached to a lesson, module, or course.
- **Gradebook**: The teacher view of quiz scores and manual grades for a group.
- **Join code**: A code that a student uses to join a group.
- **Entry code**: An optional extra code that a teacher can require for a group.
- **Storefront**: The public page of one teacher at `/t/<slug>`.
- **Catalogue**: The public list of published courses.

## 3. User Roles

| Role | Main use |
|---|---|
| Public visitor | Finds teachers and courses. Reads public pages. |
| Student | Joins groups. Studies lessons. Takes quizzes. Reads own grades. |
| Teacher | Creates courses. Runs groups. Teaches. Grades students. |
| Parent | Links to a child. Reads the child's progress, attendance, grades, and reports. |
| Admin | Manages users, courses, groups, taxonomy, settings, and audit data. |

Each user has one role. A role does not give access to another user's data. The system also checks ownership, enrollment, parent links, and group settings.

## 4. Surfaces

| Surface | What it does |
|---|---|
| Web app | Main application for all roles. Arabic-first with an English switch. |
| Mobile app | Expo and React Native app for students, teachers, and parents. Admin is web-only. |
| Public web pages | Course catalogue, teacher storefront, teacher course page, sitemap, and robots file. |
| Marketing pages | Static bilingual pages for the platform and for teachers. |
| API | NestJS API for authentication, data, uploads, notifications, and public pages. |

## 5. Main User Flows

### 5.1 Teacher starts a course

1. The teacher creates an account.
2. The teacher creates a course.
3. The teacher selects `ACADEMIC` or `GENERAL`.
4. For an academic course, the teacher selects a grade and a semester.
5. For a general course, the teacher selects a skill category.
6. The teacher adds modules and lessons.
7. The teacher adds materials and quizzes.
8. The teacher creates one or more groups from the course.
9. The teacher adds students or shares the join code and link.
10. The teacher runs the group with pacing, attendance, and grades.

### 5.2 Student joins and learns

1. The student opens a join link, enters a join code, or scans a QR code.
2. The student logs in or creates an account.
3. The student joins the group.
4. The student opens the group curriculum.
5. The student opens a lesson and reads or downloads the materials.
6. The student marks the lesson as complete.
7. The student takes a quiz.
8. The student reads the quiz result and the group grades.

If the group requires an entry code, the student must also enter a valid entry code.

### 5.3 Parent follows a child

1. The parent creates an account.
2. The parent links to a child with the child's registered phone number.
3. The parent reads the child's progress, attendance, and grades.
4. The parent reads the monthly reports.
5. The parent can unlink the child.

### 5.4 Public visitor finds a course

1. The visitor opens the public catalogue.
2. The visitor searches by text.
3. The visitor filters by teacher, specialization, grade, course type, or semester.
4. The visitor opens a teacher storefront.
5. The visitor opens a course page and reads the outline.
6. The visitor contacts the teacher or uses the join flow.

### 5.5 Admin operates the platform

1. The admin opens the dashboard.
2. The admin manages users, courses, groups, and parent links.
3. The admin manages grades, semesters, and skill categories.
4. The admin manages admin roles and permissions.
5. The admin sets site branding, support contacts, and notification settings.
6. The admin reviews the audit log and error log.

## 6. Feature List by Role

### 6.1 Public visitor

- Read the general marketing page.
- Read the teacher marketing page.
- Browse the public course catalogue.
- Search the catalogue by text.
- Filter the catalogue by teacher, specialization, grade, course type, and semester.
- Open a teacher storefront.
- Open a published course page.
- Read the course description, image, preview video or link, and outline.
- Read teacher contact details and platform support contacts.
- Use the sitemap and robots file.
- See the platform branding and the teacher theme.

Current limits:

- No tutor directory with tutor-first search.
- No ratings or reviews.
- No trial lesson booking.
- No online checkout.
- No in-app chat.

### 6.2 Student

- Log in with phone number or email.
- Change a temporary password when the system requires it.
- Join a group with a join code.
- Join a group with a join link.
- Join a group with a QR code on mobile.
- Enter an entry code when the group requires one.
- Read home statistics and latest courses.
- Browse the public course catalogue.
- Read the list of own groups.
- Read the group curriculum.
- Open lessons that are unlocked for the group.
- Read lesson text and view lesson materials.
- Download files and open external links.
- Mark a lesson as complete or incomplete.
- Take lesson, module, and course quizzes.
- Answer multiple-choice, true or false, and written questions.
- Read own quiz results.
- Read own quiz grades and manual grades.
- Read notifications.
- Mark one notification or all notifications as read.
- Edit own profile and avatar.
- Use the mobile bottom tabs for home, notifications, and profile.

### 6.3 Teacher

- Read dashboard statistics.
- Create and edit own courses.
- Select `ACADEMIC` or `GENERAL` course type.
- Select grade, semester, or skill category.
- Add, edit, reorder, and delete modules.
- Add, edit, reorder, and delete lessons.
- Add materials as files, external links, or YouTube links.
- Limit a material to one group.
- Delete materials and their stored files.
- Create quizzes on a lesson, module, or course.
- Add more than one quiz to the same target.
- Add multiple-choice, true or false, and written questions.
- Add points and images to quiz questions.
- Reorder and delete quizzes.
- Read quiz submissions.
- Grade written answers.
- Create groups from a course.
- Add students while creating a group.
- Edit group name, days, time, status, join code, and WhatsApp message.
- Require an entry code for a group.
- Generate entry codes with a maximum number of uses.
- Read entry-code usage and the students who used each code.
- Show an entry-code QR code and join link.
- Search students by phone number.
- Add students in bulk.
- Remove students from a group.
- Move a student between groups in the same course.
- Set per-group lesson unlock and hide settings.
- Set per-group quiz visibility.
- Send announcements to a group.
- Record attendance for each lesson.
- Read group statistics.
- Read the gradebook.
- Add manual grade columns.
- Enter manual grades and notes.
- Export gradebook data as CSV.
- Publish a teacher storefront and public course pages.
- Set a storefront theme, banner, colors, fonts, and marquee.
- Edit own profile, avatar, and banner.
- Read notifications.
- Use the mobile app for courses, curriculum, materials, quizzes, groups, pacing, roster, attendance, gradebook, statistics, announcements, storefront settings, profile, and notifications.

### 6.4 Parent

- Log in with phone number or email.
- Change a temporary password when the system requires it.
- Link to a child with the child's registered phone number.
- Unlink a child.
- Read the child's groups.
- Read the child's progress.
- Read the child's attendance.
- Read the child's quiz and manual grades.
- Read delivered monthly reports.
- Read notifications.
- Edit own profile and avatar.

Parents are read-only. They cannot change lessons, quizzes, grades, attendance, or group data.

### 6.5 Admin

- Read platform overview metrics.
- List, create, edit, suspend, delete, and restore teachers.
- List, create, edit, suspend, delete, and restore students.
- List, create, edit, suspend, delete, and restore parents.
- List, create, edit, delete, and restore courses.
- List, delete, and restore groups.
- Enroll a student in a group.
- Move a student between groups.
- Remove a student from a group.
- Create and delete parent links.
- Restore parent links.
- Manage grades.
- Manage semesters.
- Manage skill categories.
- Create admin roles and set permissions.
- Assign an admin role to an admin.
- Read and change notification settings.
- Send the monthly parent summary.
- Read the audit log.
- Read the error log tail.
- Set platform branding, logo, colors, and support contacts.

## 7. Shared Features

- Email and phone authentication.
- Session cookies.
- Sign-in lockout after repeated failures.
- Request rate limits.
- Forced password change for temporary passwords.
- Role-based access control.
- Admin permission checks.
- Soft delete for users, courses, groups, and parent links.
- Account suspension.
- Restore flows for deleted records.
- Arabic-first interface with right-to-left layout.
- English interface switch.
- Teacher-specific public theme.
- Platform-wide branding and support contacts.
- In-app notifications.
- Email and WhatsApp notification adapters.
- Monthly parent summary.
- Presigned file uploads and downloads.
- Avatar upload for all roles.
- Banner upload for teachers.
- Course cover upload for teachers.
- Quiz question image upload for teachers.
- Attachment cleanup after failed saves.
- CSV export with spreadsheet formula protection.
- Audit log for mutating API calls.
- Structured request logs with request IDs.

## 8. Course and Group Model

- One teacher owns each course.
- One course has many modules.
- One module has many lessons.
- One lesson has many materials.
- One lesson, module, or course can have many quizzes.
- One course has many groups.
- One group has many students.
- One student can join many groups.
- One parent can link to many students.
- One student can link to many parents.
- Group enrollment is the source of course access.
- A lesson can be unlocked or hidden for each group.
- A quiz can be hidden for each group.
- A group can require an entry code.
- An entry code records each student's first use.

## 9. Assessment and Gradebook

The gradebook has two column types:

- **Quiz columns**: The system calculates these from the best quiz attempt for each student in the group.
- **Manual columns**: The teacher enters these scores and optional notes.

The gradebook shows students and columns in a grid. A missing value means that the student has no mark yet. A manual score cannot be more than the column maximum. Students see only their own grades.

Written quiz answers are not auto-graded. The attempt stays pending until the teacher grades all written answers.

## 10. Access and Security

- The system checks the session on each protected request.
- Suspended users cannot use the system.
- Deleted users cannot use the system.
- Students can read a lesson only when they are enrolled in a group for that course and the lesson is unlocked for at least one of their groups.
- Students can take a quiz only when they are enrolled and the quiz belongs to the group course.
- A hidden lesson is absent from the curriculum, lesson views, completion writes, and progress totals.
- A hidden quiz is absent from the curriculum and is rejected by direct reads and submissions for that group.
- Attendance is teacher-only for the group course.
- Parents can read only linked children.
- Teachers can manage only their own courses and groups.
- Admins can moderate courses and groups, but course content stays with the owning teacher.
- Entry codes are teacher-only for the group owner.
- Uploads use short-lived signed URLs.
- The API stores object keys, not permanent file URLs.

## 11. Mobile App

The mobile app has role-specific navigation stacks and bottom tabs.

- **Student**: home, groups, join, QR scan, curriculum, lesson, quiz, profile, notifications.
- **Teacher**: courses, curriculum, materials, quizzes, groups, pacing, roster, attendance, gradebook, statistics, announcements, entry codes, storefront settings, profile, notifications.
- **Parent**: linked children, progress, attendance, grades, reports, profile, notifications.
- **Admin**: no mobile app.

The app uses the same API as the web app. Development builds derive the API address from the Expo host. Release builds need a production API address.

## 12. Operations

- Docker Compose runs the web server, API, PostgreSQL, Redis, and S3-compatible storage.
- Caddy serves the web app, public pages, and API proxy.
- PostgreSQL stores application data.
- Redis is optional. It shares rate limits, lockout state, and job locks between API replicas.
- RustFS provides S3-compatible storage in development. Cloudflare R2 is the production option.
- Backups cover PostgreSQL and the object store.
- GitHub Actions runs type checks, tests, the frontend build, and Compose validation.
- The system writes audit rows for mutating authenticated API calls.
- The system keeps audit rows for 30 days.

## 13. Current Limits and Planned Features

Not built:

- Billing and checkout.
- Tutor directory with tutor-first search.
- Tutor ratings and reviews.
- Trial lesson booking.
- Group waitlists and seat reservations.
- In-app chat or messaging.
- Video hosting.
- Email verification.
- Password reset.
- Multi-factor authentication.
- Malware scanning for uploads.
- OTP challenge for parent linking.
- Marketplace commission and tutor payouts.

Planned or discussed:

- Tutor-first discovery with filters for subject, grade, curriculum, location, price, and availability.
- Verified reviews from enrolled students and parents.
- Trial lesson requests.
- Planned groups with minimum student counts.
- Referral codes and coupons.
- Tutor availability calendar.
- Automated WhatsApp reminders.
- Payout and invoice records.
- Tutor funnel analytics.
- Certificates and completion badges.

Teacher subscription plans (`Free`, `Early Bird`, `Pro`, `Ultimate`) are priced in `OMR` (Oman) or `EGP` (Egypt) based on the user's selected country and fulfilled directly by Administration via WhatsApp, promo codes, and referral gifts. Students and parents are always free.

## 14. Research Notes

Use these documents for more detail:

- `docs/architecture.md`: system map, modules, data model, and deployment.
- `docs/security.md`: authentication, role matrix, access rules, and storage rules.
- `docs/gradebook.md`: quiz columns, manual columns, and student grade view.
- `PRODUCT.md`: product purpose, users, positioning, and constraints.
- `docs/adr/`: architecture decisions.
