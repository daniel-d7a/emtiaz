import 'dotenv/config';
import { EventEmitter } from 'node:events';
import request from 'supertest';
import {
  ADMIN,
  STUDENT1,
  TEACHER,
  closeApp,
  getApp,
  getUserByEmail,
  login,
  seedWorld,
  testPool,
} from '../db/test-helpers';
import { authAuditMiddleware } from './auth-audit';

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;

beforeAll(async () => {
  const started = await getApp();
  server = started.server;
  world = await seedWorld();
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

async function findAudit(action: string, actorId: string) {
  for (let i = 0; i < 50; i += 1) {
    const { rows } = await testPool.query(
      `SELECT action, response_type AS "responseType" FROM audit_logs WHERE action=$1 AND actor_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [action, actorId],
    );
    if (rows[0]) return rows[0];
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return null;
}

describe('auth audit', () => {
  it('records a successful and a failed sign-in', async () => {
    const teacher = await getUserByEmail(TEACHER.email);

    const ok = await login(server, TEACHER.email, TEACHER.password);
    expect(ok.status).toBe(200);
    expect(await findAudit('auth.login', teacher.id)).toMatchObject({
      responseType: 'success',
    });

    const bad = await login(server, TEACHER.email, 'wrong-password');
    expect(bad.status).toBe(401);
    expect(await findAudit('auth.login_failed', teacher.id)).toMatchObject({
      responseType: 'error',
    });
  });

  it('records registration and a duplicate-email failure', async () => {
    const email = 'audit-new@student.om';
    await request(server)
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'Passw0rd!123', name: 'Audit New', role: 'STUDENT' });
    const created = await getUserByEmail(email);
    expect(await findAudit('auth.register', created.id)).toMatchObject({
      responseType: 'success',
    });

    await request(server)
      .post('/api/auth/sign-up/email')
      .send({ email, password: 'Passw0rd!123', name: 'Audit New', role: 'STUDENT' });
    expect(await findAudit('auth.register_failed', created.id)).toMatchObject({
      responseType: 'error',
    });
  });

  it('records sign-out for the current user', async () => {
    const student = await getUserByEmail(STUDENT1.email);
    const session = request.agent(server);
    await session.post('/api/auth/sign-in/email').send({
      email: STUDENT1.email,
      password: STUDENT1.password,
    });
    const out = await session.post('/api/auth/sign-out').send({});
    expect(out.status).toBe(200);
    expect(await findAudit('auth.logout', student.id)).toMatchObject({
      responseType: 'success',
    });
  });

  it('records a rejected sign-out for the session owner', async () => {
    const admin = await getUserByEmail(ADMIN.email);
    const signIn = await request(server)
      .post('/api/auth/sign-in/email')
      .send({ email: ADMIN.email, password: ADMIN.password });
    const cookie = (signIn.headers['set-cookie'] as unknown as string[])
      .map((value) => value.split(';')[0])
      .join('; ');

    const res = new EventEmitter() as any;
    res.statusCode = 403;
    const req = {
      method: 'POST',
      path: '/sign-out',
      body: {},
      headers: { cookie, 'user-agent': 'jest' },
      ip: '127.0.0.1',
      originalUrl: '/api/auth/sign-out',
    } as any;
    await authAuditMiddleware()(req, res, () => {});
    res.emit('finish');

    expect(await findAudit('auth.logout_failed', admin.id)).toMatchObject({
      responseType: 'error',
    });
  });
});
