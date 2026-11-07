# 02: Define Country-Scoped Grades & 30 Bilingual General Tracks Taxonomy

**Type:** grilling
**Status:** resolved
**Blocked by:** None (can start immediately)

## Question

What is the exact data model and seed list for country-scoped academic `grades` (`OM` vs. `EG`) and the 30 bilingual general course `categories` (tracks)? Specifically:
1. What exact academic grades should be seeded in Arabic and English for **Oman (`OM`)** vs. **Egypt (`EG`)** (e.g., Oman: Grades 1–12 or Grades 5–12; Egypt: Primary 4–6, Preparatory 1–3, Secondary 1–3 / الصف الأول الثانوي، الصف الثاني الثانوي، الصف الثالث الثانوي)?
2. What are the **30 bilingual General Course Tracks (`categories`)** to seed in Arabic and English (e.g., English, German, French, Arabic, IELTS/TOEFL, Programming, Web Development, AI & Data Science, Graphic Design, UI/UX, Digital Marketing, Video Editing, Accounting, Finance, Business Management, Excel & Office, Mathematics, Physics, Chemistry, Biology, Quran & Tajweed, Islamic Studies, Public Speaking, Photography, Drawing & Art, Music, Chess, Robotics, Exam Prep, Soft Skills)?
3. When a teacher types a **custom** grade or track that isn't in the seeded list during onboarding, should it be added to the shared table or marked as custom/approved so a typo by one teacher doesn't clutter the public dropdown for everyone else?
4. How does a teacher's selected `courseFocus` (`ACADEMIC` | `GENERAL`), taught `gradeIds`, and `subjectCategoryId` affect their New Course form and Admin taxonomy management?

## Answer

1. **Country-Scoped Bilingual Academic Grades (`grades` table)**:
   - Schema: `id`, `country` (`'OM' | 'EG'`), `nameAr`, `nameEn`, `displayOrder` (keeping `name` synced with `nameEn` or `nameAr` for backward compatibility).
   - **Oman (`OM` — 12 grades)**: Grades 1–12 (`الصف الأول` / `Grade 1` through `الصف الثاني عشر` / `Grade 12`).
   - **Egypt (`EG` — 12 grades)**:
     - Primary 1–6: `الصف الأول الابتدائي` / `1st Grade Primary Education` through `الصف السادس الابتدائي` / `6th Grade Primary Education`.
     - Preparatory 1–3: `الصف الأول الإعدادي` / `1st Grade Preparatory Education` through `الصف الثالث الإعدادي` / `3rd Grade Preparatory Education`.
     - Secondary 1–3: `الصف الأول الثانوي` / `1st Grade Secondary Education` through `الصف الثالث الثانوي` / `3rd Grade Secondary Education`.
2. **30 Seeded Bilingual General Tracks (`categories` table)**:
   - Schema: `id`, `nameAr`, `nameEn` (keeping `name` synced).
   - Seeded with the 30 approved bilingual tracks (English Language, English Speaking, IELTS & TOEFL Preparation, German, French, Arabic for Non-Native Speakers, Spanish, Turkish, Programming & Computer Science, Web & App Development, AI & Data Science, Cybersecurity & Networking, Graphic Design, UI/UX Design, Video Editing & Motion Graphics, Digital Marketing & Content Creation, Business & Entrepreneurship, Accounting & Finance, Excel & Office Productivity, Project Management, Quran & Tajweed, Islamic Studies, Mathematics & Mental Math, Robotics & Electronics, Public Speaking & Communication, Drawing & Fine Arts, Photography, Chess & Strategic Thinking, Standardized Test Preparation, Soft Skills & Personal Development).
3. **Custom User-Entered Grades & Tracks**:
   - Case-insensitively matched against existing `nameAr` / `nameEn`; if new, inserted into `grades` (scoped to the teacher's `country`) or `categories` with `nameAr = input, nameEn = input`, and editable in the Admin Taxonomy tab.
4. **Teacher Focus & Taught Grades Persistence**:
   - Add `courseFocus` (`'ACADEMIC' | 'GENERAL'`, default `'ACADEMIC'`) to `user` and create `teacher_grades` (`teacherId`, `gradeId`) join table.
   - New Course form defaults `courseType` to the teacher's `courseFocus` and filters grades by the teacher's `country` (prioritizing their `teacher_grades`); teachers can update their `courseFocus`, taught grades, and track anytime on their Profile page.
