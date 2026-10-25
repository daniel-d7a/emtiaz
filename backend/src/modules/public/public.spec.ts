import 'dotenv/config';
import request from 'supertest';
import { STUDENT1, TEACHER, closeApp, getApp, login, seedWorld, testPool } from '../../db/test-helpers';

jest.setTimeout(120000);

let server: any;

beforeAll(async () => {
  server = (await getApp()).server;
  await seedWorld();
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('public teacher landing', () => {
  it('serves a published teacher page without private fields', async () => {
    const teacher = (await login(server, TEACHER.email, TEACHER.password)).session;
    const set = await teacher.patch('/api/me').send({
      landingSlug: 'salim-physics',
      landingBio: 'Physics for everyone',
      landingPublished: true,
    });
    expect(set.status).toBe(200);

    const page = await request(server).get('/api/public/teachers/salim-physics');
    expect(page.status).toBe(200);
    expect(page.body.teacher.name).toBe(TEACHER.name);
    expect(page.body.teacher.bio).toBe('Physics for everyone');
    expect(page.body.teacher.email).toBeUndefined();
    expect(page.body.courses.map((c: any) => c.title)).toContain('Physics 10');

    expect((await request(server).get('/api/public/teachers/salim-physics/avatar')).status).toBe(404);

    const hidden = await teacher.patch('/api/me').send({ landingPublished: false });
    expect(hidden.status).toBe(200);
    expect((await request(server).get('/api/public/teachers/salim-physics')).status).toBe(404);
  });

  it('rejects invalid slugs and non-teacher pages', async () => {
    const teacher = (await login(server, TEACHER.email, TEACHER.password)).session;
    expect((await teacher.patch('/api/me').send({ landingSlug: 'Bad Slug!' })).status).toBe(400);

    const student = (await login(server, STUDENT1.email, STUDENT1.password)).session;
    expect((await student.patch('/api/me').send({ landingSlug: 'aisha' })).status).toBe(400);
  });
});
