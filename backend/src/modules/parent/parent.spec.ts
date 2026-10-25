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

async function parentCode(studentId: string) {
  const { rows } = await testPool.query(
    `SELECT parent_invite_code FROM "user" WHERE id=$1`,
    [studentId],
  );
  return rows[0].parent_invite_code as string;
}

describe('parent role', () => {
  it('signs up, links with a student code, and reads progress and grades', async () => {
    const code = await parentCode(world.s1.id);
    const signup = await request(server).post('/api/onboarding/parent').send(PARENT);
    expect(signup.status).toBe(201);

    const parent = (await login(server, PARENT.email, PARENT.password)).session;

    const wrong = await parent.post('/api/parent/link').send({ code: 'PNOPE123' });
    expect(wrong.status).toBe(404);

    const link = await parent.post('/api/parent/link').send({ code });
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
  });

  it('rejects a bad signup code before creating the account', async () => {
    const email = 'parent-bad@example.om';
    const res = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000011', studentCode: 'PNOPE123' });
    expect(res.status).toBe(404);
    const attempt = await login(server, email, PARENT.password);
    expect(attempt.status).not.toBe(200);
  });

  it('rotating a student code unlinks parents and invalidates the old code', async () => {
    const oldCode = await parentCode(world.s2.id);
    const email = 'parent3@example.om';
    await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000012', studentCode: oldCode });
    const parent = (await login(server, email, PARENT.password)).session;
    expect((await parent.get('/api/parent/students')).body).toHaveLength(1);

    const student = (await login(server, STUDENT2.email, STUDENT2.password)).session;
    const rotated = await student.post('/api/student/parent-code/rotate');
    expect(rotated.status).toBe(201);
    expect(rotated.body.parentInviteCode).not.toBe(oldCode);

    expect((await parent.get('/api/parent/students')).body).toHaveLength(0);
    expect((await parent.post('/api/parent/link').send({ code: oldCode })).status).toBe(404);
    expect(
      (await parent.post('/api/parent/link').send({ code: rotated.body.parentInviteCode })).status,
    ).toBe(201);
  });

  it('can link an existing child during signup and is idempotent', async () => {
    const code = await parentCode(world.s2.id);
    const email = 'parent2@example.om';
    const signup = await request(server)
      .post('/api/onboarding/parent')
      .send({ ...PARENT, email, phoneNumber: '+96890000010', studentCode: code });
    expect(signup.status).toBe(201);

    const parent = (await login(server, email, PARENT.password)).session;
    const students = await parent.get('/api/parent/students');
    expect(students.body).toHaveLength(1);
    expect(students.body[0].id).toBe(world.s2.id);

    await parent.post('/api/parent/link').send({ code });
    const again = await parent.get('/api/parent/students');
    expect(again.body).toHaveLength(1);
  });
});
