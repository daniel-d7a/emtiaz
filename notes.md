# Emtiaz — working notes

The backlog and UI audit that lived here are now tracked elsewhere:

- Work items: [`.scratch/lms-overhaul/issues/`](.scratch/lms-overhaul/issues/), [`.scratch/group-entry-codes/issues/`](.scratch/group-entry-codes/issues/), [`.scratch/top-teacher/issues/`](.scratch/top-teacher/issues/), [`.scratch/teacher-plans/issues/`](.scratch/teacher-plans/issues/), [`.scratch/onboarding-and-guidance/issues/`](.scratch/onboarding-and-guidance/issues/), [`.scratch/homework/issues/`](.scratch/homework/issues/), [`.scratch/platform-ops/issues/`](.scratch/platform-ops/issues/), [`.scratch/security-audit/issues/`](.scratch/security-audit/issues/), [`.scratch/logic-and-adr-audit/issues/`](.scratch/logic-and-adr-audit/issues/)
- Decisions: [`docs/adr/`](docs/adr/)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Access rules: [`docs/security.md`](docs/security.md)

Add new work as a ticket under the matching `.scratch/<feature>/issues/`
directory. Record a structural decision as an ADR. Do not keep a parallel
checklist here.

### Production Readiness & Infrastructure

- buy a domain & configure SSL/DNS
- transactional gateway (WhatsApp Business API / SMS gateway for Oman & Egypt, and email provider)
  - attendance absent alerts
  - homework / quiz deadlines
  - admin password delivery
- automated database backups (`pg_dump` encrypted & pushed to Cloudflare R2 bucket)
- production error tracking & observability (Sentry / APM)
- global NestJS `PostgresExceptionFilter` (map `22P02` invalid UUID to 400 Bad Request, `23505` to 409 Conflict)

### Developer Experience

- convert paths to absolute imports using `@/` as root (`tsconfig.json`, `vite.config.ts`)
- check monorepo config if needed
- contract parity check (ensure `shared/api.ts`, `frontend/src/lib/api.ts`, and `mobile/src/api.ts` stay aligned)

### Future Product & Engagement Ideas

- WhatsApp automated weekly digest for parents (attendance, homework completion, quiz grades)
- think about AI features that could be added
  - if teachers can upload the whole course curriculum to the platform, use AI to generate quizzes, questions, and extra materials
  - chatbot to answer questions about the platform for all kinds of users
  - AI tutor to guide students in answering homework/quiz questions without giving direct answers
- mobile offline caching (TanStack Query persistence with SQLite / MMKV for curriculum and instructions)
- recorded courses and online video library
- custom single-teacher sub-platforms with custom themes/domains
