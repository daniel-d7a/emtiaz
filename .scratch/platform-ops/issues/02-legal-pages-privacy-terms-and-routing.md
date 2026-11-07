# 02: Legal Pages (Privacy Policy, Terms of Service) & Multi-Surface Routing

**What to build:** Create bilingual (Arabic & English) Privacy Policy and Terms of Service covering Omani and Egyptian educational regulations, student and minor data protection, parent read-only visibility, teacher curriculum ownership, and subscription terms. Deliver them via static pages (`landing/privacy.html`, `landing/terms.html`) and in-app routes (`/privacy`, `/terms`), linking them from footers and multi-step registration forms.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Create `landing/privacy.html` and `landing/terms.html` with bilingual content, SEO meta tags, and language toggle matching the landing design system.
- [x] Create `/privacy` and `/terms` client routes in `frontend/src/pages/public/` or `frontend/src/routes/` with bilingual translation support.
- [x] Link Privacy Policy and Terms in the footers of `landing/index.html` and `landing/teachers.html`.
- [x] Link Privacy Policy and Terms in multi-step signup wizards for Teachers, Students, and Parents (*"بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية"*).
- [x] Verify `npm run build` in `frontend` and static rendering.
