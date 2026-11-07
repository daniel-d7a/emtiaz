import 'dotenv/config';
import request from 'supertest';
import {
  STUDENT1,
  STUDENT2,
  closeApp,
  getApp,
  getUserByEmail,
  login,
  seedWorld,
  testPool,
} from '../../db/test-helpers';

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;

const PARENT = {
  name: 'Umm Aisha',
  email: 'parent@example.om',
  password: 'Passw0rd!123',
  phoneNumber: '+96890000009',
};

beforeAll(async () => {
  server = (await getApp()).server;
  world = await seedWorld();
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('parent role', () => {
  it('signs up, links by monitoring code, and reads progress and grades', async () => {
    const signup = await request(server).post('/api/onboarding/parent').send(PARENT);
    expect(signup.status).toBe(201);

    const parent = (await login(server, PARENT.email, PARENT.password)).session;

    const wrong = await parent.post('/api/parent/link').send({ monitoringCode: 'WRONG123' });
    expect(wrong.status).toBe(404);

    const s1User = await getUserByEmail(STUDENT1.email);
    const link = await parent.post('/api/parent/link').send({ monitoringCode: s1User.monitoringCode });
    expect(link.status).toBe(201);
    expect(link.body.id).toBe(world.s1.id);

    const parentUser = await getUserByEmail(PARENT.email);
    await testPool.query(
      `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1,$2,true),($3,$2,false)`,
      [world.lesson1, world.s1.id, world.lesson2],
    );
    await testPool.query(
      `INSERT INTO parent_reports (parent_id, student_id, message) VALUES ($1,$2,'Monthly report')`,
      [parentUser.id, world.s1.id],
    );

    const students = await parent.get('/api/parent/students');
    expect(students.status).toBe(200);
    expect(students.body).toHaveLength(1);
    expect(students.body[0].name).toBe(STUDENT1.name);
    expect(students.body[0].groups[0].group.id).toBe(world.group1);
    expect(students.body[0].groups[0].attendance).toEqual({ present: 1, total: 2, percent: 50 });
    expect(students.body[0].groups[0].averageGrade).toBe(0);
    expect(students.body[0].reports[0].message).toBe('Monthly report');

    const grades = await parent.get(
      `/api/parent/students/${world.s1.id}/groups/${world.group1}/grades`,
    );
    expect(grades.status).toBe(200);
    expect(Array.isArray(grades.body.quizzes)).toBe(true);
    expect(Array.isArray(grades.body.manual)).toBe(true);

    const foreign = await parent.get(
      `/api/parent/students/${world.s2.id}/groups/${world.group1}/grades`,
    );
    expect(foreign.status).toBe(403);

    const readOnly = await parent
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: world.group1, answers: {} });
    expect(readOnly.status).toBe(403);

    expect((await parent.delete(`/api/parent/students/${world.s1.id}`)).status).toBe(200);
    expect((await parent.get('/api/parent/students')).body).toHaveLength(0);
    expect(
      (
        await parent.get(
          `/api/parent/students/${world.s1.id}/groups/${world.group1}/grades`,
        )
      ).status,
    ).toBe(403);
  });

  it('rejects an unknown student monitoring code before creating the account', async () => {
    const email = 'parent-bad@example.om';
    const res = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000011', monitoringCode: 'NOTFOUND' });
    expect(res.status).toBe(404);
    const attempt = await login(server, email, PARENT.password);
    expect(attempt.status).not.toBe(200);
  });

  it('links during signup using monitoring code and is idempotent', async () => {
    const email = 'parent2@example.om';
    const s2User = await getUserByEmail(STUDENT2.email);
    const signup = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000010', monitoringCode: s2User.monitoringCode.toLowerCase() });
    expect(signup.status).toBe(201);

    const parent = (await login(server, email, PARENT.password)).session;
    const students = await parent.get('/api/parent/students');
    expect(students.body).toHaveLength(1);
    expect(students.body[0].id).toBe(world.s2.id);

    await parent.post('/api/parent/link').send({ monitoringCode: s2User.monitoringCode });
    const again = await parent.get('/api/parent/students');
    expect(again.body).toHaveLength(1);
  });

  it('normalizes whitespace and lowercase when linking', async () => {
    const email = 'parent3@example.om';
    const s1User = await getUserByEmail(STUDENT1.email);
    await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000012' });
    const parent = (await login(server, email, PARENT.password)).session;

    const res = await parent
      .post('/api/parent/link')
      .send({ monitoringCode: `  ${s1User.monitoringCode.toLowerCase()}  ` });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(world.s1.id);
  });

  it('calculates attendance percentage using held visible sessions as denominator', async () => {
    const parent = (await login(server, PARENT.email, PARENT.password)).session;
    const s1User = await getUserByEmail(STUDENT1.email);
    await parent.post('/api/parent/link').send({ monitoringCode: s1User.monitoringCode });
    await testPool.query(`DELETE FROM lesson_attendance WHERE student_id = $1`, [world.s1.id]);

    let students = await parent.get('/api/parent/students');
    expect(students.body[0].groups[0].attendance).toEqual({ present: 0, total: 0, percent: 0 });

    await testPool.query(
      `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1,$2,true)`,
      [world.lesson1, world.s1.id],
    );
    students = await parent.get('/api/parent/students');
    expect(students.body[0].groups[0].attendance).toEqual({ present: 1, total: 1, percent: 100 });

    await testPool.query(
      `INSERT INTO lesson_attendance (lesson_id, student_id, is_present) VALUES ($1,$2,false)`,
      [world.lesson2, world.s1.id],
    );
    students = await parent.get('/api/parent/students');
    expect(students.body[0].groups[0].attendance).toEqual({ present: 1, total: 2, percent: 50 });

    await testPool.query(
      `INSERT INTO group_lesson_access (group_id, lesson_id, is_hidden)
       VALUES ($1,$2,true)
       ON CONFLICT (group_id, lesson_id) DO UPDATE SET is_hidden = true`,
      [world.group1, world.lesson2],
    );
    students = await parent.get('/api/parent/students');
    expect(students.body[0].groups[0].attendance).toEqual({ present: 1, total: 1, percent: 100 });

    await testPool.query(
      `UPDATE group_lesson_access SET is_hidden = false WHERE group_id = $1 AND lesson_id = $2`,
      [world.group1, world.lesson2],
    );
  });
});
