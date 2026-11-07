# 01: Country-Scoped Bilingual Grades, 30 General Tracks & Teacher Focus Persistence

**What to build:** Upgrade `grades` to store `country` (`OM` | `EG`), `nameAr`, and `nameEn` (seeded with 12 Oman grades `1–12` and 12 Egypt grades `Primary 1–6, Prep 1–3, Secondary 1–3`), upgrade `categories` to store `nameAr` and `nameEn` (seeded with the 30 bilingual general tracks), persist each teacher's `courseFocus` (`ACADEMIC` | `GENERAL`), `onboardingCompletedAt`, and taught grades (`teacher_grades`), and wire country-filtered grades and focus defaults into Onboarding, Profile, New Course, and Admin Taxonomy.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `grades` stores `country` (`OM` | `EG`), `nameAr`, `nameEn`, and `displayOrder` (keeping `name` synced), seeded with Grades 1–12 for Oman and Primary 1–6, Preparatory 1–3, and Secondary 1–3 for Egypt in `seed.ts` and `test-helpers.ts`.
- [x] `categories` stores `nameAr` and `nameEn` (keeping `name` synced), seeded with the 30 bilingual General Course Tracks.
- [x] `user` stores `courseFocus` (`ACADEMIC` | `GENERAL`, default `'ACADEMIC'`) and `onboardingCompletedAt` (nullable timestamp), and `teacher_grades` links teachers to their taught `grades`.
- [x] `GET /api/onboarding/grades?country=OM|EG` and `GET /api/onboarding/categories` return bilingual taxonomy items; `POST /api/onboarding/teacher` and `PATCH /api/me` accept `courseFocus`, `gradeIds`, `customGrades`, `subject`, and `onboardingCompleted`.
- [x] Admin Taxonomy tab supports viewing, creating, and editing bilingual `nameAr` / `nameEn` (and `country` on `grades`), and New Course / Teacher Profile default to the teacher's `courseFocus` and country-filtered grades.
- [x] Integration tests verify seeded Oman/Egypt grades, 30 general categories, country filtering, custom grade/track creation, and teacher focus/grades persistence.
