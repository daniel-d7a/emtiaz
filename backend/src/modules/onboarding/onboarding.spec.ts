import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { createApp } from '../../main';
import request from 'supertest';
import { Pool } from 'pg';
import { resetTestDb } from '../../db/migrate';
import { StorageService } from '../storage/storage.service';

jest.setTimeout(90000);

let app: INestApplication;
let server: any;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

beforeAll(async () => {
  const migrator = await resetTestDb();
  await migrator.end();
  app = await createApp();
  server = app.getHttpAdapter().getInstance();
});

afterAll(async () => {
  await app?.close();
  await pool.end();
});

describe('Phase 2: auth & onboarding', () => {
  it('health endpoint is public', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'up' });
  });

  it('serves the OpenAPI contract outside production', async () => {
    const res = await request(server).get('/api/docs-json');
    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Emtiaz LMS API');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(10);
    const ui = await request(server).get('/api/docs');
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');
  });

  it('blocks protected endpoints without session', async () => {
    const res = await request(server).post('/api/onboarding/join/OM999999');
    expect(res.status).toBe(403);
  });

  it('registers a teacher with role TEACHER via self onboarding', async () => {
    const res = await request(server)
      .post('/api/onboarding/teacher')
      .send({
        name: 'Salim Al Balushi',
        email: 'salim@teacher.om',
        password: 'Passw0rd!123',
        phoneNumber: '+96891110001',
        subject: 'Math',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('TEACHER');
    const { rows } = await pool.query(
      "SELECT u.subject_category_id, c.name FROM \"user\" u JOIN categories c ON c.id=u.subject_category_id WHERE u.email='salim@teacher.om'",
    );
    expect(rows[0]).toMatchObject({ name: 'Math', subject_category_id: expect.any(String) });
  });
  it('teacher signup without a subject is rejected (400)', async () => {
    const res = await request(server)
      .post('/api/onboarding/teacher')
      .send({ name: 'No Subject', email: 'nosubject@teacher.om', password: 'Passw0rd!123' });
    expect(res.status).toBe(400);
  });

  it('registers a student via onboarding with default role STUDENT', async () => {
    const res = await request(server)
      .post('/api/onboarding/student')
      .send({
        name: 'Aisha',
        email: 'aisha@student.om',
        password: 'Passw0rd!123',
        phoneNumber: '+96892220002',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('PATCH /api/me updates teacher name and phone, empty phone clears it', async () => {
    const s = request.agent(server);
    await s.post('/api/auth/sign-in/email').send({ email: 'salim@teacher.om', password: 'Passw0rd!123' });
    const res = await s
      .patch('/api/me')
      .send({ name: 'Salim B', phoneNumber: '+96891119999', subject: 'Physics' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Salim B', phoneNumber: '+96891119999' });
    expect(res.body.subjectCategoryId).toBeDefined(); // subject normalized to the taxonomy FK
    expect(res.body).not.toHaveProperty('adminRoleId');
    expect(res.body).not.toHaveProperty('deletedAt');
    expect(res.body).not.toHaveProperty('landingBanner');
    const me = await s.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.user).not.toHaveProperty('adminRoleId');
    expect(me.body.user).not.toHaveProperty('deletedAt');
    expect(me.body.user).not.toHaveProperty('image');
    expect(me.body.user).not.toHaveProperty('landingBanner');
    const res2 = await s.patch('/api/me').send({ phoneNumber: '' });
    expect(res2.status).toBe(200);
    expect(res2.body.phoneNumber).toBeNull();
    const res3 = await s.patch('/api/me').send({});
    expect(res3.status).toBe(200);
    expect(res3.body.name).toBe('Salim B'); // no-op still returns profile
  });

  it('avatar: presigns images, rejects non-images/foreign keys, serves a signed redirect', async () => {
    const { rows } = await pool.query(
      `SELECT id FROM "user" WHERE email='salim@teacher.om'`,
    );
    const userId = rows[0].id;
    const s = request.agent(server);
    await s.post('/api/auth/sign-in/email').send({ email: 'salim@teacher.om', password: 'Passw0rd!123' });

    const nonImage = await s
      .post('/api/storage/avatar')
      .send({ fileName: 'cv.pdf', mimeType: 'application/pdf', fileSizeBytes: 100 });
    expect(nonImage.status).toBe(400);
    const saved = { ...process.env };
    process.env.R2_ENDPOINT = 'http://127.0.0.1:9';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    try {
      const up = await s
        .post('/api/storage/avatar')
        .send({ fileName: 'me.png', mimeType: 'image/png', fileSizeBytes: 100 });
      expect(up.status).toBe(201);
      expect(up.body.objectKey).toMatch(new RegExp(`^avatars/${userId}/`));
      expect(up.body.uploadUrl).toContain(up.body.objectKey);

      const foreign = await s
        .patch('/api/me')
        .send({ image: 'avatars/someone-else/pic.png' });
      expect(foreign.status).toBe(400);

      const own = await s.patch('/api/me').send({ image: up.body.objectKey });
      expect(own.status).toBe(200);
      expect(own.body).not.toHaveProperty('image');
      const savedRow = await pool.query('SELECT image FROM "user" WHERE id=$1', [userId]);
      expect(savedRow.rows[0].image).toBe(up.body.objectKey);

      const av = await s.get('/api/me/avatar');
      expect(av.status).toBe(302);
      expect(av.headers.location).toContain(up.body.objectKey);

      const storage = app.get(StorageService);
      const del = jest.spyOn(storage, 'deleteObject').mockResolvedValue();
      const cleared = await s.patch('/api/me').send({ image: null });
      expect(cleared.body).not.toHaveProperty('image');
      expect(del).toHaveBeenCalledWith(up.body.objectKey);
      del.mockRestore();
      const none = await s.get('/api/me/avatar');
      expect(none.status).toBe(404);
    } finally {
      process.env.R2_ENDPOINT = saved.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = saved.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = saved.R2_SECRET_ACCESS_KEY;
      process.env.R2_BUCKET_NAME = saved.R2_BUCKET_NAME;
      if (saved.R2_ENDPOINT === undefined) delete process.env.R2_ENDPOINT;
      if (saved.R2_ACCESS_KEY_ID === undefined) delete process.env.R2_ACCESS_KEY_ID;
      if (saved.R2_SECRET_ACCESS_KEY === undefined) delete process.env.R2_SECRET_ACCESS_KEY;
      if (saved.R2_BUCKET_NAME === undefined) delete process.env.R2_BUCKET_NAME;
    }
  });

  it('blocks /api/me for anonymous users', async () => {
    const res = await request(server).patch('/api/me').send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('signs in via better-auth and cookie reaches guarded endpoints', async () => {
    const s = request.agent(server);
    const login = await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });
    expect(login.status).toBe(200);
    const join = await s.post('/api/onboarding/join/OM404404');
    expect(join.status).toBe(404); // authenticated but bad code
  });

  it('joins an existing group via join code and is idempotent', async () => {
    const { rows: courseRows } = await pool.query(
      `INSERT INTO courses (title, teacher_id) SELECT 'Physics', id FROM "user" WHERE email='salim@teacher.om' RETURNING id`,
    );
    const courseId = courseRows[0].id;
    await pool.query(
      `INSERT INTO groups (course_id, name, join_code) VALUES ('${courseId}', 'Batch A', 'OM123456')`,
    );

    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });

    const first = await s.post('/api/onboarding/join/OM123456');
    expect(first.status).toBe(201);
    expect(first.body.group.joinCode).toBe('OM123456');
    expect(first.body.course.title).toBe('Physics');

    await s.post('/api/onboarding/join/OM123456');
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM group_students
       WHERE student_id = (SELECT id FROM "user" WHERE email='aisha@student.om')`,
    );
    expect(rows[0].c).toBe(1);
  });

  it('mock-whatsapp messages are logged for new enrollments only', async () => {
    const { rows: courseRows } = await pool.query(
      `INSERT INTO courses (title, teacher_id) SELECT 'Chem', id FROM "user" WHERE email='salim@teacher.om' RETURNING id`,
    );
    await pool.query(
      `INSERT INTO groups (course_id, name, join_code) VALUES ('${courseRows[0].id}', 'Batch B', 'OM777777')`,
    );
    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });

    await s.post('/api/onboarding/join/OM777777');
    await s.post('/api/onboarding/join/OM777777'); // re-join: no second message
    const { rows } = await pool.query(
      `SELECT recipient, message FROM notifications
       WHERE message LIKE '%Batch B%'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].message).toContain('Batch B');
    expect(rows[0].recipient).toBe(
      (
        await pool.query(
          `SELECT phone_number FROM "user" WHERE email='aisha@student.om'`,
        )
      ).rows[0].phone_number,
    );
  });

  it('suspended users are rejected by the guard', async () => {
    await pool.query(
      `UPDATE "user" SET is_active=false WHERE email='aisha@student.om'`,
    );
    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });
    // suspended users are rejected everywhere, even public routes (lockout)
    const res = await s.get('/api/health');
    expect(res.status).toBe(403);
    const join = await s.post('/api/onboarding/join/OM123456');
    expect([403, 500]).toContain(join.status);
    await pool.query(
      `UPDATE "user" SET is_active=true WHERE email='aisha@student.om'`,
    );
  });
});
