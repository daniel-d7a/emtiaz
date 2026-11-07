# 01: Define Role-Specific Auth & Multi-Step Signup Wizard

**Type:** grilling
**Status:** resolved
**Blocked by:** None (can start immediately)

## Question

How do the separate login and multi-step onboarding screens work for each role (`Teacher`, `Student`, `Parent`) across web and mobile? Specifically:
1. How are the Auth routes and role switchers structured (e.g., `/login` and `/register` with distinct tabs/cards for Teacher, Student, and Parent, plus direct links `/login/$role` and `/register/$role`, and preserve `?join=` / `?entry=` params for students)?
2. For **Teachers**, how do the 4 onboarding steps in [notes.md](../../../notes.md) flow:
   - Step 1: Account credentials (`name`, `email`, `password`)
   - Step 2: Location & Phone (`country`: `OM` | `EG`, `phoneNumber` validated for that country)
   - Step 3: Teaching Focus (`ACADEMIC` → select or enter grades taught for their country; `GENERAL` → select or enter track from the 30 seeded categories)
   - Step 4: Congratulations screen → Enter dashboard
3. For **Students** and **Parents**, what are their tailored multi-step signup steps (e.g., Step 1: `name`, optional `email`, `password`; Step 2: `country` + `phoneNumber`; Step 3 for Student: optional `grade` or immediate group `joinCode` if they have one; Step 3 for Parent: optional `studentPhone` / child link; Step 4: Congratulations screen → Enter dashboard)?
4. Is account creation submitted at the end of Step 3 (before the Congratulations screen), or step-by-step?

## Answer

1. **Role-Specific Login & Signup Routes**:
   - `/login` and `/login/$role` (`teacher`, `student`, `parent`) render a role-branded login experience with a role tab switcher, tailored copy, and a direct link to `/register/$role` (preserving `?join=` and `?entry=` query parameters for students).
   - `/register` (role selector) and `/register/$role` render a dedicated multi-step onboarding wizard per role with a progress indicator and the persistent **Report Problem (WhatsApp)** button on every step.
2. **Teacher Multi-Step Wizard (4 Screens)**:
   - **Step 1 (Account)**: `name`, `email` (required), `password` (min 8 chars).
   - **Step 2 (Location & Phone)**: `country` (`OM` | `EG`) and `phoneNumber` validated for that country (`+968` or `+20`).
   - **Step 3 (Teaching Focus)**: Choose `ACADEMIC` (multi-select country-scoped `grades` + optional custom grade + academic subject) or `GENERAL` (select or enter a track from the 30 seeded bilingual `categories`).
   - **Step 4 (Congratulations)**: Account is created and authenticated at the end of Step 3; Step 4 congratulates the teacher, summarizes their setup and Free Plan quota, and enters `/teacher/dashboard`.
3. **Student & Parent Multi-Step Wizards (4 Screens)**:
   - **Student**: Step 1 (`name`, `password`, optional `email`) → Step 2 (`country`, `phoneNumber`) → Step 3 (country-scoped `grade` selection + optional `joinCode` / `entryCode`) → Step 4 (Congratulations → `/student/dashboard` or joined group).
   - **Parent**: Step 1 (`name`, `password`, optional `email`) → Step 2 (`country`, `phoneNumber`) → Step 3 (optional `studentPhone` child link) → Step 4 (Congratulations → `/parent/children`).
4. **Per-Step Validation**:
   - Clicking "Next" on Steps 1 and 2 validates fields and checks `email` / `phoneNumber` availability against the backend (`POST /api/onboarding/check-availability`) before advancing, and Step 3 submits the atomic registration.
