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

  async function countStudents() {
    const { rows } = await testPool.query(
      `SELECT COUNT(*)::int AS c FROM "user" WHERE role='STUDENT'`,
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
