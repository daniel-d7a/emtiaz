import 'dotenv/config';
import { closeApp, getApp, login, seedWorld, STUDENT1, testPool } from '../../db/test-helpers';

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
    expect(list.body.every((n: any) => n.userId === world.s1.id)).toBe(true);

    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(2);
    expect((await student.post(`/api/notifications/${rows[0].id}/read`)).status).toBe(201);
    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(1);
    expect((await student.post('/api/notifications/read-all')).status).toBe(201);
    expect((await student.get('/api/notifications/unread-count')).body.unread).toBe(0);
  });
});
