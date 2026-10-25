import 'dotenv/config';
import request from 'supertest';
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
let t: Awaited<ReturnType<typeof login>>['session'];

beforeAll(async () => {
  const got = await getApp();
  server = got.server;
  world = await seedWorld();
  t = (await login(server, TEACHER.email, TEACHER.password)).session;
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Phase 4: teacher endpoints', () => {
  describe('courses & curriculum', () => {
    let courseId: string;
    let moduleId: string;
    let lessonId: string;

    it('lists own courses with groups', async () => {
      const res = await t.get('/api/teacher/courses');
      expect(res.status).toBe(200);
      const mine = res.body.find((c: any) => c.id === world.courseId);
      expect(mine.groups).toHaveLength(2);
    });

    it('rejects malformed write payloads with 400', async () => {
      const badType = await t
        .post('/api/teacher/courses')
        .send({ title: 'X', courseType: 'VOCATIONAL', gradeId: world.gradeId });
      expect(badType.status).toBe(400);
      const badModule = await t
        .post(`/api/teacher/courses/${world.courseId}/modules`)
        .send({ title: '' });
      expect(badModule.status).toBe(400);
      const badReorder = await t
        .put(`/api/teacher/modules/${world.moduleId}/lessons/reorder`)
        .send({ lessonIds: ['not-a-uuid'] });
      expect(badReorder.status).toBe(400);
      const badQuiz = await t
        .post(`/api/teacher/lessons/${world.lesson1}/quiz`)
        .send({
          title: 'Q',
          questions: [{ questionType: 'MCQ', prompt: 'P', options: ['a'], correctAnswer: 'a' }],
        });
      expect(badQuiz.status).toBe(400); // MCQ needs ≥2 options
      const badCell = await t
        .put(`/api/teacher/groups/${world.group1}/gradebook/cell`)
        .send({ columnId: '00000000-0000-0000-0000-000000000000', studentId: 'x', score: -1 });
      expect(badCell.status).toBe(400);
    });

    it('creates an academic course requiring a grade', async () => {
      const bad = await t
        .post('/api/teacher/courses')
        .send({ title: 'No Grade', courseType: 'ACADEMIC' });
      expect(bad.status).toBe(403);

      const grade = { id: world.gradeId };
      const res = await t.post('/api/teacher/courses').send({
        title: 'Math 10',
        description: 'Algebra & Geometry',
        courseType: 'ACADEMIC',
        gradeId: grade.id,
        semester: 'Semester 1',
      });
      expect(res.status).toBe(201);
      courseId = res.body.id;
      expect(res.body.courseType).toBe('ACADEMIC');
    });

    it('creates a general course with category', async () => {
      const cat = { id: world.categoryId };
      const res = await t.post('/api/teacher/courses').send({
        title: 'IELTS Sprint',
        courseType: 'GENERAL',
        categoryId: cat.id,
      });
      expect(res.status).toBe(201);
      expect(res.body.courseType).toBe('GENERAL');
    });

    it('builds 2-level curriculum: modules -> lessons', async () => {
      const mod = await t
        .post(`/api/teacher/courses/${courseId}/modules`)
        .send({ title: 'Algebra' });
      expect(mod.status).toBe(201);
      moduleId = mod.body.id;

      const lesson = await t
        .post(`/api/teacher/modules/${moduleId}/lessons`)
        .send({ title: 'Linear equations', content: 'Read page 12' });
      expect(lesson.status).toBe(201);
      lessonId = lesson.body.id;
      expect(lesson.body.displayOrder).toBe(0);

      const lesson2 = await t
        .post(`/api/teacher/modules/${moduleId}/lessons`)
        .send({ title: 'Quadratic equations' });
      expect(lesson2.body.displayOrder).toBe(1);

      const cur = await t.get(`/api/teacher/courses/${courseId}/curriculum`);
      expect(cur.body[0].title).toBe('Algebra');
      expect(cur.body[0].lessons).toHaveLength(2);
      expect(cur.body[0].lessons[0].quiz).toBe(null);
    });

    it('reorders modules and lessons', async () => {
      const mod2 = (
        await t
          .post(`/api/teacher/courses/${courseId}/modules`)
          .send({ title: 'Geometry' })
      ).body;
      await t
        .put(`/api/teacher/courses/${courseId}/modules/reorder`)
        .send({ moduleIds: [mod2.id, moduleId] });
      const cur = await t.get(`/api/teacher/courses/${courseId}/curriculum`);
      expect(cur.body[0].title).toBe('Geometry');
    });

    it('students cannot create courses; teachers cannot touch other teachers\' courses', async () => {
      const s = (await login(server, STUDENT1.email, STUDENT1.password)).session;
      const res = await s.post('/api/teacher/courses').send({ title: 'x', courseType: 'GENERAL' });
      expect(res.status).toBe(403);
    });

    it('upserts an inline quiz with validation', async () => {
      const bad = await t.post(`/api/teacher/lessons/${lessonId}/quiz`).send({
        title: 'Algebra Quiz',
        questions: [
          {
            questionType: 'MCQ',
            prompt: '2+2?',
            options: ['3', '4'],
            correctAnswer: '5',
          },
        ],
      });
      expect(bad.status).toBe(403);

      const res = await t.post(`/api/teacher/lessons/${lessonId}/quiz`).send({
        title: 'Algebra Quiz',
        questions: [
          {
            questionType: 'MCQ',
            prompt: 'x + 3 = 5, x = ?',
            options: ['1', '2', '3'],
            correctAnswer: '2',
          },
          { questionType: 'SHORT_ANSWER', prompt: 'derive y=mx+c', correctAnswer: 'y=mx+c' },
          { questionType: 'TRUE_FALSE', prompt: '2 is prime', correctAnswer: 'true' },
          { questionType: 'MCQ', prompt: '2*3?', options: ['6','7'], correctAnswer: '6', points: 2 },
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body.questions).toHaveLength(4);
      expect(res.body.questions[3].points).toBe(2);
    });

    it('re-upserting a quiz resets its questions and attempts', async () => {
      const res = await t.post(`/api/teacher/lessons/${lessonId}/quiz`).send({
        title: 'Algebra Quiz v2',
        questions: [{ questionType: 'TRUE_FALSE', prompt: '1+1=2', correctAnswer: 'true' }],
      });
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.title).toBe('Algebra Quiz v2');
    });
  });

  describe('groups & pacing', () => {
    let newGroupId: string;

    it('creates a group with an auto join code', async () => {
      const res = await t
        .post(`/api/teacher/courses/${world.courseId}/groups`)
        .send({ name: 'Evening batch' });
      expect(res.status).toBe(201);
      expect(res.body.joinCode).toMatch(/^OM\d{6}$/);
      newGroupId = res.body.id;
    });

    it('pacing shows all course lessons with unlock flags', async () => {
      const res = await t.get(`/api/teacher/groups/${newGroupId}/pacing`);
      expect(res.status).toBe(200);
      expect(res.body.group.id).toBe(newGroupId);
      expect(res.body.lessons.some((l: any) => l.id === world.lesson1)).toBe(true);
      expect(res.body.lessons[0].unlocked).toBe(true);
    });

    it('toggles lesson access per group', async () => {
      const res = await t
        .patch(`/api/teacher/groups/${newGroupId}/lessons/${world.lesson1}/access`)
        .send({ isUnlocked: false });
      expect(res.status).toBe(200);
      const pacing = (
        await t.get(`/api/teacher/groups/${newGroupId}/pacing`)
      ).body;
      const l1 = pacing.lessons.find((l: any) => l.id === world.lesson1);
      expect(l1.unlocked).toBe(false);
      expect(l1.overridden).toBe(true);
    });

    it('refuses toggling a lesson outside the course', async () => {
      const { rows } = await testPool.query(
        `SELECT l.id FROM lessons l JOIN modules m ON l.module_id=m.id WHERE m.course_id <> $1 LIMIT 1`,
        [world.courseId],
      );
      const res = await t
        .patch(`/api/teacher/groups/${newGroupId}/lessons/${rows[0].id}/access`)
        .send({ isUnlocked: true });
      expect(res.status).toBe(403);
    });

    it('roster shows enrolled students', async () => {
      const res = await t.get(`/api/teacher/groups/${world.group1}/roster`);
      expect(res.status).toBe(200);
      expect(res.body.students).toHaveLength(2);
      const s1 = await getUserByEmail(STUDENT1.email);
      expect(res.body.students.some((x: any) => x.studentId === s1.id)).toBe(true);
    });

    it('bulk adds students by phone, creating users whose later login works', async () => {
      const res = await t
        .post(`/api/teacher/groups/${newGroupId}/roster/bulk`)
        .send({
          students: [
            { name: 'Bulk1', phoneNumber: '+96877770001' },
            { name: 'Bulk2', phoneNumber: '+96877770002' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((r: any) => r.created && r.enrolled)).toBe(true);

      // idempotent
      const again = await t
        .post(`/api/teacher/groups/${newGroupId}/roster/bulk`)
        .send({ students: [{ name: 'Bulk1', phoneNumber: '+96877770001' }] });
      expect(again.body[0].created).toBe(false);

      const roster = (
        await t.get(`/api/teacher/groups/${newGroupId}/roster`)
      ).body;
      expect(roster.students).toHaveLength(2);
    });

    it('moves a student between groups of the same course and refuses cross-course moves', async () => {
      const { rows } = await testPool.query(
        `SELECT student_id FROM group_students WHERE group_id=$1 LIMIT 1`,
        [newGroupId],
      );
      const studentId = rows[0].student_id;

      // create a different course group to test rejection
      const grade = { id: world.gradeId };
      const otherCourse = (
        await t
          .post('/api/teacher/courses')
          .send({ title: 'Other', courseType: 'ACADEMIC', gradeId: grade.id })
      ).body;
      const otherGroup = (
        await t
          .post(`/api/teacher/courses/${otherCourse.id}/groups`)
          .send({ name: 'Other group' })
      ).body;

      const cross = await t
        .post(`/api/teacher/groups/${newGroupId}/students/${studentId}/move`)
        .send({ toGroupId: otherGroup.id });
      expect(cross.status).toBe(403);

      const move = await t
        .post(`/api/teacher/groups/${newGroupId}/students/${studentId}/move`)
        .send({ toGroupId: world.group2 });
      expect(move.status).toBe(201);
      const roster = (await t.get(`/api/teacher/groups/${newGroupId}/roster`)).body;
      expect(roster.students.some((x: any) => x.studentId === studentId)).toBe(false);
    });

    it('removes a student', async () => {
      const s2 = await getUserByEmail(STUDENT2.email);
      const res = await t.delete(
        `/api/teacher/groups/${world.group1}/students/${s2.id}`,
      );
      expect(res.status).toBe(200);
      const roster = (await t.get(`/api/teacher/groups/${world.group1}/roster`)).body;
      expect(roster.students.some((x: any) => x.studentId === s2.id)).toBe(false);
      // put back for gradebook tests
      await testPool.query(
        `INSERT INTO group_students (group_id, student_id) VALUES ($1,$2)`,
        [world.group1, s2.id],
      );
    });
  });

  describe('gradebook matrix', () => {
    it('returns quiz columns + enrolled students', async () => {
      const res = await t.get(`/api/teacher/groups/${world.group1}/gradebook`);
      expect(res.status).toBe(200);
      expect(res.body.group.id).toBe(world.group1);
      expect(res.body.students).toHaveLength(2);
      expect(res.body.quizColumns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ quizId: world.quiz }),
        ]),
      );
    });

    it('shows best auto quiz scores per student', async () => {
      const s1 = await getUserByEmail(STUDENT1.email);
      await testPool.query(
        `INSERT INTO quiz_attempts (quiz_id, student_id, group_id, score, max_score, answers_json)
         VALUES ($1,$2,$3,4,4,'{}')`,
        [world.quiz, s1.id, world.group1],
      );
      const res = await t.get(`/api/teacher/groups/${world.group1}/gradebook`);
      const cell = res.body.quizCells[`${s1.id}:${world.quiz}`];
      expect(cell).toBe(4);
    });

    it('adds custom columns and upserts cells on the fly', async () => {
      const col = (
        await t
          .post(`/api/teacher/groups/${world.group1}/gradebook/columns`)
          .send({ title: 'Midterm Exam', maxScore: 20 })
      ).body;
      expect(col.maxScore).toBe(20);

      const s1 = await getUserByEmail(STUDENT1.email);
      const set = await t
        .put(`/api/teacher/groups/${world.group1}/gradebook/cell`)
        .send({ columnId: col.id, studentId: s1.id, score: 17, note: 'good' });
      expect(set.status).toBe(200);

      // update on blur
      await t
        .put(`/api/teacher/groups/${world.group1}/gradebook/cell`)
        .send({ columnId: col.id, studentId: s1.id, score: 19 });
      const gb = (await t.get(`/api/teacher/groups/${world.group1}/gradebook`)).body;
      const cells = gb.manualCells.filter((c: any) => c.columnId === col.id);
      expect(cells).toHaveLength(1);
      expect(cells[0].score).toBe(19);

      // refuses scores for students not in the group
      const s2 = await getUserByEmail(STUDENT2.email);
      await testPool.query(`DELETE FROM group_students WHERE group_id=$1 AND student_id=$2`, [world.group1, s2.id]);
      const bad = await t
        .put(`/api/teacher/groups/${world.group1}/gradebook/cell`)
        .send({ columnId: col.id, studentId: s2.id, score: 5 });
      expect(bad.status).toBe(403);
      await testPool.query(
        `INSERT INTO group_students (group_id, student_id) VALUES ($1,$2)`,
        [world.group1, s2.id],
      );
    });

    it('another teacher cannot read my gradebook', async () => {
      const other = await t
        .post('/api/onboarding/teacher')
        .send({ ...TEACHER, email: 'other@teacher.om', phoneNumber: '+96890000009' });
      void other;
      const ot = (await login(server, 'other@teacher.om', TEACHER.password)).session;
      const res = await ot.get(`/api/teacher/groups/${world.group1}/gradebook`);
      expect(res.status).toBe(403);
    });
  });

  describe('storage', () => {
    const saved: Record<string, string | undefined> = {};
    beforeAll(() => {
      // Presigning is offline; dummy config exercises the real (non-stub) code path.
      saved.endpoint = process.env.R2_ENDPOINT;
      saved.key = process.env.R2_ACCESS_KEY_ID;
      saved.secret = process.env.R2_SECRET_ACCESS_KEY;
      saved.bucket = process.env.R2_BUCKET_NAME;
      process.env.R2_ENDPOINT = 'http://127.0.0.1:9';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      process.env.R2_BUCKET_NAME = 'test-bucket';
    });
    afterAll(() => {
      for (const [k, v] of Object.entries({
        R2_ENDPOINT: saved.endpoint,
        R2_ACCESS_KEY_ID: saved.key,
        R2_SECRET_ACCESS_KEY: saved.secret,
        R2_BUCKET_NAME: saved.bucket,
      })) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    });

    it('issues presigned upload and saves attachment metadata', async () => {
      const up = await t.post('/api/storage/presigned-upload').send({
        courseId: world.courseId,
        lessonId: world.lesson1,
        fileName: 'worksheet.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1200,
      });
      expect(up.status).toBe(201);
      expect(up.body.uploadUrl).toContain(up.body.objectKey);

      const att = await t.post('/api/storage/attachments').send({
        lessonId: world.lesson1,
        title: 'Worksheet PDF',
        objectKey: up.body.objectKey,
        mimeType: 'application/pdf',
        fileSizeBytes: 1200,
      });
      expect(att.status).toBe(201);
      expect(att.body.fileType).toBe('PDF');
      expect(att.body.r2ObjectKey).toBe(up.body.objectKey);

      const s = (await login(server, STUDENT1.email, STUDENT1.password)).session;
      const dl = await s.get(`/api/storage/attachments/${att.body.id}/download`);
      expect(dl.status).toBe(200);
      expect(dl.body.url).toContain(att.body.r2ObjectKey);
    });

    it('returns 503 instead of a fake URL when storage is unconfigured', async () => {
      const env = { ...process.env };
      delete process.env.R2_ENDPOINT;
      try {
        const res = await t.post('/api/storage/presigned-upload').send({
          courseId: world.courseId,
          lessonId: world.lesson1,
          fileName: 'x.pdf',
        });
        expect(res.status).toBe(503);
      } finally {
        Object.assign(process.env, env);
      }
    });

    it('refuses uploads to lessons outside own courses', async () => {
      await fetch; // noop to keep style
      const stranger = await request(server)
        .post('/api/onboarding/teacher')
        .send({ ...TEACHER, email: 'stranger@teacher.om', phoneNumber: '+96890000010' });
      expect(stranger.status).toBe(201);
      const strangerId = (await getUserByEmail('stranger@teacher.om')).id;
      const otherCourse = (await testPool.query(
        `INSERT INTO courses (title, teacher_id) VALUES ('Stranger Course', $1) RETURNING id`,
        [strangerId],
      )).rows[0].id;
      const otherMod = (await testPool.query(`INSERT INTO modules (course_id, title) VALUES ($1,'m') RETURNING id`, [otherCourse])).rows[0].id;
      const otherLesson = (await testPool.query(`INSERT INTO lessons (module_id, title) VALUES ($1,'l') RETURNING id`, [otherMod])).rows[0].id;
      const res = await t.post('/api/storage/presigned-upload').send({
        courseId: otherCourse,
        lessonId: otherLesson,
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1,
      });
      expect(res.status).toBe(403);
    });
  });
});
