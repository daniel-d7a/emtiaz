import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { createApp } from '../../main';
import request from 'supertest';
import { Pool } from 'pg';
import { resetTestDb } from '../../db/migrate';

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
    expect(res.body.ok).toBe(true);
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
        specialization: 'Math',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('TEACHER');
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
