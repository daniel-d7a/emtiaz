# 01: Top Teacher Badge & Showcase on Student Landing Page

**What to build:** Allow Admins to designate exceptional teachers with a "Top Teacher / معلّم متميّز" badge. Display the badge prominently across the app (teacher public storefront `/t/<slug>`, course/group cards seen by students, and teacher profile), and spotlight Top Teachers in a showcase section on the main student landing page (`landing/index.html`).

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `users.isTopTeacher` boolean column added to schema (default `false`) with migration and serialized on `User`, `TeacherSummary`, and `PublicTeacher`.
- [x] Admin Teachers directory (`admin/Teachers.tsx`) allows toggling `isTopTeacher` via `PATCH /api/admin/teachers/:id` and records the change in `audit_logs`.
- [x] Public teacher storefront (`/t/<slug>`) and course/group cards display a distinctive verified "معلّم متميّز / Top Teacher" badge beside the teacher's name.
- [x] Student landing page (`landing/index.html`) includes a Top Teachers showcase section dynamically displaying public teachers who hold the badge with their avatar, name, subject, and link to their `/t/<slug>` storefront.
- [x] Integration and UI tests verify admin badge toggle, public serialization, and landing page rendering.
