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

  it('views child homework with urgency flag, grades, feedback, and enforces parent-child boundary', async () => {
    const parent = (await login(server, PARENT.email, PARENT.password)).session;
    const s1User = await getUserByEmail(STUDENT1.email);

    // Ensure parent is linked to s1
    await parent.post('/api/parent/link').send({ monitoringCode: s1User.monitoringCode });

    // Create a homework assignment on world.lesson1
    const hwRes = await testPool.query(
      `INSERT INTO homework (lesson_id, title, instructions, max_score)
       VALUES ($1, 'Science Project', 'Read chapter 4 and write summary', 10)
       RETURNING id`,
      [world.lesson1],
    );
    const hwId = hwRes.rows[0].id;

    // Set due date to 10 hours from now (within 24 hours -> isUrgent = true)
    const urgentDueDate = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await testPool.query(
      `INSERT INTO group_homework_access (group_id, homework_id, due_date, is_hidden)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (group_id, homework_id) DO UPDATE SET due_date = $3, is_hidden = false`,
      [world.group1, hwId, urgentDueDate],
    );

    // Unlinked child access check: 403 Forbidden
    const unlinkedRes = await parent.get(`/api/parent/children/${world.s2.id}/homework`);
    expect(unlinkedRes.status).toBe(403);

    // Linked child: returns homework with isUrgent = true, submission = null
    const res1 = await parent.get(`/api/parent/children/${world.s1.id}/homework`);
    expect(res1.status).toBe(200);
    expect(Array.isArray(res1.body)).toBe(true);
    const item1 = res1.body.find((h: any) => h.id === hwId);
    expect(item1).toBeTruthy();
    expect(item1.title).toBe('Science Project');
    expect(item1.instructions).toBe('Read chapter 4 and write summary');
    expect(item1.maxScore).toBe(10);
    expect(item1.isUrgent).toBe(true);
    expect(item1.submission).toBeNull();

    // Now insert a graded submission with score and teacher feedback
    await testPool.query(
      `INSERT INTO homework_submissions (homework_id, group_id, student_id, status, score, teacher_feedback, is_late)
       VALUES ($1, $2, $3, 'GRADED', 9, 'Well analyzed and summarized!', false)
       ON CONFLICT (homework_id, group_id, student_id)
       DO UPDATE SET status = 'GRADED', score = 9, teacher_feedback = 'Well analyzed and summarized!'`,
      [hwId, world.group1, world.s1.id],
    );

    // Linked child: now submission is present, score is 9, isUrgent is false (because it's graded)
    const res2 = await parent.get(`/api/parent/children/${world.s1.id}/homework`);
    expect(res2.status).toBe(200);
    const item2 = res2.body.find((h: any) => h.id === hwId);
    expect(item2).toBeTruthy();
    expect(item2.isUrgent).toBe(false);
    expect(item2.submission).toEqual(
      expect.objectContaining({
        status: 'GRADED',
        score: 9,
        teacherFeedback: 'Well analyzed and summarized!',
        isLate: false,
      }),
    );

    // Also check alias route /api/parent/students/:studentId/homework
    const aliasRes = await parent.get(`/api/parent/students/${world.s1.id}/homework`);
    expect(aliasRes.status).toBe(200);
    expect(aliasRes.body.find((h: any) => h.id === hwId)).toBeTruthy();

    // Clean up
    await testPool.query(`DELETE FROM homework WHERE id = $1`, [hwId]);
  });
});
