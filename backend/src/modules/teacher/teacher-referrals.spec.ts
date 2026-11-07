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
let teacherSession: Awaited<ReturnType<typeof login>>['session'];
let teacherId: string;
let planMap: Record<string, { id: string; tierRank: number; nameAr: string; nameEn: string }>;

beforeAll(async () => {
  const got = await getApp();
  server = got.server;
  await seedWorld();
  teacherSession = (await login(server, TEACHER.email, TEACHER.password)).session;
  const teacher = await getUserByEmail(TEACHER.email);
  teacherId = teacher.id;

  const { rows } = await testPool.query(`SELECT id, slug, tier_rank, name_ar, name_en FROM plans`);
  planMap = {};
  for (const r of rows) {
    planMap[r.slug] = {
      id: r.id,
      tierRank: r.tier_rank,
      nameAr: r.name_ar,
      nameEn: r.name_en,
    };
  }
});

afterAll(async () => {
  await closeApp();
  await testPool.end();
});

describe('Paid-Only Teacher Referral Codes & 4-Student Group Unlock (Ticket 05)', () => {
  let paidReferralCode: string;

  it('unpaid teacher has no referralCode in entitlements summary', async () => {
    // Ensure teacher currently has no paid subscription
    await testPool.query(`DELETE FROM teacher_subscriptions WHERE teacher_id = $1`, [teacherId]);
    await testPool.query(`UPDATE "user" SET referral_code = NULL WHERE id = $1`, [teacherId]);

    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body.referral).toBeDefined();
    expect(res.body.referral.referralCode).toBeNull();
    expect(res.body.referral.usedCount).toBe(0);
    expect(res.body.referral.maxReferrals).toBe(10);
    expect(res.body.referral.referrals).toEqual([]);
  });

  it('paid teacher automatically receives unique 8-char referral code (REF-XXXX)', async () => {
    // Give teacher an active ADMIN_PAID subscription
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source, gifts_applied_in_cycle
      ) VALUES (
        $1, $2, 'early-bird', 30, 'الطيور المبكرة', 'Early Bird',
        5, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID', 0
      )`,
      [teacherId, planMap['early-bird'].id],
    );

    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body.referral.referralCode).toBeDefined();
    expect(res.body.referral.referralCode).toMatch(/^REF-[A-Z0-9]{4}$/);
    paidReferralCode = res.body.referral.referralCode;
  });

  it('rejects self-referral redemption', async () => {
    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: paidReferralCode });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot redeem your own referral code/i);
  });

  it('allows referred teacher to redeem and grants immediate gift', async () => {
    // Create Teacher B (unpaid)
    const teacherBData = {
      name: 'Teacher Basim',
      email: 'basim@teacher.om',
      password: 'Passw0rd!123',
      phoneNumber: '+96898887771',
      subject: 'Math',
    };
    await request(server).post('/api/onboarding/teacher').send(teacherBData);
    const { session: teacherBSession } = await login(server, teacherBData.email, teacherBData.password);
    const teacherB = await getUserByEmail(teacherBData.email);

    // Teacher B redeems Teacher A's code
    const res = await teacherBSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: paidReferralCode });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('ACTIVATED');
    expect(res.body.durationDays).toBe(7);

    // Verify Teacher B is now ACTIVE on early-bird for 7 days
    const entB = await teacherBSession.get('/api/teacher/entitlements');
    expect(entB.status).toBe(200);
    expect(entB.body.activePlan.status).toBe('ACTIVE');
    expect(entB.body.activePlan.slug).toBe('early-bird');
    expect(entB.body.activePlan.source).toBe('REFERRAL');

    // Verify referral entry is recorded as PENDING_GROUP
    const { rows: refRows } = await testPool.query(
      `SELECT status, rewarded_at FROM teacher_referrals WHERE taker_teacher_id = $1`,
      [teacherB.id],
    );
    expect(refRows.length).toBe(1);
    expect(refRows[0].status).toBe('PENDING_GROUP');
    expect(refRows[0].rewarded_at).toBeNull();

    // Verify Teacher A's entitlements summary now shows 1 referral with PENDING_GROUP
    const entA = await teacherSession.get('/api/teacher/entitlements');
    expect(entA.body.referral.usedCount).toBe(1);
    expect(entA.body.referral.referrals.length).toBe(1);
    expect(entA.body.referral.referrals[0].takerName).toBe('Teacher Basim');
    expect(entA.body.referral.referrals[0].status).toBe('PENDING_GROUP');
  });

  it('rejects redeeming more than one referral code in a lifetime', async () => {
    // Create Teacher C (paid) to generate another referral code
    const teacherCData = {
      name: 'Teacher Camil',
      email: 'camil@teacher.om',
      password: 'Passw0rd!123',
      phoneNumber: '+96898887772',
      subject: 'Physics',
    };
    await request(server).post('/api/onboarding/teacher').send(teacherCData);
    const teacherC = await getUserByEmail(teacherCData.email);
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source
      ) VALUES (
        $1, $2, 'early-bird', 30, 'الطيور المبكرة', 'Early Bird',
        5, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID'
      )`,
      [teacherC.id, planMap['early-bird'].id],
    );
    const { session: teacherCSession } = await login(server, teacherCData.email, teacherCData.password);
    const entC = await teacherCSession.get('/api/teacher/entitlements');
    const teacherCCode = entC.body.referral.referralCode;

    // Teacher B (who already redeemed Teacher A's code) tries to redeem Teacher C's code
    const { session: teacherBSession } = await login(server, 'basim@teacher.om', 'Passw0rd!123');
    const res = await teacherBSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: teacherCCode });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only redeem one referral code in your lifetime/i);
  });

  it('prevents reciprocal referrals (A -> B and B -> A loop)', async () => {
    const teacherB = await getUserByEmail('basim@teacher.om');
    // Give Teacher B an ADMIN_PAID subscription so they also get a referral code
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source
      ) VALUES (
        $1, $2, 'early-bird', 30, 'الطيور المبكرة', 'Early Bird',
        5, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID'
      )`,
      [teacherB.id, planMap['early-bird'].id],
    );
    const { session: teacherBSession } = await login(server, 'basim@teacher.om', 'Passw0rd!123');
    const entB = await teacherBSession.get('/api/teacher/entitlements');
    const teacherBCode = entB.body.referral.referralCode;

    // Teacher A (who already referred B) tries to redeem Teacher B's referral code
    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: teacherBCode });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reciprocal referrals are not allowed/i);
  });

  it('enforces maximum 10 referrals per giver cap', async () => {
    // Fast-forward Teacher A's referrals count to 10
    // Teacher B is already 1 referral. Add 9 more dummy referrals.
    for (let i = 1; i <= 9; i++) {
      const dummyId = `dummy-taker-${i}-${Date.now()}`;
      await testPool.query(
        `INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)`,
        [dummyId, `Dummy ${i}`, `dummy${i}-${Date.now()}@test.om`],
      );
      await testPool.query(
        `INSERT INTO teacher_referrals (giver_teacher_id, taker_teacher_id, referral_code, status)
         VALUES ($1, $2, $3, 'REWARDED')`,
        [teacherId, dummyId, paidReferralCode],
      );
    }

    // Now Teacher A has 10 referrals total
    const entA = await teacherSession.get('/api/teacher/entitlements');
    expect(entA.body.referral.usedCount).toBe(10);

    // Create Teacher D (unpaid) to try to redeem Teacher A's code
    const teacherDData = {
      name: 'Teacher Dawood',
      email: `dawood-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'History',
    };
    await request(server).post('/api/onboarding/teacher').send(teacherDData);
    const { session: teacherDSession } = await login(server, teacherDData.email, teacherDData.password);

    const res = await teacherDSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: paidReferralCode });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum limit of 10 referrals/i);
  });

  it('enforces anti-stacking: unpaid taker cannot redeem promo after referral code', async () => {
    // Create an active promo code
    const promoCode = `PROMO-ANTI-${Date.now()}`;
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days, is_active)
       VALUES ($1, $2, 14, true)`,
      [promoCode, planMap['pro'].id],
    );

    // Create Teacher G (unpaid)
    const teacherGData = {
      name: 'Teacher Ghalib',
      email: `ghalib-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'Art',
    };
    await request(server).post('/api/onboarding/teacher').send(teacherGData);
    const { session: teacherGSession } = await login(server, teacherGData.email, teacherGData.password);

    // First: Teacher G redeems Teacher C's referral code
    const teacherC = await getUserByEmail('camil@teacher.om');
    const { rows: cRows } = await testPool.query(
      `SELECT referral_code FROM "user" WHERE id = $1`,
      [teacherC.id],
    );
    const teacherCCode = cRows[0].referral_code;

    const res1 = await teacherGSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: teacherCCode });
    expect(res1.status).toBe(201);

    // Second: Teacher G tries to redeem the promo code while still unpaid
    const res2 = await teacherGSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: promoCode });

    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/limited to redeeming 1 promo or referral code total/i);
  });

  it('4-student group threshold unlocks giver reward automatically', async () => {
    // Setup clean Giver and clean Taker:
    // 1. Giver: teacher H (paid)
    const giverData = {
      name: 'Giver Hisham',
      email: `hisham-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'Chemistry',
    };
    await request(server).post('/api/onboarding/teacher').send(giverData);
    const giver = await getUserByEmail(giverData.email);
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source
      ) VALUES (
        $1, $2, 'early-bird', 30, 'الطيور المبكرة', 'Early Bird',
        5, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID'
      )`,
      [giver.id, planMap['early-bird'].id],
    );
    const { session: giverSession } = await login(server, giverData.email, giverData.password);
    const giverEnt = await giverSession.get('/api/teacher/entitlements');
    const giverCode = giverEnt.body.referral.referralCode;

    // 2. Taker: teacher I (unpaid)
    const takerData = {
      name: 'Taker Ibtisam',
      email: `ibtisam-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'Biology',
    };
    await request(server).post('/api/onboarding/teacher').send(takerData);
    const taker = await getUserByEmail(takerData.email);
    const { session: takerSession } = await login(server, takerData.email, takerData.password);

    // Taker redeems Giver's referral code
    const redeemRes = await takerSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: giverCode });
    expect(redeemRes.status).toBe(201);

    // Verify referral is PENDING_GROUP
    const { rows: initialRef } = await testPool.query(
      `SELECT id, status, rewarded_at FROM teacher_referrals WHERE taker_teacher_id = $1`,
      [taker.id],
    );
    expect(initialRef[0].status).toBe('PENDING_GROUP');
    expect(initialRef[0].rewarded_at).toBeNull();

    // Taker creates a course and group
    const { rows: courseRows } = await testPool.query(
      `INSERT INTO courses (title, teacher_id) VALUES ('Biology 101', $1) RETURNING id`,
      [taker.id],
    );
    const courseId = courseRows[0].id;

    const { rows: groupRows } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active)
       VALUES ($1, 'Group Bio A', 'BIO001', true) RETURNING id`,
      [courseId],
    );
    const groupId = groupRows[0].id;

    // Enroll 3 students (below threshold of 4)
    for (let s = 1; s <= 3; s++) {
      const studentId = `bio-student-${s}-${Date.now()}`;
      await testPool.query(
        `INSERT INTO "user" (id, name, email, role) VALUES ($1, $2, $3, 'STUDENT')`,
        [studentId, `Bio Student ${s}`, `biostudent${s}-${Date.now()}@test.om`],
      );
      await testPool.query(
        `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
        [groupId, studentId],
      );
    }

    // Call check on taker
    const { checkAndUnlockReferralReward } = await import('./teacher-entitlements.service');
    await checkAndUnlockReferralReward(taker.id);

    // Should STILL be PENDING_GROUP with only 3 students
    const { rows: midRef } = await testPool.query(
      `SELECT status, rewarded_at FROM teacher_referrals WHERE taker_teacher_id = $1`,
      [taker.id],
    );
    expect(midRef[0].status).toBe('PENDING_GROUP');

    // Now enroll 4th student (reaching threshold >= 4)
    const student4Id = `bio-student-4-${Date.now()}`;
    await testPool.query(
      `INSERT INTO "user" (id, name, email, role) VALUES ($1, $2, $3, 'STUDENT')`,
      [student4Id, 'Bio Student 4', `biostudent4-${Date.now()}@test.om`],
    );
    await testPool.query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
      [groupId, student4Id],
    );

    // Call check on taker
    await checkAndUnlockReferralReward(taker.id);

    // Verify referral is now REWARDED!
    const { rows: finalRef } = await testPool.query(
      `SELECT status, rewarded_at FROM teacher_referrals WHERE taker_teacher_id = $1`,
      [taker.id],
    );
    expect(finalRef[0].status).toBe('REWARDED');
    expect(finalRef[0].rewarded_at).not.toBeNull();

    // Verify giver received referral discount entry
    const { rows: discountRows } = await testPool.query(
      `SELECT occasion, plan_slug FROM teacher_discounts WHERE teacher_id = $1 AND occasion = 'REFERRAL_GIVER'`,
      [giver.id],
    );
    expect(discountRows.length).toBe(1);
    expect(discountRows[0].occasion).toBe('REFERRAL_GIVER');
  });

  it('marks referral as DROPPED_FULL_INVENTORY when giver already has 3 saved gifts', async () => {
    // 1. Giver on pro tier with 3 saved gifts
    const giverData = {
      name: 'Giver Jamal',
      email: `jamal-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'Geography',
    };
    await request(server).post('/api/onboarding/teacher').send(giverData);
    const giver = await getUserByEmail(giverData.email);
    // Active on Pro plan
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source
      ) VALUES (
        $1, $2, 'pro', 10, 'المحترف', 'Pro',
        10, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID'
      )`,
      [giver.id, planMap['pro'].id],
    );
    const { session: giverSession } = await login(server, giverData.email, giverData.password);
    const giverEnt = await giverSession.get('/api/teacher/entitlements');
    const giverCode = giverEnt.body.referral.referralCode;

    // Fill Giver's saved gifts inventory with 3 gifts
    for (let g = 1; g <= 3; g++) {
      await testPool.query(
        `INSERT INTO teacher_gifts (
          teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
          duration_days, source
        ) VALUES (
          $1, $2, 'early-bird', 30, 'الطيور المبكرة', 'Early Bird',
          7, 'PROMO'
        )`,
        [giver.id, planMap['early-bird'].id],
      );
    }

    // 2. Taker: teacher K (unpaid)
    const takerData = {
      name: 'Taker Khalid',
      email: `khalid-${Date.now()}@teacher.om`,
      password: 'Passw0rd!123',
      phoneNumber: `+9689888${Math.floor(1000 + Math.random() * 9000)}`,
      subject: 'Arabic',
    };
    await request(server).post('/api/onboarding/teacher').send(takerData);
    const taker = await getUserByEmail(takerData.email);
    const { session: takerSession } = await login(server, takerData.email, takerData.password);

    // Taker redeems Giver's referral code
    await takerSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: giverCode });

    // Taker creates group and enrolls 4 students
    const { rows: cRows } = await testPool.query(
      `INSERT INTO courses (title, teacher_id) VALUES ('Arabic 10', $1) RETURNING id`,
      [taker.id],
    );
    const { rows: gRows } = await testPool.query(
      `INSERT INTO groups (course_id, name, join_code, is_active)
       VALUES ($1, 'Group Arab', 'ARA001', true) RETURNING id`,
      [cRows[0].id],
    );

    for (let s = 1; s <= 4; s++) {
      const studentId = `arab-student-${s}-${Date.now()}`;
      await testPool.query(
        `INSERT INTO "user" (id, name, email, role) VALUES ($1, $2, $3, 'STUDENT')`,
        [studentId, `Arab Student ${s}`, `arabstudent${s}-${Date.now()}@test.om`],
      );
      await testPool.query(
        `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)`,
        [gRows[0].id, studentId],
      );
    }

    // Unlock hook
    const { checkAndUnlockReferralReward } = await import('./teacher-entitlements.service');
    await checkAndUnlockReferralReward(taker.id);

    // Verify referral status is DROPPED_FULL_INVENTORY
    const { rows: refRows } = await testPool.query(
      `SELECT status, rewarded_at FROM teacher_referrals WHERE taker_teacher_id = $1`,
      [taker.id],
    );
    expect(refRows[0].status).toBe('DROPPED_FULL_INVENTORY');
    expect(refRows[0].rewarded_at).not.toBeNull();
  });
});
