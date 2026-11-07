import 'dotenv/config';
import {
  STUDENT1,
  closeApp,
  getApp,
  login,
  seedWorld,
  testPool,
  ADMIN,
  getUserByEmail,
} from '../../db/test-helpers';
import { AdminService } from './admin.service';

jest.setTimeout(120000);

let server: any;
let app: any;
let world: Awaited<ReturnType<typeof seedWorld>>;
let admin: Awaited<ReturnType<typeof login>>['session'];

beforeAll(async () => {
  const started = await getApp();
  server = started.server;
  app = started.app;
  world = await seedWorld();
  admin = (await login(server, ADMIN.email, ADMIN.password)).session;
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Phase 5: admin endpoints', () => {
  it('refuses non-admins', async () => {
    const t = (await login(server, 't@teacher.om', 'Passw0rd!123')).session;
    const res = await t.get('/api/admin/overview');
    expect([403, 500]).toContain(res.status);
  });

  it('overview returns correct counts', async () => {
    const res = await admin.get('/api/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.totalTeachers).toBeGreaterThanOrEqual(1);
    expect(res.body.totalStudents).toBeGreaterThanOrEqual(2);
    expect(res.body.totalCourses).toBeGreaterThanOrEqual(1);
    expect(res.body.totalGroups).toBeGreaterThanOrEqual(2);
    expect(res.body.academicCourses).toBeGreaterThanOrEqual(1);
  });

  it('teacher directory filters by status and search', async () => {
    const res = await admin.get('/api/admin/teachers');
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const res2 = await admin.get('/api/admin/teachers?search=salim');
    expect(res2.body.length).toBe(1);
    const res3 = await admin.get('/api/admin/teachers?status=ACTIVE');
    expect(res3.body.every((u: any) => u.isActive)).toBe(true);
  });

  it('teacher directory exposes counts, combined filters, create, and edit', async () => {
    const list = await admin.get('/api/admin/teachers?name=salim');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    const salim = list.body[0];
    expect(salim.subject.name).toBeDefined();
    expect(salim.courseCount).toBeGreaterThanOrEqual(1);
    expect(salim.groupCount).toBeGreaterThanOrEqual(2);
    expect(salim.uniqueStudentCount).toBeGreaterThanOrEqual(2);
    expect(salim).not.toHaveProperty('adminRoleId');
    expect(salim).not.toHaveProperty('image');
    expect(salim).not.toHaveProperty('landingBanner');

    const combined = await admin.get(
      `/api/admin/teachers?name=salim&phone=90000001&subjectId=${salim.subjectCategoryId}`,
    );
    expect(combined.body.map((t: any) => t.id)).toContain(salim.id);
    const mismatch = await admin.get(
      `/api/admin/teachers?name=salim&subjectId=00000000-0000-4000-8000-000000000000`,
    );
    expect(mismatch.body).toHaveLength(0);

    const email = 'created-teacher@test.om';
    const created = await admin.post('/api/admin/teachers').send({
      name: 'Created Teacher',
      email,
      password: 'Passw0rd!123',
      phoneNumber: '+96895550001',
      subject: 'Mathematics',
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.role).toBe('TEACHER');
    expect((await login(server, email, 'Passw0rd!123')).status).toBe(200);

    const edited = await admin
      .patch(`/api/admin/teachers/${id}`)
      .send({ name: 'Edited Teacher', phoneNumber: '+96895550002', isTopTeacher: true });
    expect(edited.status).toBe(200);
    expect(edited.body.name).toBe('Edited Teacher');
    expect(edited.body.phoneNumber).toBe('+96895550002');
    expect(edited.body.isTopTeacher).toBe(true);
    expect(edited.body).not.toHaveProperty('adminRoleId');
    expect(edited.body).not.toHaveProperty('image');
    expect(edited.body).not.toHaveProperty('landingBanner');
    const filtered = await admin.get('/api/admin/teachers?name=Edited');
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].isTopTeacher).toBe(true);
    const audit = await admin.get('/api/admin/audit?action=teacher.update');
    expect(audit.body.some((r: any) => r.targetId === id && r.metadata?.isTopTeacher === true)).toBe(true);

    const toggledOff = await admin
      .patch(`/api/admin/teachers/${id}`)
      .send({ isTopTeacher: false });
    expect(toggledOff.status).toBe(200);
    expect(toggledOff.body.isTopTeacher).toBe(false);
  });

  it('student directory filters, profile, create/edit, and group moves', async () => {
    const email = 'created-student@test.om';
    const invalid = await admin.post('/api/admin/students').send({
      name: 'No Phone',
      email: 'no-phone@test.om',
      password: 'Passw0rd!123',
    });
    expect(invalid.status).toBe(400);

    const created = await admin.post('/api/admin/students').send({
      name: 'Created Student',
      email,
      password: 'Passw0rd!123',
      phoneNumber: '+96895550010',
      gradeId: world.gradeId,
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.role).toBe('STUDENT');
    expect((await login(server, email, 'Passw0rd!123')).status).toBe(200);

    const byName = await admin.get('/api/admin/students?name=Created');
    expect(byName.body.map((s: any) => s.id)).toContain(id);
    const byPhone = await admin.get('/api/admin/students?phone=95550010');
    expect(byPhone.body.map((s: any) => s.id)).toContain(id);

    const edited = await admin
      .patch(`/api/admin/students/${id}`)
      .send({ name: 'Edited Student', phoneNumber: '+96895550011' });
    expect(edited.status).toBe(200);
    expect(edited.body.name).toBe('Edited Student');
    expect(edited.body.phoneNumber).toBe('+96895550011');

    expect((await admin.post(`/api/admin/students/${id}/enroll`).send({ groupId: world.group1 })).status).toBe(201);
    let profile = await admin.get(`/api/admin/students/${id}`);
    expect(profile.status).toBe(200);
    expect(profile.body.gradeName).toBeDefined();
    expect(Array.isArray(profile.body.parents)).toBe(true);
    expect(profile.body.groups).toHaveLength(1);
    expect(profile.body.groups[0].teacherName).toBeDefined();
    expect(profile.body.groups[0].joinedAt).toBeDefined();
    expect(typeof profile.body.groups[0].attendancePercent).toBe('number');
    expect(profile.body.quiz.attempts).toBe(0);

    expect(
      (await admin
        .patch(`/api/admin/students/${id}/groups/${world.group1}/move`)
        .send({ targetGroupId: world.group2 })).status,
    ).toBe(200);
    profile = await admin.get(`/api/admin/students/${id}`);
    expect(profile.body.groups.map((g: any) => g.groupId)).toEqual([world.group2]);

    expect(
      (await admin.delete(`/api/admin/students/${id}/groups/${world.group2}`)).status,
    ).toBe(200);
    profile = await admin.get(`/api/admin/students/${id}`);
    expect(profile.body.groups).toHaveLength(0);

    expect((await admin.delete(`/api/admin/users/${id}`)).status).toBe(200);
    expect(
      (await admin.get('/api/admin/students?name=Edited')).body,
    ).toHaveLength(0);
    expect(
      (await admin.post(`/api/admin/users/${id}/restore`)).status,
    ).toBe(201);
    expect(
      (await admin.get('/api/admin/students?name=Edited')).body.map((s: any) => s.id),
    ).toContain(id);

    const audit = await admin.get('/api/admin/audit?action=student.group.move');
    expect(audit.body.some((r: any) => r.targetId === world.group2)).toBe(true);
  });

  it('calculates student profile attendance percentage from held visible sessions', async () => {
    await testPool.query(`DELETE FROM lesson_attendance WHERE student_id = $1`, [world.s1.id]);

    let res = await admin.get(`/api/admin/students/${world.s1.id}`);
    expect(res.status).toBe(200);
    let group = res.body.groups.find((g: any) => g.groupId === world.group1);
    expect(group.attendancePercent).toBe(0);

    await testPool.query(
      `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1,$2,true)`,
      [world.lesson1, world.s1.id],
    );
    res = await admin.get(`/api/admin/students/${world.s1.id}`);
    group = res.body.groups.find((g: any) => g.groupId === world.group1);
    expect(group.attendancePercent).toBe(100);

    await testPool.query(
      `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1,$2,false)`,
      [world.lesson2, world.s1.id],
    );
    res = await admin.get(`/api/admin/students/${world.s1.id}`);
    group = res.body.groups.find((g: any) => g.groupId === world.group1);
    expect(group.attendancePercent).toBe(50);

    await testPool.query(
      `INSERT INTO group_lesson_access (group_id, lesson_id, is_hidden)
       VALUES ($1,$2,true)
       ON CONFLICT (group_id, lesson_id) DO UPDATE SET is_hidden = true`,
      [world.group1, world.lesson2],
    );
    res = await admin.get(`/api/admin/students/${world.s1.id}`);
    group = res.body.groups.find((g: any) => g.groupId === world.group1);
    expect(group.attendancePercent).toBe(100);

    await testPool.query(
      `UPDATE group_lesson_access SET is_hidden = false WHERE group_id = $1 AND lesson_id = $2`,
      [world.group1, world.lesson2],
    );
  });

  it('suspend/Activate a user and revoke their sessions', async () => {
    const s1 = await getUserByEmail(STUDENT1.email);
    const s = (await login(server, STUDENT1.email, STUDENT1.password)).session;
    await s.get('/api/student/groups'); // works

    const susp = await admin
      .patch(`/api/admin/users/${s1.id}/status`)
      .send({ isActive: false });
    expect(susp.status).toBe(200);

    // sessions revoked -> cookie dead
    const blocked = await s.get('/api/student/groups');
    expect(blocked.status).toBe(403);

    // fresh login blocked too
    const fresh = (await login(server, STUDENT1.email, STUDENT1.password))
      .session;
    const blocked2 = await fresh.get('/api/student/groups');
    expect(blocked2.status).toBe(403);

    // restore
    await admin
      .patch(`/api/admin/users/${s1.id}/status`)
      .send({ isActive: true });
    const sAgain = (await login(server, STUDENT1.email, STUDENT1.password))
      .session;
    expect((await sAgain.get('/api/student/groups')).status).toBe(200);
  });

  it('records admin actions in the audit log', async () => {
    const res = await admin.get('/api/admin/audit');
    expect(res.status).toBe(200);
    expect(res.body.some((r: any) => r.action === 'user.status')).toBe(true);
    expect(res.body[0].actorName).toBeDefined();
    const filtered = await admin.get('/api/admin/audit?action=user.status');
    expect(filtered.body.length).toBeGreaterThanOrEqual(1);
    expect(filtered.body.every((r: any) => r.action === 'user.status')).toBe(true);
    expect((await admin.get('/api/admin/audit?action=nope')).body).toHaveLength(0);
  });

  it('filters audit logs by userId (actor or target) and by category', async () => {
    const adminUser = await getUserByEmail(ADMIN.email);
    const teacherUser = await getUserByEmail('t@teacher.om');

    // Create an audit entry with teacherUser as targetId
    await app.get(AdminService).audit(
      adminUser.id,
      'teacher.update',
      'user',
      teacherUser.id,
      { note: 'test audit filter' },
    );

    // Filter by userId matching targetId
    const byTargetUser = await admin.get(`/api/admin/audit?userId=${teacherUser.id}`);
    expect(byTargetUser.status).toBe(200);
    expect(byTargetUser.body.some((r: any) => r.targetId === teacherUser.id)).toBe(true);

    // Filter by userId matching actorId
    const byActorUser = await admin.get(`/api/admin/audit?userId=${adminUser.id}`);
    expect(byActorUser.status).toBe(200);
    expect(byActorUser.body.some((r: any) => r.actorName === ADMIN.name)).toBe(true);

    // Filter by category USERS_AUTH
    const usersAuthRes = await admin.get('/api/admin/audit?category=USERS_AUTH');
    expect(usersAuthRes.status).toBe(200);
    expect(usersAuthRes.body.length).toBeGreaterThanOrEqual(1);
    expect(
      usersAuthRes.body.every((r: any) =>
        [
          'user.password.reset',
          'user.status',
          'user.delete',
          'user.restore',
          'teacher.create',
          'teacher.update',
          'student.create',
          'student.update',
          'parent.create',
          'parent.update',
          'parent.link.create',
          'parent.link.delete',
          'parent.link.restore',
          'role.create',
          'role.update',
          'role.assign',
        ].includes(r.action),
      ),
    ).toBe(true);

    // Filter by category CURRICULUM
    const curriculumRes = await admin.get('/api/admin/audit?category=CURRICULUM');
    expect(curriculumRes.status).toBe(200);
    expect(
      curriculumRes.body.every((r: any) =>
        [
          'course.create',
          'course.update',
          'course.delete',
          'course.restore',
          'lesson.create',
          'lesson.update',
          'lesson.delete',
        ].includes(r.action),
      ),
    ).toBe(true);

    // Filter by non-existent category returns empty
    const invalidCat = await admin.get('/api/admin/audit?category=INVALID_CATEGORY');
    expect(invalidCat.status).toBe(200);
    expect(invalidCat.body).toHaveLength(0);
  });

  it('logs mutating endpoint calls with actor, filters, and redacted data', async () => {
    const teacher = (await login(server, 't@teacher.om', 'Passw0rd!123')).session;
    expect(
      (await teacher.patch('/api/me').send({ name: 'Salim Audit', password: 'S3cret!' })).status,
    ).toBe(200);

    const byActor = await admin.get('/api/admin/audit?actor=90000001&target=endpoint');
    const row = byActor.body.find(
      (r: any) => r.action === 'PATCH /api/me' && r.actorPhone === '+96890000001',
    );
    expect(row).toBeDefined();
    expect(row.actorRole).toBe('TEACHER');
    expect(row.responseType).toBe('success');
    expect(row.endpoint).toBeDefined();
    expect(row.metadata.body.name).toBe('Salim Audit');
    expect(row.metadata.body.password).toBe('[redacted]');

    const byRole = await admin.get('/api/admin/audit?actorRole=TEACHER&target=endpoint');
    expect(byRole.body.every((r: any) => r.actorRole === 'TEACHER')).toBe(true);
    await teacher.patch('/api/me').send({ name: 'Salim' });
  });

  it('removes audit rows older than 30 days', async () => {
    const actor = await getUserByEmail(ADMIN.email);
    await testPool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, created_at)
       VALUES ($1, 'old.action', 'old', now() - interval '31 days')`,
      [actor.id],
    );
    await app.get(AdminService).onApplicationBootstrap();
    const { rows } = await testPool.query(
      `SELECT 1 FROM audit_logs WHERE action='old.action'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('tails the last 500 error lines with polling-friendly output', async () => {
    const fs = await import('fs/promises');
    const file = '/tmp/emtiaz-error-tail-test.log';
    process.env.ERROR_LOG_FILE = file;
    await fs.writeFile(
      file,
      Array.from({ length: 600 }, (_, i) => `error line ${i + 1}`).join('\n'),
    );
    const res = await admin.get('/api/admin/errors/tail');
    expect(res.status).toBe(200);
    expect(res.body.file).toBe(file);
    expect(res.body.lines).toHaveLength(500);
    expect(res.body.lines[0]).toBe('error line 101');
    expect(res.body.lines.at(-1)).toBe('error line 600');
    await fs.unlink(file);
  });

  it('soft-deletes users: row stays, sessions go, memberships preserved, listings hide it', async () => {
    const id = 'soft-delete-test-user';
    await testPool.query(
      `INSERT INTO "user" (id, name, email, role) VALUES ($1,$2,$3,'STUDENT')`,
      [id, 'Soft Delete', 'soft-delete@test.om'],
    );
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1,$2)`,
      [world.group1, id],
    );

    const res = await admin.delete(`/api/admin/users/${id}`);
    expect(res.status).toBe(200);

    const { rows } = await testPool.query(
      `SELECT is_active, deleted_at FROM "user" WHERE id=$1`,
      [id],
    );
    expect(rows[0].is_active).toBe(false);
    expect(rows[0].deleted_at).not.toBeNull();

    // ADR-0023: group_students membership row is preserved so restoreUser recovers it intact
    const memberships = await testPool.query(
      `SELECT 1 FROM group_students WHERE student_id=$1`,
      [id],
    );
    expect(memberships.rowCount).toBe(1);

    const list = await admin.get('/api/admin/students');
    expect(list.body.some((u: any) => u.id === id)).toBe(false);

    expect((await admin.delete(`/api/admin/users/${id}`)).status).toBe(404);
  });

  it('soft-delete preserves group memberships, attendance, and quiz attempts; restoreUser restores them completely intact', async () => {
    const studentEmail = 'softdelete-preserve@student.om';
    const reg = await admin.post('/api/onboarding/student').send({
      email: studentEmail,
      password: 'Passw0rd!123',
      name: 'Preserve Student',
      phoneNumber: '+96898881234',
    });
    expect(reg.status).toBe(201);
    const studentUser = await getUserByEmail(studentEmail);

    try {
      // Enroll into world.group1
      await admin.post(`/api/admin/students/${studentUser.id}/enroll`).send({ groupId: world.group1 });

      // Record attendance
      await testPool.query(
        `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1, $2, true)
         ON CONFLICT (lesson_id, student_id) DO UPDATE SET is_present = true`,
        [world.lesson1, studentUser.id],
      );

      // Record quiz attempt
      await testPool.query(
        `INSERT INTO quiz_attempts (quiz_id, group_id, student_id, score, max_score, pending, answers_json) VALUES ($1, $2, $3, 10, 10, false, '{}')`,
        [world.quiz, world.group1, studentUser.id],
      );

      // Soft delete the student
      const delRes = await admin.delete(`/api/admin/users/${studentUser.id}`);
      expect(delRes.status).toBe(200);

      // Invariant: group_students, attendance, and quiz_attempts MUST remain intact in DB
      const mRows = await testPool.query(`SELECT 1 FROM group_students WHERE student_id = $1`, [studentUser.id]);
      expect(mRows.rowCount).toBe(1);
      const aRows = await testPool.query(`SELECT 1 FROM lesson_attendance WHERE student_id = $1`, [studentUser.id]);
      expect(aRows.rowCount).toBe(1);
      const qRows = await testPool.query(`SELECT 1 FROM quiz_attempts WHERE student_id = $1`, [studentUser.id]);
      expect(qRows.rowCount).toBe(1);

      // Query active student directory: soft-deleted student is hidden
      const activeList = await admin.get('/api/admin/students?search=Preserve');
      expect(activeList.body.some((s: any) => s.id === studentUser.id)).toBe(false);

      // Restore user
      const restRes = await admin.post(`/api/admin/users/${studentUser.id}/restore`);
      expect(restRes.status).toBe(201);

      // Student is back in active listing with their groups intact
      const afterRestore = await admin.get('/api/admin/students?search=Preserve');
      expect(afterRestore.body.some((s: any) => s.id === studentUser.id)).toBe(true);
      const restoredRow = afterRestore.body.find((s: any) => s.id === studentUser.id);
      expect(restoredRow.enrollments.some((g: any) => g.groupName === 'Grade 10 Sun Tue')).toBe(true);
    } finally {
      await testPool.query(`DELETE FROM quiz_attempts WHERE student_id = $1`, [studentUser.id]);
      await testPool.query(`DELETE FROM lesson_attendance WHERE student_id = $1`, [studentUser.id]);
      await testPool.query(`DELETE FROM group_students WHERE student_id = $1`, [studentUser.id]);
      await testPool.query(`DELETE FROM "user" WHERE id = $1`, [studentUser.id]);
    }
  });

  it('rejects admin enroll and move student when target group is inactive', async () => {
    // Create an inactive group
    const { rows: [inactiveGroup] } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active) VALUES ($1, 'Inactive Cohort', 'OM8881', false) RETURNING id`,
      [world.courseId],
    );

    // Admin enroll into inactive group -> 400 Bad Request
    const enrollRes = await admin
      .post(`/api/admin/students/${world.s1.id}/enroll`)
      .send({ groupId: inactiveGroup.id });
    expect(enrollRes.status).toBe(400);
    expect(enrollRes.body.message).toContain('inactive');

    // Admin move into inactive group -> 400 Bad Request
    const moveRes = await admin
      .patch(`/api/admin/students/${world.s1.id}/groups/${world.group1}/move`)
      .send({ targetGroupId: inactiveGroup.id });
    expect(moveRes.status).toBe(400);
    expect(moveRes.body.message).toContain('inactive');

    await testPool.query(`DELETE FROM groups WHERE id = $1`, [inactiveGroup.id]);
  });

  it('lists deleted users and restores sign-in', async () => {
    const email = 'restore-me@student.om';
    const created = await admin.post('/api/onboarding/student').send({
      email,
      password: 'Passw0rd!123',
      name: 'Restore Me',
      phoneNumber: '+96895551234',
    });
    expect(created.status).toBe(201);
    const user = await getUserByEmail(email);

    expect((await admin.delete(`/api/admin/users/${user.id}`)).status).toBe(200);
    const normal = await admin.get('/api/admin/students?search=restore-me');
    expect(normal.body.some((u: any) => u.id === user.id)).toBe(false);
    const deleted = await admin.get('/api/admin/students?deleted=true&search=restore-me');
    expect(deleted.body.some((u: any) => u.id === user.id)).toBe(true);

    expect((await admin.delete(`/api/admin/users/${user.id}`)).status).toBe(404);
    expect(
      (await admin.post(`/api/admin/users/${user.id}/restore`)).status,
    ).toBe(201);
    const restored = (await login(server, email, 'Passw0rd!123')).session;
    expect((await restored.get('/api/student/groups')).status).toBe(200);
    expect(
      (await admin.post(`/api/admin/users/${user.id}/restore`)).status,
    ).toBe(404);
  });

  it('lists and restores deleted courses, groups, and parent links', async () => {
    const teacher = (await login(server, 't@teacher.om', 'Passw0rd!123')).session;

    expect((await admin.delete(`/api/admin/courses/${world.courseId}`)).status).toBe(200);
    expect(
      (await admin.get('/api/admin/courses?deleted=true')).body.some(
        (c: any) => c.id === world.courseId,
      ),
    ).toBe(true);
    expect(
      (await admin.get('/api/admin/courses')).body.some(
        (c: any) => c.id === world.courseId,
      ),
    ).toBe(false);
    expect(
      (await teacher.get('/api/teacher/courses')).body.some(
        (c: any) => c.id === world.courseId,
      ),
    ).toBe(false);
    expect(
      (await admin.post(`/api/admin/courses/${world.courseId}/restore`)).status,
    ).toBe(201);
    expect(
      (await teacher.get('/api/teacher/courses')).body.some(
        (c: any) => c.id === world.courseId,
      ),
    ).toBe(true);

    expect((await admin.delete(`/api/admin/groups/${world.group2}`)).status).toBe(200);
    expect(
      (await admin.get('/api/admin/groups?deleted=true')).body.some(
        (g: any) => g.id === world.group2,
      ),
    ).toBe(true);
    expect(
      (await admin.get('/api/admin/groups')).body.some(
        (g: any) => g.id === world.group2,
      ),
    ).toBe(false);
    expect(
      (await admin.post(`/api/admin/groups/${world.group2}/restore`)).status,
    ).toBe(201);
    expect(
      (await admin.get('/api/admin/groups')).body.some(
        (g: any) => g.id === world.group2,
      ),
    ).toBe(true);

    const parentId = 'test-parent-admin';
    await testPool.query(
      `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Umm Aisha', 'parent-admin@test.om', 'PARENT') ON CONFLICT DO NOTHING`,
      [parentId],
    );
    await testPool.query(
      `INSERT INTO parent_students (parent_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [parentId, world.s1.id],
    );
    expect(
      (await admin.delete(`/api/admin/parent-links/${parentId}/${world.s1.id}`)).status,
    ).toBe(200);
    const deletedLinks = await admin.get('/api/admin/parent-links?deleted=true');
    expect(
      deletedLinks.body.some(
        (l: any) => l.parentId === parentId && l.studentId === world.s1.id,
      ),
    ).toBe(true);
    const noChild = await admin.get('/api/admin/parents?search=parent-admin');
    expect(noChild.body[0].children).toHaveLength(0);
    expect(
      (await admin.post(`/api/admin/parent-links/${parentId}/${world.s1.id}/restore`)).status,
    ).toBe(201);
    const withChild = await admin.get('/api/admin/parents?search=parent-admin');
    expect(withChild.body[0].children.map((c: any) => c.id)).toContain(world.s1.id);

    const audit = await admin.get('/api/admin/audit?action=course.restore');
    expect(audit.body.length).toBeGreaterThanOrEqual(1);
  });

  it('student directory filters by grade, group and shrieking search', async () => {
    const res = await admin.get('/api/admin/students');
    expect(res.body).toHaveLength(await countStudents());
    expect(res.body[0].enrollments).toBeDefined();

    const byGroup = await admin.get(
      `/api/admin/students?groupId=${world.group1}`,
    );
    expect(byGroup.status).toBe(200);
    await admin.get(`/api/admin/students?search=huda`);

    const emptyForeign = await admin.get(
      `/api/admin/students?teacherId=00000000-0000-4000-8000-000000000000`,
    );
    expect(emptyForeign.body).toHaveLength(0);
  });

  it('parent directory lists linked children only', async () => {
    await testPool.query(
      `INSERT INTO "user" (id, name, email, role) VALUES ('test-parent-admin', 'Umm Aisha', 'parent-admin@test.om', 'PARENT') ON CONFLICT DO NOTHING`,
    );
    await testPool.query(
      `INSERT INTO parent_students (parent_id, student_id) VALUES ('test-parent-admin', $1) ON CONFLICT DO NOTHING`,
      [world.s1.id],
    );
    const res = await admin.get('/api/admin/parents?search=parent-admin');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].children.map((c: any) => c.id)).toContain(world.s1.id);
  });

  it('parent directory creates, edits, filters, profiles, and manages children', async () => {
    const email = 'created-parent@test.om';
    const created = await admin.post('/api/admin/parents').send({
      name: 'Created Parent',
      email,
      password: 'Passw0rd!123',
      phoneNumber: '+96895550020',
      monitoringCode: world.s1.monitoringCode,
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.role).toBe('PARENT');
    expect((await login(server, email, 'Passw0rd!123')).status).toBe(200);

    const byName = await admin.get('/api/admin/parents?name=Created');
    expect(byName.body.map((p: any) => p.id)).toContain(id);
    const byPhone = await admin.get('/api/admin/parents?phone=95550020');
    expect(byPhone.body.map((p: any) => p.id)).toContain(id);

    const edited = await admin
      .patch(`/api/admin/parents/${id}`)
      .send({ name: 'Edited Parent', phoneNumber: '+96895550021' });
    expect(edited.status).toBe(200);
    expect(edited.body.name).toBe('Edited Parent');

    await testPool.query(
      `INSERT INTO parent_reports (parent_id, student_id, message) VALUES ($1,$2,'Monthly report')`,
      [id, world.s1.id],
    );
    await testPool.query(
      `INSERT INTO notifications (channel, type, recipient, message) VALUES ('whatsapp','PARENT','+96895550021','Delivered report')`,
    );
    let profile = await admin.get(`/api/admin/parents/${id}`);
    expect(profile.status).toBe(200);
    expect(profile.body.children.map((c: any) => c.id)).toContain(world.s1.id);
    expect(profile.body.feedback[0].message).toBe('Monthly report');
    expect(profile.body.deliveredReports.some((n: any) => n.message === 'Delivered report')).toBe(true);
    expect(profile.body.deliveredReports.every((n: any) => !('recipient' in n))).toBe(true);

    expect(
      (await admin.post('/api/admin/parent-links').send({
        parentId: id,
        studentId: world.s2.id,
      })).status,
    ).toBe(201);
    profile = await admin.get(`/api/admin/parents/${id}`);
    expect(profile.body.children).toHaveLength(2);

    expect(
      (await admin.delete(`/api/admin/parent-links/${id}/${world.s2.id}`)).status,
    ).toBe(200);
    profile = await admin.get(`/api/admin/parents/${id}`);
    expect(profile.body.children.map((c: any) => c.id)).not.toContain(world.s2.id);

    expect((await admin.delete(`/api/admin/users/${id}`)).status).toBe(200);
    expect((await admin.get('/api/admin/parents?name=Edited')).body).toHaveLength(0);
    expect((await admin.post(`/api/admin/users/${id}/restore`)).status).toBe(201);
    expect((await admin.get('/api/admin/parents?name=Edited')).body.map((p: any) => p.id)).toContain(id);

    const audit = await admin.get('/api/admin/audit?action=parent.link.create');
    expect(audit.body.some((r: any) => r.targetId === world.s2.id)).toBe(true);
  });

  it('caps admin lists with limit', async () => {
    expect((await admin.get('/api/admin/teachers?limit=1')).body).toHaveLength(1);
    expect((await admin.get('/api/admin/students?limit=1')).body).toHaveLength(1);
    expect((await admin.get('/api/admin/parents?limit=1')).body.length).toBeLessThanOrEqual(1);
    expect((await admin.get('/api/admin/courses?limit=1')).body).toHaveLength(1);
  });

  async function countStudents() {
    const { rows } = await testPool.query(
      `SELECT COUNT(*)::int AS c FROM "user" WHERE role='STUDENT' AND deleted_at IS NULL`,
    );
    return rows[0].c;
  }

  it('course explorer filters academic/general and includes group headcounts', async () => {
    const all = await admin.get('/api/admin/courses');
    expect(all.status).toBe(200);
    const physics = all.body.find((c: any) => c.title === 'Physics 10');
    expect(physics.teacherName).toBe('Salim');
    const g1 = physics.groups.find((g: any) => g.id === world.group1);
    expect(g1.studentCount).toBe(2);

    const academic = await admin.get('/api/admin/courses?courseType=ACADEMIC');
    expect(
      academic.body.every((c: any) => c.courseType === 'ACADEMIC'),
    ).toBe(true);
  });

  it('creates and edits courses with combined filters', async () => {
    const created = await admin.post('/api/admin/courses').send({
      title: 'Admin Created Course',
      teacherId: world.teacher.id,
      courseType: 'GENERAL',
      categoryId: world.categoryId,
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.courseType).toBe('GENERAL');

    const combined = await admin.get(
      `/api/admin/courses?name=Admin%20Created&categoryId=${world.categoryId}&teacherId=${world.teacher.id}`,
    );
    expect(combined.body.map((c: any) => c.id)).toContain(id);
    expect(combined.body[0].categoryName).toBeDefined();
    expect(combined.body[0].groups).toEqual([]);

    const edited = await admin
      .patch(`/api/admin/courses/${id}`)
      .send({ title: 'Admin Edited Course', courseType: 'ACADEMIC', gradeId: world.gradeId });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Admin Edited Course');
    expect(edited.body.courseType).toBe('ACADEMIC');
    expect(edited.body.gradeId).toBe(world.gradeId);
    const filtered = await admin.get('/api/admin/courses?name=Admin%20Edited');
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].gradeName).toBeDefined();

    expect(
      (await admin.get('/api/admin/courses?name=Physics%2010')).body[0].groups.length,
    ).toBeGreaterThanOrEqual(2);
    const audit = await admin.get('/api/admin/audit?action=course.create');
    expect(audit.body.some((r: any) => r.targetId === id)).toBe(true);
  });

  it('can manually enroll a student into a group', async () => {
    const s1 = await getUserByEmail(STUDENT1.email);
    const res = await admin
      .post(`/api/admin/students/${s1.id}/enroll`)
      .send({ groupId: world.group1 }); // already enrolled, idempotent
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it('toggles notification channels', async () => {
    const initial = await admin.get('/api/admin/notification-settings');
    expect(initial.status).toBe(200);
    expect(initial.body.emailEnabled).toBe(true);

    const off = await admin
      .patch('/api/admin/notification-settings')
      .send({
        emailEnabled: false,
        adminEnabled: false,
        supportEmail: 'help@emtiaz.om',
        supportWhatsapp: '+96895550000',
        primaryColor: '#123456',
        secondaryColor: '#654321',
        logoUrl: 'https://example.com/logo.png',
      });
    expect(off.status).toBe(200);
    expect(off.body.emailEnabled).toBe(false);
    expect(off.body.adminEnabled).toBe(false);
    expect(off.body.supportEmail).toBe('help@emtiaz.om');
    expect(off.body.primaryColor).toBe('#123456');

    const persisted = await admin.get('/api/admin/notification-settings');
    expect(persisted.body.emailEnabled).toBe(false);
    expect(persisted.body.supportWhatsapp).toBe('+96895550000');
    expect(persisted.body.secondaryColor).toBe('#654321');

    const invalid = await admin
      .patch('/api/admin/notification-settings')
      .send({ primaryColor: 'teal' });
    expect(invalid.status).toBe(400);

    const empty = await admin.patch('/api/admin/notification-settings').send({});
    expect(empty.status).toBe(400);

    const log = await admin.get('/api/admin/notifications');
    expect(log.status).toBe(200);
    expect(Array.isArray(log.body)).toBe(true);
    expect(log.body.every((n: any) => !('recipient' in n))).toBe(true);

    await admin
      .patch('/api/admin/notification-settings')
      .send({ emailEnabled: true, adminEnabled: true });
  });

  it('enforces admin role permissions and audits role changes', async () => {
    const created = await admin
      .post('/api/admin/roles')
      .send({ name: 'Overview only', permissions: ['overview'] });
    expect(created.status).toBe(201);
    expect(created.body.permissions).toEqual(['overview']);

    const adminUser = await getUserByEmail(ADMIN.email);
    await testPool.query('UPDATE "user" SET admin_role_id=$1 WHERE id=$2', [
      created.body.id,
      adminUser.id,
    ]);

    const permissions = await admin.get('/api/admin/permissions');
    expect(permissions.body).toEqual(['overview']);
    expect((await admin.get('/api/admin/overview')).status).toBe(200);
    expect((await admin.get('/api/admin/teachers')).status).toBe(403);

    await testPool.query('UPDATE "user" SET admin_role_id=NULL WHERE id=$1', [adminUser.id]);
    expect((await admin.get('/api/admin/teachers')).status).toBe(200);

    const renamed = await admin
      .patch(`/api/admin/roles/${created.body.id}`)
      .send({ name: 'Overview only role' });
    expect(renamed.body.name).toBe('Overview only role');

    const audit = await admin.get('/api/admin/audit?action=role.create');
    expect(audit.body.some((row: any) => row.targetId === created.body.id)).toBe(true);
  });

  describe('taxonomy', () => {
    it('CRUD semesters', async () => {
      const created = await admin
        .post('/api/admin/taxonomy/semesters')
        .send({ name: 'Summer', displayOrder: 3 });
      expect(created.status).toBe(201);

      const list = await admin.get('/api/admin/taxonomy/semesters');
      expect(list.body.some((s: any) => s.name === 'Summer')).toBe(true);

      const renamed = await admin
        .put(`/api/admin/taxonomy/semesters/${created.body.id}`)
        .send({ name: 'Summer term' });
      expect(renamed.body.name).toBe('Summer term');

      await admin.delete(`/api/admin/taxonomy/semesters/${created.body.id}`);
      const after = await admin.get('/api/admin/taxonomy/semesters');
      expect(after.body.some((s: any) => s.id === created.body.id)).toBe(false);
    });

    it('CRUD grades', async () => {
      const created = await admin
        .post('/api/admin/taxonomy/grades')
        .send({ name: 'Grade 13', displayOrder: 99 });
      expect(created.status).toBe(201);

      const list = await admin.get('/api/admin/taxonomy/grades');
      expect(list.body.some((g: any) => g.name === 'Grade 13')).toBe(true);

      await admin
        .put(`/api/admin/taxonomy/grades/${created.body.id}`)
        .send({ name: 'Grade 13 Advanced' });
      await admin.delete(`/api/admin/taxonomy/grades/${created.body.id}`);

      const stat = await admin.get('/api/admin/taxonomy/grades');
      expect(stat.body.some((g: any) => g.name === 'Grade 13')).toBe(false);
    });

    it('CRUD categories and forbids students from writing', async () => {
      const s = (await login(server, STUDENT1.email, STUDENT1.password)).session;
      const denied = await s
        .post('/api/admin/taxonomy/categories')
        .send({ name: 'Nope' });
      expect([403, 500]).toContain(denied.status);

      const created = await admin
        .post('/api/admin/taxonomy/categories')
        .send({ name: 'Chess Club' });
      expect(created.status).toBe(201);
      await admin
        .put(`/api/admin/taxonomy/categories/${created.body.id}`)
        .send({ name: 'Chess Academy' });
      const res = await admin.delete(
        `/api/admin/taxonomy/categories/${created.body.id}`,
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Admin Plans, Promo Codes & Teacher Entitlements Drawer', () => {
    it('manages plans: list, create custom plan, and update', async () => {
      const listRes = await admin.get('/api/admin/plans');
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(4);

      const proPlan = listRes.body.find((p: any) => p.slug === 'pro');
      expect(proPlan).toBeDefined();

      const customPlanSlug = `vip-${Date.now()}`;
      const createRes = await admin.post('/api/admin/plans').send({
        slug: customPlanSlug,
        nameAr: 'خطة خاصة',
        nameEn: 'Special VIP Plan',
        monthlyPriceOmr: 50,
        yearlyMonthlyPriceOmr: 40,
        monthlyPriceEgp: 2000,
        yearlyMonthlyPriceEgp: 1600,
        maxStudents: 1000,
        maxStorageBytes: 107374182400,
        isPublic: false,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.slug).toBe(customPlanSlug);

      const updateRes = await admin
        .patch(`/api/admin/plans/${createRes.body.id}`)
        .send({
          nameEn: 'Updated VIP Plan',
          monthlyPriceOmr: 60,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.nameEn).toBe('Updated VIP Plan');
      expect(updateRes.body.monthlyPriceOmr).toBe(60);

      const auditRes = await admin.get('/api/admin/audit?action=plan.create');
      expect(auditRes.body.some((a: any) => a.targetId === createRes.body.id)).toBe(true);
    });

    it('updates platform billing settings in notification-settings', async () => {
      const patchRes = await admin.patch('/api/admin/notification-settings').send({
        yearlyPlanDiscountEnabled: true,
        referralPlanSlug: 'early-bird',
        referralGiftDays: 14,
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.yearlyPlanDiscountEnabled).toBe(true);
      expect(patchRes.body.referralGiftDays).toBe(14);

      const getRes = await admin.get('/api/admin/notification-settings');
      expect(getRes.status).toBe(200);
      expect(getRes.body.yearlyPlanDiscountEnabled).toBe(true);
      expect(getRes.body.referralGiftDays).toBe(14);
    });

    it('manages promo codes: create, list, and update isActive', async () => {
      const plansRes = await admin.get('/api/admin/plans');
      const earlyBird = plansRes.body.find((p: any) => p.slug === 'early-bird');

      const promoCode = `PROMO${Date.now()}`;
      const createRes = await admin.post('/api/admin/promo-codes').send({
        code: promoCode,
        planId: earlyBird.id,
        durationDays: 45,
        maxUses: 25,
      });
      expect(createRes.status).toBe(201);
      expect(createRes.body.code).toBe(promoCode);
      expect(createRes.body.planSlug).toBe('early-bird');
      expect(createRes.body.durationDays).toBe(45);
      expect(createRes.body.maxUses).toBe(25);
      expect(createRes.body.isActive).toBe(true);

      const listRes = await admin.get('/api/admin/promo-codes');
      expect(listRes.status).toBe(200);
      const found = listRes.body.find((pc: any) => pc.id === createRes.body.id);
      expect(found).toBeDefined();
      expect(found.code).toBe(promoCode);
      expect(found.planNameAr).toBe(earlyBird.nameAr);

      const toggleRes = await admin
        .patch(`/api/admin/promo-codes/${createRes.body.id}`)
        .send({ isActive: false });
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.isActive).toBe(false);

      const auditRes = await admin.get('/api/admin/audit?action=promo_code.create');
      expect(auditRes.body.some((a: any) => a.targetId === createRes.body.id)).toBe(true);
    });

    it('inspects teacher entitlements, assigns paid subscription with discount ledger & referral code, and grants gifts', async () => {
      const teacherId = world.teacher.id;
      const plansRes = await admin.get('/api/admin/plans');
      const proPlan = plansRes.body.find((p: any) => p.slug === 'pro');

      // 1. Initial entitlements check
      const initEnt = await admin.get(`/api/admin/teachers/${teacherId}/entitlements`);
      expect(initEnt.status).toBe(200);
      expect(initEnt.body.teacherId).toBe(teacherId);
      expect(initEnt.body.activePlan).toBeDefined();
      expect(Array.isArray(initEnt.body.discounts)).toBe(true);

      // 2. Assign paid subscription with recordLimitCrossingDiscount
      const subRes = await admin.post(`/api/admin/teachers/${teacherId}/subscription`).send({
        planId: proPlan.id,
        currency: 'OMR',
        billingCycle: 'MONTHLY',
        durationDays: 30,
        recordLimitCrossingDiscount: true,
      });
      expect(subRes.status).toBe(201);
      expect(subRes.body.source).toBe('ADMIN_PAID');
      expect(subRes.body.planSlug).toBe('pro');

      // Check referralCode is unlocked on teacher
      const { rows: teacherRows } = await testPool.query(
        `SELECT id, referral_code AS "referralCode" FROM "user" WHERE id=$1`,
        [teacherId],
      );
      const updatedTeacher = teacherRows[0];
      expect(updatedTeacher.referralCode).toBeTruthy();
      expect(updatedTeacher.referralCode).toMatch(/^REF-[A-Z0-9]+$/);

      // Check audit log for subscription assignment
      const subAudit = await admin.get('/api/admin/audit?action=teacher.subscription.assign');
      expect(subAudit.body.some((a: any) => a.targetId === subRes.body.id)).toBe(true);

      // Check entitlements reflect new subscription & discount ledger
      const afterSubEnt = await admin.get(`/api/admin/teachers/${teacherId}/entitlements`);
      expect(afterSubEnt.status).toBe(200);
      expect(afterSubEnt.body.activePlan.slug).toBe('pro');
      expect(afterSubEnt.body.activePlan.status).toBe('ACTIVE');
      expect(afterSubEnt.body.referral?.referralCode).toBe(updatedTeacher.referralCode);
      const discountRow = afterSubEnt.body.discounts.find((d: any) => d.occasion === 'LIMIT_CROSS_PRO');
      expect(discountRow).toBeDefined();

      // 3. Grant gift days on the same plan (extends plan)
      const giftRes1 = await admin.post(`/api/admin/teachers/${teacherId}/gift`).send({
        planId: proPlan.id,
        durationDays: 7,
      });
      expect(giftRes1.status).toBe(201);
      expect(giftRes1.body.action).toBe('EXTENDED');

      // Second gift on same plan without override should fail (1 gift per paid cycle)
      const giftRes2 = await admin.post(`/api/admin/teachers/${teacherId}/gift`).send({
        planId: proPlan.id,
        durationDays: 7,
      });
      expect(giftRes2.status).toBe(400);

      // Second gift on same plan with adminOverride should succeed!
      const giftRes3 = await admin.post(`/api/admin/teachers/${teacherId}/gift`).send({
        planId: proPlan.id,
        durationDays: 7,
        adminOverride: true,
      });
      expect(giftRes3.status).toBe(201);
      expect(giftRes3.body.action).toBe('EXTENDED');

      // Check audit log for gift grant
      const giftAudit = await admin.get('/api/admin/audit?action=teacher.gift.grant');
      expect(giftAudit.body.some((a: any) => a.targetId === teacherId)).toBe(true);

      // Check entitlements discount ledger has ADMIN_TRIAL entries
      const finalEnt = await admin.get(`/api/admin/teachers/${teacherId}/entitlements`);
      expect(finalEnt.body.discounts.some((d: any) => d.occasion === 'ADMIN_TRIAL')).toBe(true);
    });

    it('creates and updates bilingual grades (country-scoped) and categories via admin taxonomy endpoints', async () => {
      const createGradeRes = await admin.post('/api/admin/grades').send({
        nameAr: 'الصف التمهيدي',
        nameEn: 'Kindergarten',
        country: 'EG',
        displayOrder: 0,
      });
      expect(createGradeRes.status).toBe(201);
      expect(createGradeRes.body.name).toBe('Kindergarten');
      expect(createGradeRes.body.nameAr).toBe('الصف التمهيدي');
      expect(createGradeRes.body.nameEn).toBe('Kindergarten');
      expect(createGradeRes.body.country).toBe('EG');

      const patchGradeRes = await admin.patch(`/api/admin/grades/${createGradeRes.body.id}`).send({
        nameAr: 'رياض الأطفال',
        nameEn: 'KG 1',
        country: 'OM',
      });
      expect(patchGradeRes.status).toBe(200);
      expect(patchGradeRes.body.name).toBe('KG 1');
      expect(patchGradeRes.body.nameAr).toBe('رياض الأطفال');
      expect(patchGradeRes.body.nameEn).toBe('KG 1');
      expect(patchGradeRes.body.country).toBe('OM');

      const omGrades = await admin.get('/api/admin/grades?country=OM');
      expect(omGrades.status).toBe(200);
      expect(omGrades.body.every((g: any) => g.country === 'OM')).toBe(true);
      expect(omGrades.body.some((g: any) => g.id === createGradeRes.body.id)).toBe(true);

      const createCatRes = await admin.post('/api/admin/categories').send({
        nameAr: 'تطوير الألعاب',
        nameEn: 'Game Development',
      });
      expect(createCatRes.status).toBe(201);
      expect(createCatRes.body.name).toBe('Game Development');
      expect(createCatRes.body.nameAr).toBe('تطوير الألعاب');
      expect(createCatRes.body.nameEn).toBe('Game Development');

      const patchCatRes = await admin.patch(`/api/admin/categories/${createCatRes.body.id}`).send({
        nameAr: 'تصميم وتطوير الألعاب',
        nameEn: 'Game Design & Development',
      });
      expect(patchCatRes.status).toBe(200);
      expect(patchCatRes.body.name).toBe('Game Design & Development');
      expect(patchCatRes.body.nameAr).toBe('تصميم وتطوير الألعاب');
      expect(patchCatRes.body.nameEn).toBe('Game Design & Development');
    });

    it('handles admin password reset with auto-generated and custom credentials, enforcing mustChangePassword and audit logging', async () => {
      // 1. Rejects non-admin
      const studentSession = (await login(server, STUDENT1.email, STUDENT1.password)).session;
      const nonAdminRes = await studentSession.post(`/api/admin/users/${world.s1.id}/reset-password`).send({});
      expect([403, 500]).toContain(nonAdminRes.status);

      // 2. Returns 404 for non-existent user
      const notFoundRes = await admin.post('/api/admin/users/00000000-0000-0000-0000-000000000000/reset-password').send({});
      expect(notFoundRes.status).toBe(404);

      // 3. Reset student1 with auto-generated password
      const autoResetRes = await admin.post(`/api/admin/users/${world.s1.id}/reset-password`).send({});
      expect(autoResetRes.status).toBe(201);
      expect(autoResetRes.body.success).toBe(true);
      expect(autoResetRes.body.userId).toBe(world.s1.id);
      expect(autoResetRes.body.userName).toBe(STUDENT1.name);
      expect(autoResetRes.body.temporaryPassword).toMatch(/^Emtiaz#[a-zA-Z0-9]{4}$/);

      // Verify mustChangePassword is true in DB
      const { rows } = await testPool.query(
        `SELECT must_change_password AS "mustChangePassword" FROM "user" WHERE id = $1`,
        [world.s1.id],
      );
      expect(rows[0]?.mustChangePassword).toBe(true);

      // Verify audit log has user.password.reset with forcedChange: true
      const auditRes = await admin.get(`/api/admin/audit?action=user.password.reset`);
      expect(auditRes.status).toBe(200);
      const auditEntry = auditRes.body.find((a: any) => a.targetId === world.s1.id);
      expect(auditEntry).toBeDefined();
      expect(auditEntry.metadata?.forcedChange).toBe(true);

      // Verify the student can log in with the new auto-generated password
      const loginAuto = await login(server, STUDENT1.email, autoResetRes.body.temporaryPassword);
      expect(loginAuto.status).toBe(200);

      // 4. Reset with custom password (min 8 chars)
      const customPassword = 'CustomSecretPass#2026';
      const customResetRes = await admin
        .post(`/api/admin/users/${world.s1.id}/reset-password`)
        .send({ password: customPassword });
      expect(customResetRes.status).toBe(201);
      expect(customResetRes.body.success).toBe(true);
      expect(customResetRes.body.temporaryPassword).toBe(customPassword);

      // Verify student can log in with custom password
      const loginCustom = await login(server, STUDENT1.email, customPassword);
      expect(loginCustom.status).toBe(200);
    });
  });
});
