# Phase-2 Roadmap (waves, max 8 small steps each)

Wave 1 — UI gaps where backend already exists:
 - [x] w1.1 Delete dead `StudentService.genJoinCode` duplicate
 - [x] w1.2 Teacher Dashboard: create-group form (backend: POST /api/teacher/courses/:id/groups)
 - [x] w1.3 Curriculum: module & lesson reorder buttons (backend: PUT .../modules/reorder, .../lessons/reorder)
 - [x] w1.4 Teacher Dashboard: publish toggle (backend: PATCH /api/teacher/courses/:id isPublished)
 - [x] w1.5 Join page: auto-enroll logged-in students via ?code= on login (`/join/:joinCode` exists; login redirect carries it already)

Wave 2 — admin coverage:
- [ ] w2.1 Admin UI: students tab (backend: GET /api/admin/students with filters)
- [ ] w2.2 Admin UI: courses tab (backend: GET /api/admin/courses, /api/admin/groups)
- [ ] w2.3 Pacing: unlock-all shortcut per module (loops over lessons)

Wave 3 — polish:
- [ ] w3.1 Teacher profile edit (name/phone)
- [ ] w3.2 Quiz retry policy surfaced (attempts limit if added to schema)
- [ ] w3.3 Seed admin user for first-run (email admin@emtiaz.om)
