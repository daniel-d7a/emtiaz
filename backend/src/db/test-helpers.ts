import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { createApp } from '../main';
import request from 'supertest';
import { Pool } from 'pg';
import { resetTestDb } from './migrate';

export const TEACHER = {
  email: 't@teacher.om',
  password: 'Passw0rd!123',
  name: 'Salim',
  phoneNumber: '+96890000001',
  subject: 'Sciences',
};
export const STUDENT1 = {
  email: 's1@student.om',
  password: 'Passw0rd!123',
  name: 'Aisha',
  phoneNumber: '+96890000002',
};
export const STUDENT2 = {
  email: 's2@student.om',
  password: 'Passw0rd!123',
  name: 'Huda',
  phoneNumber: '+96890000003',
};

let app: INestApplication | null = null;
let server: any = null;
export const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

export async function getApp() {
  if (!app) {
    const migrator = await resetTestDb();
    await migrator.end();
    app = await createApp();
    server = app.getHttpAdapter().getInstance();
  }
  return { app: app!, server: server! };
}

export async function closeApp() {
  await app?.close();
  app = null;
  server = null;
}

export async function login(server: any, email: string, password: string) {
  const session = request.agent(server);
  const res = await session
    .post('/api/auth/sign-in/email')
    .send({ email, password });
  return { session, status: res.status };
}

export async function getUserByEmail(email: string) {
  const { rows } = await testPool.query(
    `SELECT id, role FROM "user" WHERE email=$1`,
    [email],
  );
  return rows[0];
}

/** Creates a teacher, two students (via better-auth), a course with a module,
 *  lessons, an unlocked quiz, two groups, and enrolls both students in group 1. */
export const ADMIN = {
  email: 'admin@emtiaz.om',
  password: 'Passw0rd!123',
  name: 'Platform Admin',
  phoneNumber: '+96890000000',
};

export async function seedWorld() {
  const { server } = await getApp();
  await request(server)
    .post('/api/auth/sign-up/email')
    .send({ ...ADMIN, role: 'ADMIN' });
  await request(server)
    .post('/api/onboarding/teacher')
    .send(TEACHER);
  await request(server).post('/api/onboarding/student').send(STUDENT1);
  await request(server).post('/api/onboarding/student').send(STUDENT2);

  const { rows: gradeRows } = await testPool.query(
    `INSERT INTO grades (name, display_order) VALUES ('Grade 10', 5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
  );
  const gradeId = gradeRows[0].id;
  const { rows: categoryRows } = await testPool.query(
    `INSERT INTO categories (name) VALUES ('English Speaking') RETURNING id`,
  );
  const categoryId = categoryRows[0].id;

  const teacher = await getUserByEmail(TEACHER.email);
  const s1 = await getUserByEmail(STUDENT1.email);
  const s2 = await getUserByEmail(STUDENT2.email);

  const { rows } = await testPool.query(
    `INSERT INTO courses (title, description, course_type, teacher_id) VALUES ('Physics 10','Physics','ACADEMIC',$1) RETURNING id`,
    [teacher.id],
  );
  const courseId = rows[0].id;

  const module = (
    await testPool.query(
      `INSERT INTO modules (course_id, title, display_order) VALUES ($1,'Unit 1',0) RETURNING id`,
      [courseId],
    )
  ).rows[0].id;

  const lesson1 = (
    await testPool.query(
      `INSERT INTO lessons (module_id, title, content, display_order) VALUES ($1,'L1 Motion','notes',0) RETURNING id`,
      [module],
    )
  ).rows[0].id;
  const lesson2 = (
    await testPool.query(
      `INSERT INTO lessons (module_id, title, content, display_order) VALUES ($1,'L2 Forces','notes',1) RETURNING id`,
      [module],
    )
  ).rows[0].id;

  const quiz = (
    await testPool.query(
      `INSERT INTO quizzes (lesson_id, title) VALUES ($1,'L1 Quiz') RETURNING id`,
      [lesson1],
    )
  ).rows[0].id;
  const { rows: qRows } = await testPool.query(
    `INSERT INTO quiz_questions (quiz_id, question_type, prompt, options, correct_answer, explanation, points, display_order) VALUES
      ($1,'MCQ','What is S.I unit of speed?', '["km/h","m/s","N","J"]','m/s','speed is m/s',1,0),
      ($1,'TRUE_FALSE','Gravity accelerates objects at 9.8 m/s2 on Earth', NULL,'true','g=9.8',1,1) RETURNING id`,
    [quiz],
  );

  const group1 = (
    await testPool.query(
      `INSERT INTO groups (course_id, name, join_code) VALUES ($1,'Grade 10 Sun Tue','OM111111') RETURNING id`,
      [courseId],
    )
  ).rows[0].id;
  const group2 = (
    await testPool.query(
      `INSERT INTO groups (course_id, name, join_code) VALUES ($1,'Grade 10 Mon Wed','OM222222') RETURNING id`,
      [courseId],
    )
  ).rows[0].id;

  await testPool.query(
    `INSERT INTO group_students (group_id, student_id) VALUES ($1,$2),($1,$3),($4,$2)`,
    [group1, s1.id, s2.id, group2],
  );

  return {
    courseId,
    moduleId: module,
    lesson1,
    lesson2,
    quiz,
    questionIds: qRows.map((r) => r.id),
    group1,
    group2,
    teacher,
    s1,
    s2,
    gradeId,
    categoryId,
    admin: ADMIN,
  };
}
