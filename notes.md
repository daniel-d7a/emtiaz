# Emtiaz — working notes

The backlog and UI audit that lived here are now tracked elsewhere:

- Work items: [`.scratch/lms-overhaul/issues/`](.scratch/lms-overhaul/issues/), [`.scratch/group-entry-codes/issues/`](.scratch/group-entry-codes/issues/), [`.scratch/teacher-plans/issues/`](.scratch/teacher-plans/issues/), [`.scratch/onboarding-and-guidance/issues/`](.scratch/onboarding-and-guidance/issues/), [`.scratch/logic-and-adr-audit/issues/`](.scratch/logic-and-adr-audit/issues/)
- Decisions: [`docs/adr/`](docs/adr/)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Access rules: [`docs/security.md`](docs/security.md)

Add new work as a ticket under the matching `.scratch/<feature>/issues/`
directory. Record a structural decision as an ADR. Do not keep a parallel
checklist here.

- add a setting to groups that is on by default for requiring an entry code to enter
- add a button to print QR entry codes

- the landing page needs some looking into

- convert paths to absolute imports using the @ or ~ as root
- check monorepo config if needed

- buy a domain
- connect an email provider
- add reset password flow for user + from admin
- add legal pages
- add upload size limits per file, limit uploads per lesson

- check event logs, I want every event to be logged (creation, update, delete, enroll, ...etc) (courses, groups, quizes, ...etc)

- let's work on homework feature, where a teacher can add a homework file or link to lesson, and students should submit it, and then the teacher can mark it for them, and the grades appear on the platform

- add a feature of top teacher (name pending) that gives a teacher a badge that the student sees, and shows them on the student landing page

### just some ideas that shouldn't be implemented now

- think about AI features that could be added
  - if teachers can upload the whole course curriculum to the platform some way or another, then we can use AI to generate quizes, questions, extra materials
  - have a chat bot to answer questions about the platform for all kinds of users
  - have the same AI guide users in answering questions without giving them answers

- add whatsapp reminders
- add recorded courses
- add online recorded courses
- add custom single teacher sub platforms with custom designs
