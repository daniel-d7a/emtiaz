import 'dotenv/config';
import request from 'supertest';
import {
  STUDENT1,
  STUDENT2,
  closeApp,
  getApp,
  login,
  seedWorld,
  testPool,
} from '../../db/test-helpers';

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;

const PARENT = {
  name: 'Umm Aisha',
  email: 'parent@example.om',
  password: 'Passw0rd!123',
  phoneNumber: '+96890000009',
};

beforeAll(async () => {
  server = (await getApp()).server;
  world = await seedWorld();
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('parent role', () => {
  it('signs up, links by phone, and reads progress and grades', async () => {
    const signup = await request(server).post('/api/onboarding/parent').send(PARENT);
    expect(signup.status).toBe(201);

    const parent = (await login(server, PARENT.email, PARENT.password)).session;

    const wrong = await parent.post('/api/parent/link').send({ phoneNumber: '+96890009999' });
    expect(wrong.status).toBe(404);

    const link = await parent.post('/api/parent/link').send({ phoneNumber: STUDENT1.phoneNumber });
    expect(link.status).toBe(201);
    expect(link.body.id).toBe(world.s1.id);

    const students = await parent.get('/api/parent/students');
    expect(students.status).toBe(200);
    expect(students.body).toHaveLength(1);
    expect(students.body[0].name).toBe(STUDENT1.name);
    expect(students.body[0].groups[0].group.id).toBe(world.group1);

    const grades = await parent.get(
      `/api/parent/students/${world.s1.id}/groups/${world.group1}/grades`,
    );
    expect(grades.status).toBe(200);
    expect(Array.isArray(grades.body.quizzes)).toBe(true);
    expect(Array.isArray(grades.body.manual)).toBe(true);

    const foreign = await parent.get(
      `/api/parent/students/${world.s2.id}/groups/${world.group1}/grades`,
    );
    expect(foreign.status).toBe(403);

    const readOnly = await parent
      .post(`/api/student/quizzes/${world.quiz}/submit`)
      .send({ groupId: world.group1, answers: {} });
    expect(readOnly.status).toBe(403);

    expect((await parent.delete(`/api/parent/students/${world.s1.id}`)).status).toBe(200);
    expect((await parent.get('/api/parent/students')).body).toHaveLength(0);
    expect(
      (
        await parent.get(
          `/api/parent/students/${world.s1.id}/groups/${world.group1}/grades`,
        )
      ).status,
    ).toBe(403);
  });

  it('rejects an unknown student phone before creating the account', async () => {
    const email = 'parent-bad@example.om';
    const res = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000011', studentPhone: '+96890009999' });
    expect(res.status).toBe(404);
    const attempt = await login(server, email, PARENT.password);
    expect(attempt.status).not.toBe(200);
  });

  it('links during signup using a local phone format and is idempotent', async () => {
    const email = 'parent2@example.om';
    const localPhone = STUDENT2.phoneNumber.replace('+968', '');
    const signup = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000010', studentPhone: localPhone });
    expect(signup.status).toBe(201);

    const parent = (await login(server, email, PARENT.password)).session;
    const students = await parent.get('/api/parent/students');
    expect(students.body).toHaveLength(1);
    expect(students.body[0].id).toBe(world.s2.id);

    await parent.post('/api/parent/link').send({ phoneNumber: STUDENT2.phoneNumber });
    const again = await parent.get('/api/parent/students');
    expect(again.body).toHaveLength(1);
  });

  it('normalizes spacing and 00 prefixes when linking', async () => {
    const email = 'parent3@example.om';
    await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000012' });
    const parent = (await login(server, email, PARENT.password)).session;

    const res = await parent
      .post('/api/parent/link')
      .send({ phoneNumber: '00968 9000 0002' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(world.s1.id);
  });
});
