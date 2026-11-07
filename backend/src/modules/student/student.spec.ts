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
    expect(g.course).not.toHaveProperty('deletedAt');
    expect(g.group).not.toHaveProperty('deletedAt');
  });

  it('returns home stats and latest courses', async () => {
    const res = await s1.get('/api/student/home');
    expect(res.status).toBe(200);
    expect(res.body.stats.activeGroups).toBe(2);
    expect(res.body.stats.lessonsDone).toBeGreaterThanOrEqual(0);
    expect(res.body.latestCourses).toHaveLength(2);
    expect(res.body.latestCourses[0]).toHaveProperty('joinedAt');
  });

  it('updates student date of birth and grade', async () => {
    const res = await s1
      .patch('/api/me')
      .send({ dateOfBirth: '2009-03-14', gradeId: world.gradeId });
    expect(res.status).toBe(200);
    expect(res.body.dateOfBirth).toBe('2009-03-14');
    expect(res.body.gradeId).toBe(world.gradeId);

    const bad = await s1.patch('/api/me').send({ dateOfBirth: '14-03-2009' });
    expect(bad.status).toBe(400);

    const cleared = await s1.patch('/api/me').send({ dateOfBirth: null, gradeId: null });
    expect(cleared.body.dateOfBirth).toBeNull();
    expect(cleared.body.gradeId).toBeNull();
  });

  it('refuses groups the student is not enrolled in', async () => {
    const res = await s1.get(
      `/api/student/groups/${'00000000-0000-4000-8000-000000000000'}/curriculum`,
    );
    expect(res.status).toBe(403);
  });

  it('returns curriculum w/ unlocked flag, attachments, quiz availability', async () => {
    await testPool.query(
      `UPDATE "user" SET landing_theme = $1::jsonb, landing_slug = 'teacher-page', landing_published = true WHERE email = $2`,
      [
        JSON.stringify({
          layout: 'split',
          primary: '#1D4ED8',
          secondary: '#B45309',
          marquee: '',
          arabicFont: 'tajawal',
          englishFont: 'inter',
        }),
        TEACHER.email,
      ],
    );
    const res = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    expect(res.status).toBe(200);
    expect(res.body.teacher.theme.primary).toBe('#1D4ED8');
    expect(res.body.teacher.slug).toBe('teacher-page');
    expect(res.body.modules[0].lessons).toHaveLength(2);
    expect(res.body.course).not.toHaveProperty('deletedAt');
    const l1 = res.body.modules[0].lessons[0];
    expect(l1.unlocked).toBe(true);
    expect(l1.hasQuiz).toBe(true);
    expect(l1.completed).toBe(false);
    expect(l1).not.toHaveProperty('deletedAt');
    expect(l1.attachments.every((a: any) => !('r2ObjectKey' in a))).toBe(true);
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

  it('blocks locked lesson quizzes even by direct URL', async () => {
    const { rows: quizRows } = await testPool.query(
      `INSERT INTO quizzes (lesson_id, title) VALUES ($1,'Locked quiz') RETURNING id`,
      [world.lesson2],
    );
    await testPool.query(
      `INSERT INTO quiz_questions (quiz_id, question_type, prompt, correct_answer, points) VALUES ($1,'TRUE_FALSE','Locked?','true',1)`,
      [quizRows[0].id],
    );
    expect((await s1.get(`/api/student/quizzes/${quizRows[0].id}`)).status).toBe(403);
    expect((await s1.get(`/api/student/groups/${world.group1}/quizzes/${quizRows[0].id}`)).status).toBe(403);
    expect(
      (
        await s1
          .post(`/api/student/quizzes/${quizRows[0].id}/submit`)
          .send({ groupId: world.group1, answers: { x: 'true' } })
      ).status,
    ).toBe(403);
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
    const res = await s1
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: world.group1, answers });
    expect(res.status).toBe(201);
    expect(res.body.maxScore).toBe(2);
    expect(res.body.score).toBe(2);
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
    expect(res3.body.quizzes[0].score).toBe(2);

    const reopened = await s1.get(`/api/student/groups/${world.group1}/quizzes/${world.quiz}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.attempt.score).toBe(2);
    expect(reopened.body.attempt.answers[world.questionIds[0]]).toBe('m/s');
    expect(reopened.body.attempt.result).toHaveLength(2);
  });

  it('serves and grades a module quiz through the group', async () => {
    const { rows: quizRows } = await testPool.query(
      `INSERT INTO quizzes (module_id, title) VALUES ($1,'Module check') RETURNING id`,
      [world.moduleId],
    );
    const { rows: questionRows } = await testPool.query(
      `INSERT INTO quiz_questions (quiz_id, question_type, prompt, correct_answer, points) VALUES ($1,'TRUE_FALSE','Muscat is the capital of Oman','true',2) RETURNING id`,
      [quizRows[0].id],
    );
    const got = await s1.get(`/api/student/groups/${world.group1}/quizzes/${quizRows[0].id}`);
    expect(got.status).toBe(200);
    expect(got.body.quiz.title).toBe('Module check');

    const submitted = await s1
      .post(`/api/student/quizzes/${quizRows[0].id}/submit`)
      .send({ groupId: world.group1, answers: { [questionRows[0].id]: 'true' } });
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

  it('hides lessons and quizzes hidden by the teacher', async () => {
    await testPool.query(
      `INSERT INTO group_lesson_access (group_id, lesson_id, is_unlocked, is_hidden)
       VALUES ($1,$2,true,true)
       ON CONFLICT (group_id, lesson_id)
       DO UPDATE SET is_hidden = true`,
      [world.group1, world.lesson1],
    );
    const { rows: moduleQuizRows } = await testPool.query(
      `SELECT id FROM quizzes WHERE module_id=$1 AND title='Module check'`,
      [world.moduleId],
    );
    await testPool.query(
      `INSERT INTO group_quiz_access (group_id, quiz_id, is_hidden)
       VALUES ($1,$2,true),($1,$3,true)`,
      [world.group1, world.quiz, moduleQuizRows[0].id],
    );

    const curriculum = await s1.get(`/api/student/groups/${world.group1}/curriculum`);
    const lessonIds = curriculum.body.modules.flatMap((m: any) =>
      m.lessons.map((lesson: any) => lesson.id),
    );
    expect(lessonIds).not.toContain(world.lesson1);
    expect(curriculum.body.modules[0].quizzes).toEqual([]);

    expect(
      (await s1.get(`/api/student/lessons/${world.lesson1}/view?groupId=${world.group1}`)).status,
    ).toBe(403);
    expect((await s1.get(`/api/student/quizzes/${world.quiz}`)).status).toBe(403);
    expect(
      (await s1.get(`/api/student/groups/${world.group1}/quizzes/${world.quiz}`)).status,
    ).toBe(403);
    const grades = await s1.get(`/api/student/groups/${world.group1}/grades`);
    expect(grades.body.quizzes.some((quiz: any) => quiz.quizId === world.quiz)).toBe(false);
    expect(
      (
        await s1
          .post(`/api/student/quizzes/${world.quiz}/submit`)
          .send({ groupId: world.group1, answers: { [world.questionIds[0]]: 'm/s' } })
      ).status,
    ).toBe(403);
  });

  it('scopes lesson attachments strictly to group context and avoids leaks', async () => {
    const studentUser = await getUserByEmail(STUDENT1.email);
    // Un-hide lesson1 in group1 from previous test
    await testPool.query(
      `DELETE FROM group_lesson_access WHERE group_id = $1 AND lesson_id = $2`,
      [world.group1, world.lesson1],
    );
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [world.group2, studentUser.id],
    );

    const { rows: atts } = await testPool.query(
      `INSERT INTO lesson_attachments (lesson_id, title, file_type, url, group_id)
       VALUES
         ($1, 'Global Doc', 'PDF', 'https://example.com/global', NULL),
         ($1, 'Group 1 Doc', 'PDF', 'https://example.com/g1', $2),
         ($1, 'Group 2 Doc', 'PDF', 'https://example.com/g2', $3)
       RETURNING id, title`,
      [world.lesson1, world.group1, world.group2],
    );

    try {
      // 1. When querying for Group 1:
      const g1View = await s1.get(`/api/student/lessons/${world.lesson1}/view?groupId=${world.group1}`);
      expect(g1View.status).toBe(200);
      const g1Titles = g1View.body.attachments.map((a: any) => a.title);
      expect(g1Titles).toContain('Global Doc');
      expect(g1Titles).toContain('Group 1 Doc');
      expect(g1Titles).not.toContain('Group 2 Doc');

      // 2. When querying for Group 2:
      const g2View = await s1.get(`/api/student/lessons/${world.lesson1}/view?groupId=${world.group2}`);
      expect(g2View.status).toBe(200);
      const g2Titles = g2View.body.attachments.map((a: any) => a.title);
      expect(g2Titles).toContain('Global Doc');
      expect(g2Titles).toContain('Group 2 Doc');
      expect(g2Titles).not.toContain('Group 1 Doc');

      // 3. When groupId query param is omitted:
      await testPool.query(
        `INSERT INTO group_lesson_access (group_id, lesson_id, is_unlocked, is_hidden)
         VALUES ($1,$2,false,false)
         ON CONFLICT (group_id, lesson_id) DO UPDATE SET is_unlocked = false, is_hidden = false`,
        [world.group2, world.lesson1],
      );
      const noGroupView = await s1.get(`/api/student/lessons/${world.lesson1}/view`);
      expect(noGroupView.status).toBe(200);
      const noGroupTitles = noGroupView.body.attachments.map((a: any) => a.title);
      expect(noGroupTitles).toContain('Global Doc');
      expect(noGroupTitles).toContain('Group 1 Doc');
      expect(noGroupTitles).not.toContain('Group 2 Doc');
    } finally {
      await testPool.query(`DELETE FROM lesson_attachments WHERE id = ANY($1)`, [atts.map((a: any) => a.id)]);
      await testPool.query(`DELETE FROM group_students WHERE group_id=$1 AND student_id=$2`, [world.group2, studentUser.id]);
      await testPool.query(`DELETE FROM group_lesson_access WHERE group_id=$1 AND lesson_id=$2`, [world.group2, world.lesson1]);
    }
  });

  it('teachers cannot access student endpoints', async () => {
    const t = (await login(server, TEACHER.email, TEACHER.password)).session;
    const res = await t.get('/api/student/groups');
    expect(res.status).toBe(403);
  });

  it('inactive group blocks submitQuiz, markComplete, and unmarkComplete with 400 while keeping curriculum and grades readable', async () => {
    const { rows: [inactiveGroup] } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active) VALUES ($1, 'Student Inactive Group', 'OM9991', false) RETURNING id`,
      [world.courseId],
    );
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
      [inactiveGroup.id, world.s1.id],
    );

    // Read-only curriculum works
    const currRes = await s1.get(`/api/student/groups/${inactiveGroup.id}/curriculum`);
    expect(currRes.status).toBe(200);

    // Read-only grades work
    const gradesRes = await s1.get(`/api/student/groups/${inactiveGroup.id}/grades`);
    expect(gradesRes.status).toBe(200);

    // Submit quiz rejected with 400
    const quizRes = await s1
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: inactiveGroup.id, answers: { [world.questionIds[0]]: 'm/s' } });
    expect(quizRes.status).toBe(400);
    expect(quizRes.body.message).toContain('Group is inactive');

    // Mark complete rejected with 400
    const markRes = await s1
      .post(`/api/student/lessons/${world.lesson1}/complete?groupId=${inactiveGroup.id}`);
    expect(markRes.status).toBe(400);
    expect(markRes.body.message).toContain('Group is inactive');

    // Unmark complete rejected with 400
    const unmarkRes = await s1
      .post(`/api/student/lessons/${world.lesson1}/incomplete?groupId=${inactiveGroup.id}`);
    expect(unmarkRes.status).toBe(400);
    expect(unmarkRes.body.message).toContain('Group is inactive');

    // Clean up
    await testPool.query(`DELETE FROM group_students WHERE group_id = $1`, [inactiveGroup.id]);
    await testPool.query(`DELETE FROM groups WHERE id = $1`, [inactiveGroup.id]);
  });

  it('cohorts of suspended or soft-deleted teachers reject joinGroupByCode and are omitted from student group lists', async () => {
    // Create teacher
    const { rows: [tUser] } = await testPool.query(
      `INSERT INTO "user" (id, name, email, role, is_active) VALUES ('teacher-susp-test', 'Suspended Teacher', 'susp-t@test.om', 'TEACHER', false) RETURNING id`,
    );
    const { rows: [cRow] } = await testPool.query(
      `INSERT INTO courses (title, teacher_id) VALUES ('Suspended Course', $1) RETURNING id`,
      [tUser.id],
    );
    const { rows: [gRow] } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active) VALUES ($1, 'Suspended Teacher Group', 'OM7771', true) RETURNING id`,
      [cRow.id],
    );
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
      [gRow.id, world.s1.id],
    );

    // Joining suspended teacher group -> 404 Course or teacher not available
    const joinRes = await s1.post('/api/student/groups/join').send({ joinCode: 'OM7771' });
    expect(joinRes.status).toBe(404);
    expect(joinRes.body.message).toContain('Course or teacher not available');

    // Student's myGroups omits this group because teacher is suspended
    const myGroupsRes = await s1.get('/api/student/groups');
    expect(myGroupsRes.body.some((g: any) => g.group.id === gRow.id)).toBe(false);

    // Soft-deleted teacher also rejected
    await testPool.query(`UPDATE "user" SET is_active = true, deleted_at = now() WHERE id = $1`, [tUser.id]);
    const joinDeleted = await s1.post('/api/student/groups/join').send({ joinCode: 'OM7771' });
    expect(joinDeleted.status).toBe(404);
    expect(joinDeleted.body.message).toContain('Course or teacher not available');

    const myGroupsDeleted = await s1.get('/api/student/groups');
    expect(myGroupsDeleted.body.some((g: any) => g.group.id === gRow.id)).toBe(false);

    // Inactive group join code rejected with 400 Group is inactive
    await testPool.query(`UPDATE "user" SET is_active = true, deleted_at = NULL WHERE id = $1`, [tUser.id]);
    await testPool.query(`UPDATE groups SET is_active = false WHERE id = $1`, [gRow.id]);
    const joinInactive = await s1.post('/api/student/groups/join').send({ joinCode: 'OM7771' });
    expect(joinInactive.status).toBe(400);
    expect(joinInactive.body.message).toContain('Group is inactive');

    // Clean up
    await testPool.query(`DELETE FROM group_students WHERE group_id = $1`, [gRow.id]);
    await testPool.query(`DELETE FROM groups WHERE id = $1`, [gRow.id]);
    await testPool.query(`DELETE FROM courses WHERE id = $1`, [cRow.id]);
    await testPool.query(`DELETE FROM "user" WHERE id = $1`, [tUser.id]);
  });

  describe('student homework submissions & revision lifecycle', () => {
    let hw1Id: string;
    let hw2Id: string;

    beforeAll(async () => {
      // Insert master homework on lesson1
      const { rows: [hw1] } = await testPool.query(
        `INSERT INTO homework (lesson_id, title, instructions, max_score, display_order)
         VALUES ($1, 'Physics Problem Set 1', 'Solve all motion equations', 10, 0)
         RETURNING id`,
        [world.lesson1],
      );
      hw1Id = hw1.id;

      // Insert another homework (for hidden test)
      const { rows: [hw2] } = await testPool.query(
        `INSERT INTO homework (lesson_id, title, instructions, max_score, display_order)
         VALUES ($1, 'Hidden Homework', 'Should not be seen', 10, 1)
         RETURNING id`,
        [world.lesson1],
      );
      hw2Id = hw2.id;

      // Set group access: hw1 has dueDate in the future, hw2 is hidden
      const futureDue = new Date(Date.now() + 86400000 * 2).toISOString();
      await testPool.query(
        `INSERT INTO group_homework_access (group_id, homework_id, due_date, is_hidden)
         VALUES ($1, $2, $3, false), ($1, $4, NULL, true)`,
        [world.group1, hw1Id, futureDue, hw2Id],
      );
    });

    afterAll(async () => {
      await testPool.query(`DELETE FROM homework_submissions WHERE homework_id IN ($1, $2)`, [hw1Id, hw2Id]);
      await testPool.query(`DELETE FROM group_homework_access WHERE homework_id IN ($1, $2)`, [hw1Id, hw2Id]);
      await testPool.query(`DELETE FROM homework WHERE id IN ($1, $2)`, [hw1Id, hw2Id]);
    });

    it('fetches homework for unlocked lesson and filters out hidden assignments', async () => {
      const res = await s1.get(`/api/student/groups/${world.group1}/lessons/${world.lesson1}/homework`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(hw1Id);
      expect(res.body[0].title).toBe('Physics Problem Set 1');
      expect(res.body[0].dueDate).toBeTruthy();
      expect(res.body[0].submission).toBeNull();
    });

    it('submits text answer to homework', async () => {
      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          content: 'My answers to the motion problems: v = u + at',
        });
      expect(res.status).toBe(201);
      expect(res.body.homeworkId).toBe(hw1Id);
      expect(res.body.groupId).toBe(world.group1);
      expect(res.body.studentId).toBe(world.s1.id);
      expect(res.body.status).toBe('SUBMITTED');
      expect(res.body.revisionCount).toBe(0);
      expect(res.body.isLate).toBe(false);
      expect(res.body.content).toContain('v = u + at');
    });

    it('submits link or file attachment under 10MB', async () => {
      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          attachmentType: 'LINK',
          url: 'https://docs.google.com/document/d/12345',
        });
      expect(res.status).toBe(201);
      expect(res.body.attachmentType).toBe('LINK');
      expect(res.body.url).toBe('https://docs.google.com/document/d/12345');
      expect(res.body.revisionCount).toBe(1);
    });

    it('rejects file submission exceeding 10MB', async () => {
      const excessiveBytes = 11 * 1024 * 1024;
      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          attachmentType: 'PDF',
          r2ObjectKey: 'homework/large.pdf',
          fileSizeBytes: excessiveBytes,
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('10MB');
    });

    it('detects late submission when submitted past dueDate', async () => {
      // Update due date to the past
      const pastDue = new Date(Date.now() - 86400000).toISOString();
      await testPool.query(
        `UPDATE group_homework_access SET due_date = $1 WHERE group_id = $2 AND homework_id = $3`,
        [pastDue, world.group1, hw1Id],
      );

      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          content: 'Late submission text',
        });
      expect(res.status).toBe(201);
      expect(res.body.isLate).toBe(true);
    });

    it('resubmitting after REVISION_REQUESTED increments revisionCount and reverts status to SUBMITTED', async () => {
      // Simulate teacher requesting revision
      await testPool.query(
        `UPDATE homework_submissions
         SET status = 'REVISION_REQUESTED', teacher_feedback = 'Please show your work for step 2', revision_count = 1
         WHERE homework_id = $1 AND group_id = $2 AND student_id = $3`,
        [hw1Id, world.group1, world.s1.id],
      );

      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          content: 'Updated work with step 2 detailed',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUBMITTED');
      expect(res.body.revisionCount).toBe(2);
      expect(res.body.content).toContain('Updated work');
    });

    it('disallows resubmission when assignment is GRADED', async () => {
      // Simulate teacher grading
      await testPool.query(
        `UPDATE homework_submissions
         SET status = 'GRADED', score = 9, graded_at = now()
         WHERE homework_id = $1 AND group_id = $2 AND student_id = $3`,
        [hw1Id, world.group1, world.s1.id],
      );

      const res = await s1
        .post(`/api/student/groups/${world.group1}/homework/${hw1Id}/submit`)
        .send({
          content: 'Trying to sneak another submission',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot resubmit a graded assignment');
    });
  });
});
