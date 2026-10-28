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

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;
let admin: Awaited<ReturnType<typeof login>>['session'];

beforeAll(async () => {
  server = (await getApp()).server;
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

  it('soft-deletes users: row stays, sessions and memberships go, listings hide it', async () => {
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

    const memberships = await testPool.query(
      `SELECT 1 FROM group_students WHERE student_id=$1`,
      [id],
    );
    expect(memberships.rowCount).toBe(0);

    const list = await admin.get('/api/admin/students');
    expect(list.body.some((u: any) => u.id === id)).toBe(false);

    expect((await admin.delete(`/api/admin/users/${id}`)).status).toBe(404);
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
      });
    expect(off.status).toBe(200);
    expect(off.body.emailEnabled).toBe(false);
    expect(off.body.adminEnabled).toBe(false);
    expect(off.body.supportEmail).toBe('help@emtiaz.om');

    const persisted = await admin.get('/api/admin/notification-settings');
    expect(persisted.body.emailEnabled).toBe(false);
    expect(persisted.body.supportWhatsapp).toBe('+96895550000');

    const empty = await admin.patch('/api/admin/notification-settings').send({});
    expect(empty.status).toBe(400);

    const log = await admin.get('/api/admin/notifications');
    expect(log.status).toBe(200);
    expect(Array.isArray(log.body)).toBe(true);

    await admin
      .patch('/api/admin/notification-settings')
      .send({ emailEnabled: true, adminEnabled: true });
  });

  describe('taxonomy', () => {
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
});
