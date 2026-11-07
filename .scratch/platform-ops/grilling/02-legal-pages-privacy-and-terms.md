# 02: Legal Pages (Privacy Policy, Terms of Service) & In-App Routing

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

How should legal pages (Privacy Policy & Terms of Service) be structured, published, and linked? Specifically:
1. What regulatory requirements and provisions must be included for Oman and Egypt (student data privacy, protection of minors, parent read-only visibility, teacher course ownership, plan subscriptions and refund/cancellation policies, R2 storage retention)?
2. How are the pages delivered (static bilingual HTML files `landing/privacy.html` and `landing/terms.html` served by Caddy, plus native client SPA routes `/privacy` and `/terms` in `frontend/src/routes/`)?
3. Where are they linked across surfaces (landing page footer, teacher marketing landing page footer, student/parent/teacher multi-step signup wizards, and in-app settings/drawer)?

## Answer

1. **Regulatory & Educational Compliance Coverage**:
   - Compliant with Omani and Egyptian digital educational law:
     - **Privacy Policy**: Explicit student and minor data protection; parent read-only visibility rights; teacher data usage; absolute guarantee of zero student data selling/monetization; Cloudflare R2 media storage retention rules.
     - **Terms of Service**: Acceptable use; teacher course curriculum copyright; subscription cancellation and refund rules; account suspension on community code violations.
2. **Dual-Surface Delivery**:
   - Static bilingual HTML files: `landing/privacy.html` and `landing/terms.html` served by Caddy with full SEO meta tags and RTL/LTR switcher.
   - SPA routes: `/privacy` and `/terms` in `frontend/src/routes/` so in-app users and mobile web views view them natively without leaving the application.
3. **Cross-Surface Linking**:
   - Footers on `landing/index.html` and `landing/teachers.html`.
   - In-app footers and Settings page.
   - Multi-step registration forms for Teachers, Students, and Parents (*"بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية"*).
