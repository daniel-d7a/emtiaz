# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Teachers** in Oman, in two distinct modes: school-curriculum teachers (ACADEMIC, tied to grade and semester) and freelance skill instructors (GENERAL, e.g. English speaking, IELTS). They build curriculum, run cohorts, and share join links over WhatsApp.
- **Students**, typically on a phone, joining a specific cohort with a code or link and working through paced lessons and quizzes.
- **Parents**, who follow their children's progress and grades read-only.
- **Admins**, who operate the platform: directories, taxonomy (grades, semesters, skills), support contacts, and audit.

The product is Arabic-first (RTL) with an English switch; "سلطنة عُمان" is the canonical country name, not "عُمان".

## Product Purpose

A lightweight, cohort-based LMS for Oman. A teacher writes a course's master curriculum once, then runs many groups (cohorts) from it with per-group pacing, roster, and gradebook. Students enroll into one group rather than a course catalog. Parents get read-only visibility of their child's progress.

Success means teachers spend their time teaching rather than administering, and joining/using the product is frictionless for students and parents on a phone.

## Positioning

The combination a neighboring generic LMS could not truthfully copy:

- **Hybrid course taxonomy** — a course is either ACADEMIC (grade + semester) or GENERAL (shared skill), both in one system.
- **Course/group separation** — one curriculum, many cohorts, each with independent pacing, roster, gradebook, and join code.
- **WhatsApp-native enrollment** — 6-digit codes and shareable links are the primary distribution mechanism, not an afterthought.
- **Arabic-first, not translated** — RTL is the default layout, with English as the secondary switch.
- **Deliberately narrow MVP** — structured lessons, materials, and inline quizzes; no video platform.

## Operating Context

- WhatsApp is where teachers recruit and coordinate; join codes/links and share messages are shared there.
- The academic calendar (grades, semesters) and shared skill taxonomy are real, teacher-facing structures, shared across teachers where the model says so.
- Teachers have a public page at `/t/<slug>` and may publish courses there.
- Usage is phone-heavy; the Expo/React Native app is intended to substitute for the website for teachers, students, and parents.
- Admins configure platform-wide support contact details that appear in footers.
- The product is currently **pre-launch**: under development, no paying customers, and pricing on the landing pages is aspirational.

## Capabilities and Constraints

- Roles: ADMIN, TEACHER, STUDENT, PARENT, with hard role separation in navigation and pages.
- Courses, modules/units, lessons, polymorphic materials (files, links, embeds), quizzes with MCQ/true-false, manual grade columns, attendance, group pacing and visibility, announcements, in-app notifications, monthly parent summaries.
- Soft deletes and account suspension exist; deleted data should be inspectable and restorable.
- Billing/checkout is **not built**. Plans are shown on the landing page only.
- Video hosting is out of scope for now; the attachment model stays polymorphic so it can arrive later.
- Mobile and web are separate renderings of one product; the web is the canonical platform record.
- Deployment is self-hosted via Docker Compose (Caddy, NestJS, PostgreSQL, Redis, S3-compatible storage).

## Brand Commitments

- Name: **Emtiaz / امتياز**.
- Arabic-first RTL with an English switch; Arabic must not read as a translation of English.
- Country naming: "سلطنة عُمان".
- Teacher-facing branding extends to public teacher pages and, in future, to the groups students open.

## Evidence on Hand

No approved real evidence exists yet: no testimonials, case studies, press, customer names, or benchmarks. The demo student/teacher reviews and screenshots currently on the landing pages are fabricated demo content and must not be presented as real. Future work must not invent proof, customers, results, or deployment claims.

## Product Principles

1. **Teaching over administration** — every admin flow should cost the teacher fewer clicks than the alternative they use today.
2. **Parent-proof clarity** — if a parent cannot understand it unaided, it is not finished.
3. **Meet users in WhatsApp** — enrollment and sharing should work through the channel teachers already use.
4. **Arabic is the source language** — design and copy start in Arabic and RTL, then adapt to English.
5. **Cohort truth beats per-student special cases** — one curriculum, many groups; keep the model small and predictable.

## Accessibility & Inclusion

Baseline accessibility on every surface: labelled controls, visible focus, sufficient contrast, keyboard navigable on web, and genuine RTL (mirrored layout, not text-only translation). Known constraints are not yet documented beyond this baseline.
