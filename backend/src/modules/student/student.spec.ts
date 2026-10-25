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
      `INSERT INTO group_lesson_access (group_id, lesson_id, is_unlocked) VALUES ($1,$2,false),($3,$2,false)`,
      [world.group1, world.lesson2, world.group2],
    );
    const res = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    const lessons = res.body.modules[0].lessons;
    expect(lessons.find((l: any) => l.id === world.lesson2).unlocked).toBe(false);
    expect(lessons.find((l: any) => l.id === world.lesson1).unlocked).toBe(true);
  });

  it('views lesson detail with hasQuiz, and rejects locked lessons', async () => {
    const res = await s1.get(`/api/student/lessons/${world.lesson1}/view?groupId=${world.group1}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: expect.any(String), hasQuiz: true, completed: false });
    const res2 = await s1.get(`/api/student/lessons/${world.lesson2}/view?groupId=${world.group1}`);
    expect(res2.status).toBe(403); // locked via group_lesson_access set in previous test
    const res3 = await s1.get(`/api/student/lessons/${world.lesson1}/view`);
    expect(res3.status).toBe(200); // no group given: any open enrollment grants access
  });

  it('marks a lesson complete and shows progress', async () => {
    const locked = await s1.post(`/api/student/lessons/${world.lesson2}/complete`);
    expect(locked.status).toBe(403);
    const res = await s1.post(`/api/student/lessons/${world.lesson1}/complete`);
    expect(res.status).toBe(201);
    const res2 = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    const l1 = res2.body.modules[0].lessons[0];
    expect(l1.completed).toBe(true);
    const res3 = await s1.get('/api/student/groups');
    // lesson2 is locked for group1 (locked in the previous test), so 1/1 = 100
    expect(res3.body.find((x: any) => x.group.id === world.group1).progress).toBe(100);

    // a completion earned before a lesson was locked must not inflate progress
    const student = await getUserByEmail(STUDENT1.email);
    await testPool.query(
      `INSERT INTO lesson_completions (student_id, lesson_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [student.id, world.lesson2],
    );
    const after = await s1.get('/api/student/groups');
    const g1 = after.body.find((x: any) => x.group.id === world.group1);
    expect(g1).toMatchObject({ progress: 100, completedLessons: 1, totalLessons: 1 });
  });

  it('refuses to submit a quiz that belongs to another course', async () => {
    const { rows: courseRows } = await testPool.query(
      `INSERT INTO courses (title, teacher_id) VALUES ('Foreign Course', $1) RETURNING id`,
      [world.teacher.id],
    );
    const foreignCourse = courseRows[0].id;
    const { rows: moduleRows } = await testPool.query(
      `INSERT INTO modules (course_id, title) VALUES ($1,'Foreign Module') RETURNING id`,
      [foreignCourse],
    );
    const { rows: lessonRows } = await testPool.query(
      `INSERT INTO lessons (module_id, title) VALUES ($1,'Foreign Lesson') RETURNING id`,
      [moduleRows[0].id],
    );
    const { rows: quizRows } = await testPool.query(
      `INSERT INTO quizzes (lesson_id, title) VALUES ($1,'Foreign Quiz') RETURNING id`,
      [lessonRows[0].id],
    );
    const res = await s1
      .post(`/api/student/quizzes/${quizRows[0].id}/submit`)
      .send({ groupId: world.group1, answers: { nope: 'x' } });
    expect(res.status).toBe(403);
    const direct = await s1.get(`/api/student/quizzes/${quizRows[0].id}`);
    expect(direct.status).toBe(403);
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

  it('serves and grades a module quiz through the group', async () => {
    const { rows: quizRows } = await testPool.query(
      `INSERT INTO quizzes (module_id, title) VALUES ($1,'Module check') RETURNING id`,
      [world.moduleId],
    );
    const { rows: questionRows } = await testPool.query(
      `INSERT INTO quiz_questions (quiz_id, question_type, prompt, correct_answer, points) VALUES ($1,'SHORT_ANSWER','Capital of Oman?','Muscat',2) RETURNING id`,
      [quizRows[0].id],
    );
    const got = await s1.get(`/api/student/groups/${world.group1}/quizzes/${quizRows[0].id}`);
    expect(got.status).toBe(200);
    expect(got.body.quiz.title).toBe('Module check');

    const submitted = await s1
      .post(`/api/student/quizzes/${quizRows[0].id}/submit`)
      .send({ groupId: world.group1, answers: { [questionRows[0].id]: 'muscat' } });
    expect(submitted.status).toBe(201);
    expect(submitted.body.score).toBe(2);

    const grades = await s1.get(`/api/student/groups/${world.group1}/grades`);
    expect(grades.body.quizzes.find((q: any) => q.quizId === quizRows[0].id).title).toBe('Module check');
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
