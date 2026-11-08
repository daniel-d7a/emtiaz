import 'dotenv/config';
import request from 'supertest';
import {
  ADMIN,
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

describe('StorageController & Path Integrity', () => {
  let server: any;
  let world: Awaited<ReturnType<typeof seedWorld>>;

  let teacherSession: any;
  let strangerTeacherSession: any;
  let student1Session: any;
  let student2Session: any;
  let outsiderStudentSession: any;
  let parent1Session: any;
  let outsiderParentSession: any;
  let adminSession: any;

  let hwWithFileId: string;
  let hwWithoutFileId: string;
  let submissionWithFileId: string;
  let submissionWithoutFileId: string;

  const STRANGER_TEACHER = {
    email: 'storage-stranger@teacher.om',
    password: 'Passw0rd!123',
    name: 'Stranger Teacher',
    phoneNumber: '+96890000031',
    subject: 'History',
  };

  const OUTSIDER_STUDENT = {
    email: 'storage-outsider@student.om',
    password: 'Passw0rd!123',
    name: 'Outsider Student',
    phoneNumber: '+96890000032',
  };

  const PARENT1 = {
    email: 'storage-parent1@example.om',
    password: 'Passw0rd!123',
    name: 'Parent of S1',
    phoneNumber: '+96890000033',
  };

  const OUTSIDER_PARENT = {
    email: 'storage-outsider-parent@example.om',
    password: 'Passw0rd!123',
    name: 'Outsider Parent',
    phoneNumber: '+96890000034',
  };

  beforeAll(async () => {
    const got = await getApp();
    server = got.server;
    world = await seedWorld();

    // Log in teacher & admin
    teacherSession = (await login(server, TEACHER.email, TEACHER.password)).session;
    adminSession = (await login(server, ADMIN.email, ADMIN.password)).session;

    // Register & log in stranger teacher
    await request(server).post('/api/onboarding/teacher').send(STRANGER_TEACHER);
    strangerTeacherSession = (await login(server, STRANGER_TEACHER.email, STRANGER_TEACHER.password)).session;

    // Log in students
    student1Session = (await login(server, STUDENT1.email, STUDENT1.password)).session;
    student2Session = (await login(server, STUDENT2.email, STUDENT2.password)).session;

    // Register & log in outsider student (not enrolled)
    await request(server).post('/api/onboarding/student').send(OUTSIDER_STUDENT);
    outsiderStudentSession = (await login(server, OUTSIDER_STUDENT.email, OUTSIDER_STUDENT.password)).session;

    // Register & link parent 1 to student 1
    await request(server).post('/api/onboarding/parent').send(PARENT1);
    parent1Session = (await login(server, PARENT1.email, PARENT1.password)).session;
    const s1User = await getUserByEmail(STUDENT1.email);
    const linkRes = await parent1Session.post('/api/parent/link').send({ monitoringCode: s1User.monitoringCode });
    expect(linkRes.status).toBe(201);

    // Register outsider parent (no link to student 1)
    await request(server).post('/api/onboarding/parent').send(OUTSIDER_PARENT);
    outsiderParentSession = (await login(server, OUTSIDER_PARENT.email, OUTSIDER_PARENT.password)).session;
  });

  afterAll(async () => {
    await closeApp();
    await testPool.end();
  });

  describe('R2 storage key prefix validation', () => {
    it('rejects homework creation with invalid r2ObjectKey prefix', async () => {
      const badRes1 = await teacherSession
        .post(`/api/teacher/lessons/${world.lesson1}/homework`)
        .send({
          title: 'Exploit Homework',
          r2ObjectKey: 'avatars/attacker/file.pdf',
        });
      expect(badRes1.status).toBe(403);
      expect(badRes1.body.message).toContain('Invalid storage key prefix');

      const badRes2 = await teacherSession
        .post(`/api/teacher/lessons/${world.lesson1}/homework`)
        .send({
          title: 'Exploit Homework 2',
          r2ObjectKey: 'courses/different-course-id/lessons/l1/file.pdf',
        });
      expect(badRes2.status).toBe(403);
      expect(badRes2.body.message).toContain('Invalid storage key prefix');
    });

    it('accepts homework creation with valid course key prefix', async () => {
      const validKey = `courses/${world.courseId}/lessons/${world.lesson1}/worksheet.pdf`;
      const res = await teacherSession
        .post(`/api/teacher/lessons/${world.lesson1}/homework`)
        .send({
          title: 'Valid HW with File',
          r2ObjectKey: validKey,
        });
      expect(res.status).toBe(201);
      hwWithFileId = res.body.id;

      const noFileRes = await teacherSession
        .post(`/api/teacher/lessons/${world.lesson1}/homework`)
        .send({
          title: 'HW without File',
        });
      expect(noFileRes.status).toBe(201);
      hwWithoutFileId = noFileRes.body.id;
    });

    it('rejects homework update with invalid r2ObjectKey prefix', async () => {
      const badUpdate = await teacherSession
        .patch(`/api/teacher/homework/${hwWithFileId}`)
        .send({
          r2ObjectKey: 'submissions/other/file.pdf',
        });
      expect(badUpdate.status).toBe(403);
      expect(badUpdate.body.message).toContain('Invalid storage key prefix');
    });

    it('rejects student homework submission with invalid r2ObjectKey prefix', async () => {
      const badSubmit = await student1Session
        .post(`/api/student/groups/${world.group1}/homework/${hwWithFileId}/submit`)
        .send({
          r2ObjectKey: 'courses/exploit.pdf',
        });
      expect(badSubmit.status).toBe(403);
      expect(badSubmit.body.message).toContain('Invalid storage key prefix');

      const wrongHwSubmit = await student1Session
        .post(`/api/student/groups/${world.group1}/homework/${hwWithFileId}/submit`)
        .send({
          r2ObjectKey: `submissions/other-homework-id/my_work.pdf`,
        });
      expect(wrongHwSubmit.status).toBe(403);
      expect(wrongHwSubmit.body.message).toContain('Invalid storage key prefix');
    });

    it('accepts student homework submission with valid submissions prefix', async () => {
      const validSubKey = `submissions/${hwWithFileId}/s1-solution.pdf`;
      const submitRes = await student1Session
        .post(`/api/student/groups/${world.group1}/homework/${hwWithFileId}/submit`)
        .send({
          content: 'My completed homework',
          r2ObjectKey: validSubKey,
        });
      expect(submitRes.status).toBe(201);
      expect(submitRes.body.r2ObjectKey).toBe(validSubKey);

      // Fetch submission ID
      const { rows } = await testPool.query(
        `SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
        [hwWithFileId, world.s1.id],
      );
      submissionWithFileId = rows[0].id;

      // Create a submission without file for student 2
      const s2SubmitRes = await student2Session
        .post(`/api/student/groups/${world.group1}/homework/${hwWithFileId}/submit`)
        .send({
          content: 'Text only submission',
        });
      expect(s2SubmitRes.status).toBe(201);
      const { rows: s2Rows } = await testPool.query(
        `SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2`,
        [hwWithFileId, world.s2.id],
      );
      submissionWithoutFileId = s2Rows[0].id;
    });
  });

  describe('GET /api/storage/homework/:id/file authorization', () => {
    it('returns 404 for non-existent homework', async () => {
      const res = await teacherSession.get('/api/storage/homework/00000000-0000-0000-0000-000000000000/file');
      expect(res.status).toBe(404);
    });

    it('returns 404 when homework has no file attached', async () => {
      const res = await teacherSession.get(`/api/storage/homework/${hwWithoutFileId}/file`);
      expect(res.status).toBe(404);
    });

    it('allows owning teacher to access file (302 redirect to presigned URL)', async () => {
      const res = await teacherSession.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('worksheet.pdf');
    });

    it('allows ADMIN to access homework file', async () => {
      const res = await adminSession.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('worksheet.pdf');
    });

    it('refuses access to stranger teacher (403)', async () => {
      const res = await strangerTeacherSession.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('allows enrolled student with unlocked lesson to access file', async () => {
      const res = await student1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('worksheet.pdf');
    });

    it('refuses access to non-enrolled student (403)', async () => {
      const res = await outsiderStudentSession.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('allows linked parent to access file', async () => {
      const res = await parent1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('worksheet.pdf');
    });

    it('refuses access to outsider parent without child link (403)', async () => {
      const res = await outsiderParentSession.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('refuses student and parent access when homework is hidden', async () => {
      // Hide homework in both groups student is enrolled in
      await testPool.query(
        `INSERT INTO group_homework_access (group_id, homework_id, is_hidden)
         VALUES ($1, $2, true), ($3, $2, true)
         ON CONFLICT (group_id, homework_id) DO UPDATE SET is_hidden = true`,
        [world.group1, hwWithFileId, world.group2],
      );

      const studentRes = await student1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(studentRes.status).toBe(403);

      const parentRes = await parent1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(parentRes.status).toBe(403);

      // Unhide homework
      await testPool.query(
        `UPDATE group_homework_access SET is_hidden = false WHERE homework_id = $1`,
        [hwWithFileId],
      );
    });

    it('refuses student and parent access when lesson is locked', async () => {
      // Lock lesson1 for both groups student is enrolled in
      await testPool.query(
        `INSERT INTO group_lesson_access (group_id, lesson_id, is_unlocked)
         VALUES ($1, $2, false), ($3, $2, false)
         ON CONFLICT (group_id, lesson_id) DO UPDATE SET is_unlocked = false`,
        [world.group1, world.lesson1, world.group2],
      );

      const studentRes = await student1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(studentRes.status).toBe(403);

      const parentRes = await parent1Session.get(`/api/storage/homework/${hwWithFileId}/file`).redirects(0);
      expect(parentRes.status).toBe(403);

      // Unlock lesson1 again
      await testPool.query(
        `UPDATE group_lesson_access SET is_unlocked = true WHERE lesson_id = $1`,
        [world.lesson1],
      );
    });
  });

  describe('GET /api/storage/homework-submissions/:id/file authorization', () => {
    it('returns 404 for non-existent submission', async () => {
      const res = await teacherSession.get('/api/storage/homework-submissions/00000000-0000-0000-0000-000000000000/file');
      expect(res.status).toBe(404);
    });

    it('returns 404 when submission has no file attached', async () => {
      const res = await teacherSession.get(`/api/storage/homework-submissions/${submissionWithoutFileId}/file`);
      expect(res.status).toBe(404);
    });

    it('allows submitting student to access submission file', async () => {
      const res = await student1Session.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('s1-solution.pdf');
    });

    it('refuses access to another student (403)', async () => {
      const res = await student2Session.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('allows owning teacher to access submission file', async () => {
      const res = await teacherSession.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('s1-solution.pdf');
    });

    it('refuses access to stranger teacher (403)', async () => {
      const res = await strangerTeacherSession.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('allows linked parent to access submission file', async () => {
      const res = await parent1Session.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('s1-solution.pdf');
    });

    it('refuses access to unlinked parent (403)', async () => {
      const res = await outsiderParentSession.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(403);
    });

    it('allows ADMIN to access submission file', async () => {
      const res = await adminSession.get(`/api/storage/homework-submissions/${submissionWithFileId}/file`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('s1-solution.pdf');
    });
  });
});
