import 'dotenv/config';
import request from 'supertest';
import {
  STUDENT1,
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
let studentSession: Awaited<ReturnType<typeof login>>['session'];
let parentSession: Awaited<ReturnType<typeof login>>['session'];

const PARENT = {
  name: 'Umm Aisha',
  email: 'parent.limits@example.om',
  password: 'Passw0rd!123',
  phoneNumber: '+96899990009',
};

beforeAll(async () => {
  const got = await getApp();
  server = got.server;
  world = await seedWorld();
  teacherSession = (await login(server, TEACHER.email, TEACHER.password)).session;
  studentSession = (await login(server, STUDENT1.email, STUDENT1.password)).session;

  await request(server)
    .post('/api/onboarding/parent')
    .send(PARENT);
  parentSession = (await login(server, PARENT.email, PARENT.password)).session;
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Limit Enforcement, First-Month Discount & Upgrade Gate (Ticket 03)', () => {
  it('rejects roster import on group creation when exceeding maxStudents with 402 PLAN_LIMIT_REACHED', async () => {
    // Current usage is 2 students (student1, student2). Free plan limit is 10.
    // Adding 9 new unique students would make 11 > 10.
    const nineStudents = Array.from({ length: 9 }).map((_, i) => ({
      name: `Student Test ${i + 10}`,
      phoneNumber: `+968988877${i}0`,
    }));

    const res = await teacherSession
      .post(`/api/teacher/courses/${world.courseId}/groups`)
      .send({
        name: 'Over-limit Group',
        students: nineStudents,
      });

    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({
      error: 'PLAN_LIMIT_REACHED',
      limitType: 'STUDENTS',
      currentUsage: 2,
      limit: 10,
    });
    expect(Array.isArray(res.body.upgradeOptions)).toBe(true);
    expect(res.body.upgradeOptions.length).toBeGreaterThan(0);
    // Seeded Early Bird is public with tierRank 30 > 0
    const earlyBird = res.body.upgradeOptions.find((o: any) => o.slug === 'early-bird');
    expect(earlyBird).toBeDefined();
    expect(earlyBird.firstMonthDiscountEligible).toBe(true);
  });

  it('rejects entry code creation when activeStudentCount + maxUses > maxStudents with 402', async () => {
    // Current usage is 2 students, limit is 10.
    // maxUses = 9 -> 2 + 9 = 11 > 10 => reject!
    const res = await teacherSession
      .post(`/api/teacher/groups/${world.group1}/entry-codes`)
      .send({ maxUses: 9 });

    expect(res.status).toBe(402);
    expect(res.body).toMatchObject({
      error: 'PLAN_LIMIT_REACHED',
      limitType: 'STUDENTS',
      currentUsage: 2,
      limit: 10,
    });

    // Within limit: maxUses = 5 -> 2 + 5 = 7 <= 10 => succeeds!
    const okRes = await teacherSession
      .post(`/api/teacher/groups/${world.group1}/entry-codes`)
      .send({ maxUses: 5 });
    expect(okRes.status).toBe(201);
  });

  it('rejects group reactivation when unique students in group push teacher over maxStudents', async () => {
    // Create an inactive group
    const { rows: grpRows } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active)
       VALUES ($1, 'Inactive Group', 'OM112233', false) RETURNING id`,
      [world.courseId],
    );
    const inactiveGroupId = grpRows[0].id;

    // Enroll 9 unique students in this inactive group (joined last month so not in current month window)
    for (let i = 0; i < 9; i++) {
      const email = `reactivate${i}@student.om`;
      const phone = `+968911122${i}0`;
      await request(server)
        .post('/api/onboarding/student')
        .send({ email, password: 'Passw0rd!123', name: `Reactivate ${i}`, phoneNumber: phone });
      const user = await getUserByEmail(email);
      await testPool.query(
        `INSERT INTO group_students (group_id, student_id, joined_at)
         VALUES ($1, $2, now() - interval '45 days')`,
        [inactiveGroupId, user.id],
      );
    }

    try {
      // Current activeStudentCount = 2. Reactivating this group adds 9 new active students -> 11 > 10
      const res = await teacherSession
        .patch(`/api/teacher/groups/${inactiveGroupId}`)
        .send({ isActive: true });

      expect(res.status).toBe(402);
      expect(res.body).toMatchObject({
        error: 'PLAN_LIMIT_REACHED',
        limitType: 'STUDENTS',
        currentUsage: 2,
        limit: 10,
      });
    } finally {
      await testPool.query(`DELETE FROM group_students WHERE group_id = $1`, [inactiveGroupId]);
      await testPool.query(`DELETE FROM groups WHERE id = $1`, [inactiveGroupId]);
    }
  });

  it('rejects lesson attachment upload when fileSizeBytes pushes teacher over maxStorageBytes', async () => {
    // Free limit is 1 GB (1073741824 bytes).
    // Attempting to request presigned upload for 1.1 GB (1181116006 bytes)
    // Note: max single file size is 100MB in schema, so let's set Free plan maxStorageBytes to 5000 bytes temporarily
    await testPool.query(`UPDATE plans SET max_storage_bytes = 5000 WHERE slug = 'free'`);

    try {
      const res = await teacherSession
        .post('/api/storage/presigned-upload')
        .send({
          courseId: world.courseId,
          lessonId: world.lesson1,
          fileName: 'large.pdf',
          fileSizeBytes: 6000,
        });

      expect(res.status).toBe(402);
      expect(res.body).toMatchObject({
        error: 'PLAN_LIMIT_REACHED',
        limitType: 'STORAGE',
        limit: 5000,
      });
    } finally {
      await testPool.query(`UPDATE plans SET max_storage_bytes = 1073741824 WHERE slug = 'free'`);
    }
  });

  it('rejects student join-by-code when teacher is at capacity and delivers inbox notification', async () => {
    // Create new group on world.courseId
    const { rows: grpRows } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active)
       VALUES ($1, 'Capacity Group', 'OMCAP01', true) RETURNING id`,
      [world.courseId],
    );
    const grpId = grpRows[0].id;

    // Temporarily set Free plan max_students to 2 (current active count is 2)
    await testPool.query(`UPDATE plans SET max_students = 2 WHERE slug = 'free'`);

    // Create student 4 who is NOT currently enrolled with this teacher
    await request(server)
      .post('/api/onboarding/student')
      .send({
        email: 's4@student.om',
        password: 'Passw0rd!123',
        name: 'New Student',
        phoneNumber: '+96894443322',
      });
    const s4Session = (await login(server, 's4@student.om', 'Passw0rd!123')).session;

    try {
      // Clear previous inbox notifications for teacher
      await testPool.query(`DELETE FROM inbox_notifications WHERE user_id = $1`, [world.teacher.id]);

      // Student attempts to join OMCAP01
      const res = await s4Session
        .post('/api/student/groups/join')
        .send({ joinCode: 'OMCAP01' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('This group has reached its maximum capacity — please contact your teacher');

      // Verify in-app inbox notification was delivered to teacher
      const { rows: notifs } = await testPool.query(
        `SELECT * FROM inbox_notifications WHERE user_id = $1`,
        [world.teacher.id],
      );
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].type).toBe('SYSTEM');
      expect(notifs[0].message).toContain('upgrade');
    } finally {
      await testPool.query(`UPDATE plans SET max_students = 10 WHERE slug = 'free'`);
      await testPool.query(`DELETE FROM groups WHERE id = $1`, [grpId]);
    }
  });

  it('tracks anti-griefer first-month discount eligibility in teacher_discounts', async () => {
    // Make pro and ultimate public for testing upgrade options
    await testPool.query(`UPDATE plans SET is_public = true WHERE slug IN ('pro', 'ultimate')`);

    try {
      // Check entitlements upgrade options: Pro and Ultimate must have first-month discount
      let res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);

      const pro = res.body.upgradeOptions.find((o: any) => o.slug === 'pro');
      const ult = res.body.upgradeOptions.find((o: any) => o.slug === 'ultimate');
      expect(pro).toBeDefined();
      expect(ult).toBeDefined();
      expect(pro.firstMonthDiscountEligible).toBe(true);
      expect(pro.firstMonthDiscountPrice).toBe(7); // Pro yearly monthly price is 7 OMR
      expect(pro.monthlyPrice).toBe(10);
      expect(ult.firstMonthDiscountEligible).toBe(true);
      expect(ult.firstMonthDiscountPrice).toBe(20); // Ultimate yearly monthly price is 20 OMR
      expect(ult.monthlyPrice).toBe(25);

      // Record occasion LIMIT_CROSS_PRO in teacher_discounts
      await testPool.query(
        `INSERT INTO teacher_discounts (teacher_id, occasion, plan_slug, description)
         VALUES ($1, 'LIMIT_CROSS_PRO', 'pro', 'Claimed first-month discount for Pro')`,
        [world.teacher.id],
      );

      // Verify Pro is no longer eligible for first-month discount, but Ultimate remains eligible
      res = await teacherSession.get('/api/teacher/entitlements');
      const proAfter = res.body.upgradeOptions.find((o: any) => o.slug === 'pro');
      const ultAfter = res.body.upgradeOptions.find((o: any) => o.slug === 'ultimate');

      expect(proAfter.firstMonthDiscountEligible).toBe(false);
      expect(proAfter.firstMonthDiscountPrice).toBeNull();
      expect(ultAfter.firstMonthDiscountEligible).toBe(true);
      expect(ultAfter.firstMonthDiscountPrice).toBe(20);

      // Clean up discount row
      await testPool.query(
        `DELETE FROM teacher_discounts WHERE teacher_id = $1 AND occasion = 'LIMIT_CROSS_PRO'`,
        [world.teacher.id],
      );
    } finally {
      await testPool.query(`UPDATE plans SET is_public = false WHERE slug IN ('pro', 'ultimate')`);
    }
  });

  it('returns customPlanPrompt when teacher is on highest tier and hits limit', async () => {
    // Give teacher active subscription on early-bird (tierRank = 30, highest tier)
    const { rows: subRows } = await testPool.query(
      `INSERT INTO teacher_subscriptions (
         teacher_id, plan_slug, tier_rank, plan_name_ar, plan_name_en, price_paid,
         currency, billing_cycle, max_students, max_storage_bytes, starts_at, ends_at, source
       ) VALUES (
         $1, 'early-bird', 30, 'الانطلاقة المبكرة', 'Early Bird', 5,
         'OMR', 'TRIAL', 500, 107374182400, now(), now() + interval '30 days', 'EARLY_BIRD_TRIAL'
       ) RETURNING id`,
      [world.teacher.id],
    );
    const subId = subRows[0].id;

    try {
      const res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.upgradeOptions).toEqual([]);
      expect(res.body.customPlanPrompt).toBe('Contact administration for a custom plan');
    } finally {
      await testPool.query(`DELETE FROM teacher_subscriptions WHERE id = $1`, [subId]);
    }
  });

  it('locks expired teacher whose usage exceeds Free limits into Upgrade Gate while student and parent access remains uninterrupted', async () => {
    // Insert expired subscription (ended yesterday)
    const { rows: subRows } = await testPool.query(
      `INSERT INTO teacher_subscriptions (
         teacher_id, plan_slug, tier_rank, plan_name_ar, plan_name_en, price_paid,
         currency, billing_cycle, max_students, max_storage_bytes, starts_at, ends_at, source
       ) VALUES (
         $1, 'pro', 10, 'المحترف', 'Pro', 10,
         'OMR', 'MONTHLY', 50, 10737418240, now() - interval '30 days', now() - interval '1 day', 'ADMIN_PAID'
       ) RETURNING id`,
      [world.teacher.id],
    );
    const subId = subRows[0].id;

    // Temporarily set Free plan max_students to 1 so teacher (with 2 students) is over limit
    await testPool.query(`UPDATE plans SET max_students = 1 WHERE slug = 'free'`);

    try {
      // 1. Verify entitlements reports isLockedOut = true
      let res = await teacherSession.get('/api/teacher/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.isLockedOut).toBe(true);

      // 2. Teacher workspace mutations are rejected with 402 UPGRADE_GATE_LOCKED
      const courseMutation = await teacherSession
        .post('/api/teacher/courses')
        .send({ title: 'Blocked Course', courseType: 'ACADEMIC' });
      expect(courseMutation.status).toBe(402);
      expect(courseMutation.body.error).toBe('UPGRADE_GATE_LOCKED');

      const groupMutation = await teacherSession
        .post(`/api/teacher/courses/${world.courseId}/groups`)
        .send({ name: 'Blocked Group' });
      expect(groupMutation.status).toBe(402);
      expect(groupMutation.body.error).toBe('UPGRADE_GATE_LOCKED');

      // 3. Exempt endpoints: profile update and entitlements remain accessible
      const profileUpdate = await teacherSession
        .patch('/api/me')
        .send({ name: 'Teacher Name Updated' });
      expect(profileUpdate.status).toBe(200);

      // 4. Student access is NEVER blocked by teacher's Upgrade Gate lockout!
      const studentHome = await studentSession.get('/api/student/home');
      expect(studentHome.status).toBe(200);

      const studentCurriculum = await studentSession.get(`/api/student/groups/${world.group1}/curriculum`);
      expect(studentCurriculum.status).toBe(200);

      // 5. Parent access is NEVER blocked by teacher's Upgrade Gate lockout!
      const parentChildren = await parentSession.get('/api/parent/students');
      expect(parentChildren.status).toBe(200);
    } finally {
      await testPool.query(`DELETE FROM teacher_subscriptions WHERE id = $1`, [subId]);
      await testPool.query(`UPDATE plans SET max_students = 10 WHERE slug = 'free'`);
    }
  });

  it('allows teacher mutations normally when expired subscription is within Free limits', async () => {
    // Insert expired subscription
    const { rows: subRows } = await testPool.query(
      `INSERT INTO teacher_subscriptions (
         teacher_id, plan_slug, tier_rank, plan_name_ar, plan_name_en, price_paid,
         currency, billing_cycle, max_students, max_storage_bytes, starts_at, ends_at, source
       ) VALUES (
         $1, 'pro', 10, 'المحترف', 'Pro', 10,
         'OMR', 'MONTHLY', 50, 10737418240, now() - interval '30 days', now() - interval '1 day', 'ADMIN_PAID'
       ) RETURNING id`,
      [world.teacher.id],
    );
    const subId = subRows[0].id;

    try {
      // Teacher has 2 students, Free plan has 10 -> isLockedOut = false
      const entRes = await teacherSession.get('/api/teacher/entitlements');
      expect(entRes.status).toBe(200);
      expect(entRes.body.isLockedOut).toBe(false);

      // Mutations should NOT be blocked
      const groupRes = await teacherSession
        .post(`/api/teacher/courses/${world.courseId}/groups`)
        .send({ name: 'Allowed Group Within Free Limit' });
      expect(groupRes.status).toBe(201);

      // Clean up created group
      await testPool.query(`DELETE FROM groups WHERE id = $1`, [groupRes.body.id]);
    } finally {
      await testPool.query(`DELETE FROM teacher_subscriptions WHERE id = $1`, [subId]);
    }
  });
});
