import 'dotenv/config';
import { ADMIN, closeApp, getApp, login, seedWorld, STUDENT1, testPool } from '../../db/test-helpers';

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;
let student: Awaited<ReturnType<typeof login>>['session'];

beforeAll(async () => {
  server = (await getApp()).server;
  world = await seedWorld();
  student = (await login(server, STUDENT1.email, STUDENT1.password)).session;
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('in-app notification inbox', () => {
  it('lists only the current user and tracks read state', async () => {
    const { rows } = await testPool.query(
      `INSERT INTO inbox_notifications (user_id, type, message) VALUES ($1,'TEACHER','مرحبا'), ($1,'PARENT','رسالة') RETURNING id`,
      [world.s1.id],
    );
    await testPool.query(
      `INSERT INTO inbox_notifications (user_id, type, message) VALUES ($1,'SYSTEM','not mine')`,
      [world.s2.id],
    );

    const list = await student.get('/api/notifications');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.every((n: any) => !('userId' in n))).toBe(true);
    expect(list.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.any(String),
        message: expect.any(String),
        createdAt: expect.any(String),
      }),
    );

    const negativeLimit = await student.get('/api/notifications?limit=-1');
    expect(negativeLimit.status).toBe(200);

    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(2);
    expect((await student.post(`/api/notifications/${rows[0].id}/read`)).status).toBe(201);
    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(1);
    expect((await student.post('/api/notifications/read-all')).status).toBe(201);
    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(0);
  });

  it('sends a monthly summary to linked parents', async () => {
    await testPool.query(
      `INSERT INTO "user" (id, name, email, role) VALUES ('monthly-parent', 'Umm Aisha', 'monthly@test.om', 'PARENT') ON CONFLICT DO NOTHING`,
    );
    await testPool.query(
      `INSERT INTO parent_students (parent_id, student_id) VALUES ('monthly-parent', $1) ON CONFLICT DO NOTHING`,
      [world.s1.id],
    );
    const admin = (await login(server, ADMIN.email, ADMIN.password)).session;
    const res = await admin.post('/api/admin/notifications/monthly-summary');
    expect(res.status).toBe(201);
    expect(res.body.parents).toBeGreaterThanOrEqual(1);

    const { rows } = await testPool.query(
      `SELECT message FROM inbox_notifications WHERE user_id='monthly-parent'`,
    );
    expect(rows[0].message).toContain(STUDENT1.name);
  });
});
