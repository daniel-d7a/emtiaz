import 'dotenv/config';
import {
  STUDENT1,
  STUDENT2,
  TEACHER,
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

beforeAll(async () => {
  const got = await getApp();
  server = got.server;
  world = await seedWorld();
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Phase 3: student endpoints', () => {
  let s1: Awaited<ReturnType<typeof login>>['session'];

  beforeAll(async () => {
    s1 = (await login(server, STUDENT1.email, STUDENT1.password)).session;
  });

  it('lists my groups with progress', async () => {
    const res = await s1.get('/api/student/groups');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const g = res.body[0];
    expect(g.course.title).toBe('Physics 10');
    expect(g.group.joinCode).toBeDefined();
    expect(g).toHaveProperty('progress');
  });

  it('refuses groups the student is not enrolled in', async () => {
    const res = await s1.get(
      `/api/student/groups/${'00000000-0000-4000-8000-000000000000'}/curriculum`,
    );
    expect(res.status).toBe(403);
  });

  it('returns curriculum w/ unlocked flag, attachments, quiz availability', async () => {
    const res = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    expect(res.status).toBe(200);
    expect(res.body.modules[0].lessons).toHaveLength(2);
    const l1 = res.body.modules[0].lessons[0];
    expect(l1.unlocked).toBe(true);
    expect(l1.hasQuiz).toBe(true);
    expect(l1.completed).toBe(false);
  });

  it('locks lessons with a groupLessonAccess row', async () => {
    await testPool.query(
      `INSERT INTO group_lesson_access (group_id, lesson_id, is_unlocked) VALUES ($1,$2,false)`,
      [world.group1, world.lesson2],
    );
    const res = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    const lessons = res.body.modules[0].lessons;
    expect(lessons.find((l: any) => l.id === world.lesson2).unlocked).toBe(false);
    expect(lessons.find((l: any) => l.id === world.lesson1).unlocked).toBe(true);
  });

  it('marks a lesson complete and shows progress', async () => {
    const res = await s1.post(`/api/student/lessons/${world.lesson1}/complete`);
    expect(res.status).toBe(201);
    const res2 = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    const l1 = res2.body.modules[0].lessons[0];
    expect(l1.completed).toBe(true);
    const res3 = await s1.get('/api/student/groups');
    // lesson2 is locked for group1 (locked in the previous test), so 1/1 = 100
    expect(res3.body.find((x: any) => x.group.id === world.group1).progress).toBe(100);
  });

  it('grades a quiz correctly and records the attempt', async () => {
    const answers: Record<string, string> = {};
    answers[world.questionIds[0]] = 'm/s'; // correct
    answers[world.questionIds[1]] = 'true'; // correct
    answers[world.questionIds[2]] = 'vt'; // correct (case/whitespace normalized)
    const res = await s1
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: world.group1, answers });
    expect(res.status).toBe(201);
    expect(res.body.maxScore).toBe(4);
    expect(res.body.score).toBe(4);
    expect(res.body.result.every((r: any) => r.correct)).toBe(true);

    const wrong = await s1
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({
        groupId: world.group1,
        answers: { [world.questionIds[0]]: 'km/h' },
      });
    expect(wrong.body.score).toBe(0);
    expect(wrong.body.result[0].correct).toBe(false);
    expect(wrong.body.result[0].explanation).toBe('speed is m/s');

    await s1
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: world.group1, answers });
    const res3 = await s1.get(`/api/student/groups/${world.group1}/grades`);
    expect(res3.status).toBe(200);
    expect(res3.body.quizzes).toHaveLength(1);
    expect(res3.body.quizzes[0].score).toBe(4);
  });

  it('requires enrollment before quiz submission', async () => {
    const otherStudent = (await login(server, STUDENT2.email, STUDENT2.password))
      .session;
    // s2 is in group1 too; but not enrolled in a foreign group
    const res = await otherStudent
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({
        groupId: '00000000-0000-4000-8000-000000000000',
        answers: { [world.questionIds[0]]: 'm/s' },
      });
    expect(res.status).toBe(403);
  });

  it('joins group by code', async () => {
    const res = await s1
      .post('/api/student/groups/join')
      .send({ joinCode: 'OM222222' });
    expect(res.status).toBe(201);
    expect(res.body.group.id).toBe(world.group2);
    await testPool.query(
      `DELETE FROM group_students WHERE group_id=$1 AND student_id=$2`,
      [world.group2, (await getUserByEmail(STUDENT1.email)).id],
    );
  });

  it('teachers cannot access student endpoints', async () => {
    const t = (await login(server, TEACHER.email, TEACHER.password)).session;
    const res = await t.get('/api/student/groups');
    expect(res.status).toBe(403);
  });
});
