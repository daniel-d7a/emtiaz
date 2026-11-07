import 'dotenv/config';
import request from 'supertest';
import {
  TEACHER,
  closeApp,
  getApp,
  getUserByEmail,
  login,
  seedWorld,
  testPool,
} from '../../db/test-helpers';

jest.setTimeout(120000);

let server: any;
let world: Awaited<ReturnType<typeof seedWorld>>;
let teacherSession: Awaited<ReturnType<typeof login>>['session'];

beforeAll(async () => {
  const got = await getApp();
  server = got.server;
  world = await seedWorld();
  teacherSession = (await login(server, TEACHER.email, TEACHER.password)).session;
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Teacher Subscription Snapshot & Profile Entitlements (Ticket 02)', () => {
  it('evaluates against default Free plan when no subscription exists', async () => {
    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      activePlan: {
        slug: 'free',
        tierRank: 0,
        maxStudents: 10,
        maxStorageBytes: 1073741824,
        source: 'FREE',
        status: 'FREE',
      },
      country: 'OM',
      currency: 'OMR',
      isLockedOut: false,
    });
    // In seedWorld, student 1 and student 2 are enrolled, s2 is in both group1 and group2
    expect(res.body.usage.activeStudentCount).toBe(2);
    expect(res.body.usage.activeGroupCount).toBe(2);
    expect(res.body.usage.usedStorageBytes).toBe(0);
  });

  it('deduplicates students across multiple active groups', async () => {
    // s2 is enrolled in both group1 and group2, s1 in group1 => unique count must be 2
    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body.usage.activeStudentCount).toBe(2);
  });

  it('retains students who joined during the current calendar month even when group is archived', async () => {
    // Create a new group for world.courseId
    const { rows: grpRows } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active)
       VALUES ($1, 'Temp Group', 'OM998877', true) RETURNING id`,
      [world.courseId],
    );
    const tempGroupId = grpRows[0].id;

    // Create student 3
    await request(server)
      .post('/api/onboarding/student')
      .send({ email: 's3@student.om', password: 'Passw0rd!123', name: 'Zahra', phoneNumber: '+96890000004' });
    const s3 = await getUserByEmail('s3@student.om');

    // Enroll student 3 in temp group today (joined_at = now())
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id, joined_at) VALUES ($1, $2, now())`,
      [tempGroupId, s3.id],
    );

    let res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.body.usage.activeStudentCount).toBe(3);

    // Archive the group mid-month (is_active = false)
    await testPool.query(`UPDATE groups SET is_active = false WHERE id = $1`, [tempGroupId]);

    // Student 3 joined in the current calendar month, so activeStudentCount remains 3
    res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.body.usage.activeStudentCount).toBe(3);

    // Clean up temp group
    await testPool.query(`DELETE FROM group_students WHERE group_id = $1`, [tempGroupId]);
    await testPool.query(`DELETE FROM groups WHERE id = $1`, [tempGroupId]);
  });

  it('calculates used storage bytes from lesson attachments across non-deleted courses', async () => {
    // Insert attachment into world.lesson1 (4096 bytes)
    const { rows: attRows } = await testPool.query(
      `INSERT INTO lesson_attachments (lesson_id, title, file_type, file_size_bytes)
       VALUES ($1, 'Test Worksheet', 'PDF', 4096) RETURNING id`,
      [world.lesson1],
    );
    const attId = attRows[0].id;

    let res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.body.usage.usedStorageBytes).toBe(4096);

    // Add another attachment (8192 bytes)
    const { rows: attRows2 } = await testPool.query(
      `INSERT INTO lesson_attachments (lesson_id, title, file_type, file_size_bytes)
       VALUES ($1, 'Notes', 'PDF', 8192) RETURNING id`,
      [world.lesson1],
    );
    const attId2 = attRows2[0].id;

    res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.body.usage.usedStorageBytes).toBe(12288);

    // Clean up attachments
    await testPool.query(`DELETE FROM lesson_attachments WHERE id IN ($1, $2)`, [attId, attId2]);
  });

  it('does not count storage from soft-deleted courses', async () => {
    // Create soft-deleted course for teacher
    const { rows: delCourse } = await testPool.query(
      `INSERT INTO courses (title, teacher_id, deleted_at) VALUES ('Deleted Course', $1, now()) RETURNING id`,
      [world.teacher.id],
    );
    const courseId = delCourse[0].id;
    const { rows: modRows } = await testPool.query(
      `INSERT INTO modules (course_id, title) VALUES ($1, 'Mod') RETURNING id`,
      [courseId],
    );
    const { rows: lesRows } = await testPool.query(
      `INSERT INTO lessons (module_id, title) VALUES ($1, 'Les') RETURNING id`,
      [modRows[0].id],
    );
    await testPool.query(
      `INSERT INTO lesson_attachments (lesson_id, title, file_type, file_size_bytes)
       VALUES ($1, 'Hidden Att', 'PDF', 500000)`,
      [lesRows[0].id],
    );

    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.body.usage.usedStorageBytes).toBe(0);
  });

  it('enforces snapshot grandfathering: editing plans table does not alter active subscription snapshot', async () => {
    // Insert active Early Bird subscription snapshot for teacher expiring in 30 days
    const { rows: subRows } = await testPool.query(
      `INSERT INTO teacher_subscriptions (
         teacher_id, plan_slug, tier_rank, plan_name_ar, plan_name_en, price_paid,
         currency, billing_cycle, max_students, max_storage_bytes, starts_at, ends_at, source
       ) VALUES (
         $1, 'early-bird', 30, 'الانطلاقة المبكرة القديمة', 'Old Early Bird', 5,
         'OMR', 'TRIAL', 500, 107374182400, now(), now() + interval '30 days', 'EARLY_BIRD_TRIAL'
       ) RETURNING id`,
      [world.teacher.id],
    );
    const subId = subRows[0].id;

    try {
      // Modify catalog plan 'early-bird'
      await testPool.query(
        `UPDATE plans SET name_ar = 'اسم جديد معدل', max_students = 999 WHERE slug = 'early-bird'`,
      );

      // Entitlements must still return snapshotted values, not modified catalog values
      const res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.activePlan).toMatchObject({
        slug: 'early-bird',
        nameAr: 'الانطلاقة المبكرة القديمة',
        nameEn: 'Old Early Bird',
        tierRank: 30,
        maxStudents: 500,
        maxStorageBytes: 107374182400,
        source: 'EARLY_BIRD_TRIAL',
        status: 'TRIAL',
      });
      expect(res.body.isLockedOut).toBe(false);
    } finally {
      // Clean up subscription and restore plan
      await testPool.query(`DELETE FROM teacher_subscriptions WHERE id = $1`, [subId]);
      await testPool.query(
        `UPDATE plans SET name_ar = 'الانطلاقة المبكرة', max_students = 500 WHERE slug = 'early-bird'`,
      );
    }
  });

  it('evaluates status as EXPIRED and locks out if usage exceeds Free limits after subscription ends', async () => {
    // Insert expired subscription (ended 5 days ago)
    const { rows: subRows } = await testPool.query(
      `INSERT INTO teacher_subscriptions (
         teacher_id, plan_slug, tier_rank, plan_name_ar, plan_name_en, price_paid,
         currency, billing_cycle, max_students, max_storage_bytes, starts_at, ends_at, source
       ) VALUES (
         $1, 'pro', 10, 'المحترف', 'Pro', 10,
         'OMR', 'MONTHLY', 50, 10737418240, now() - interval '35 days', now() - interval '5 days', 'ADMIN_PAID'
       ) RETURNING id`,
      [world.teacher.id],
    );
    const subId = subRows[0].id;

    try {
      // Teacher currently has 2 students and 0 storage (< 10 students, < 1 GB)
      let res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.activePlan.status).toBe('EXPIRED');
      expect(res.body.activePlan.slug).toBe('free');
      expect(res.body.isLockedOut).toBe(false);

      // Temporarily lower Free plan limit to 1 student to simulate usage > Free limit
      await testPool.query(`UPDATE plans SET max_students = 1 WHERE slug = 'free'`);

      res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.activePlan.status).toBe('EXPIRED');
      // With 2 students and max_students = 1, isLockedOut must be true
      expect(res.body.isLockedOut).toBe(true);
    } finally {
      await testPool.query(`DELETE FROM teacher_subscriptions WHERE id = $1`, [subId]);
      await testPool.query(`UPDATE plans SET max_students = 10 WHERE slug = 'free'`);
    }
  });

  it('resolves Egypt currency EGP for Egyptian teacher', async () => {
    // Create an Egyptian teacher
    await request(server)
      .post('/api/onboarding/teacher')
      .send({
        email: 'eg-teacher@emtiaz.eg',
        password: 'Passw0rd!123',
        name: 'Mahmoud',
        phoneNumber: '+201012345678',
        subject: 'Math',
        country: 'EG',
      });

    const egSession = (await login(server, 'eg-teacher@emtiaz.eg', 'Passw0rd!123')).session;
    const res = await egSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body.country).toBe('EG');
    expect(res.body.currency).toBe('EGP');
  });

  it('guarantees public storefront /api/public/teachers/:slug never leaks plan or usage data', async () => {
    // Publish teacher landing page
    await testPool.query(
      `UPDATE "user" SET landing_slug = 'salim-phys', landing_published = true WHERE id = $1`,
      [world.teacher.id],
    );

    const res = await request(server).get('/api/public/teachers/salim-phys');
    expect(res.status).toBe(200);
    expect(res.body.teacher).toBeDefined();
    expect(res.body.teacher.plan).toBeUndefined();
    expect(res.body.teacher.subscription).toBeUndefined();
    expect(res.body.teacher.entitlements).toBeUndefined();
    expect(res.body.teacher.usage).toBeUndefined();
    expect(res.body.teacher.activeStudentCount).toBeUndefined();
    expect(res.body.teacher.usedStorageBytes).toBeUndefined();
  });
});
