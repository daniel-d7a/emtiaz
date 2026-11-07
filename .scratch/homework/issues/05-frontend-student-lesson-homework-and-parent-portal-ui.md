# 05: Frontend Student Lesson Homework Card & Parent Portal UI

**What to build:** Build the Student web UI for viewing homework in the lesson viewer with due date countdown banners, reference file downloads, a 3-way submission selector (text, link, file upload $\le$ 10MB), status badges, and teacher feedback with resubmission support. Build the Parent Portal Homework view showing linked children's assignments, due dates, scores, teacher feedback, and 24h urgency alerts.

**Blocked by:** [02: Student Submission Lifecycle, Revision Requests & Teacher Grading Engine](02-student-submission-revisions-and-grading-engine.md), [03: Gradebook Integration & Parent Portal Homework Backend](03-gradebook-and-parent-portal-homework-backend.md).

**Status:** done

- [x] Create `<LessonHomeworkCard />` in the Student Lesson view displaying homework title, instructions, reference file / link, due date countdown, and max score.
- [x] Add 3-way submission form (text input, URL input, or file upload with client-side 10MB validation).
- [x] Render live status badges (`Not Submitted`, `Submitted`, `Late`, `Graded`, `Revision Requested`) and show teacher feedback with a prominent "Resubmit" button when revision is requested.
- [x] Create Parent Portal Homework tab (`/parent`) displaying all homework assignments for each linked child with scores, teacher feedback, and urgent deadline warning pills.
- [x] Add all bilingual Arabic & English i18n keys to `frontend/src/lib/i18n.tsx`.
- [x] Verify with unit/component tests in `frontend/src/`.
