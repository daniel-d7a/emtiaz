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

describe('Promo Codes, Saved Gifts & Anti-Stacking Rules (Ticket 04)', () => {
  it('entitlements endpoint includes empty savedGifts initially', async () => {
    const res = await teacherSession.get('/api/teacher/entitlements');
    expect(res.status).toBe(200);
    expect(res.body.savedGifts).toEqual([]);
    expect(res.body.activePlan.status).toBe('FREE');
  });

  it('rejects invalid, inactive, expired, and exhausted promo codes', async () => {
    // 1. Non-existent code
    const res1 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'NONEXISTENT' });
    expect(res1.status).toBe(400);

    // 2. Inactive code
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days, is_active)
       VALUES ('INACTIVE_CODE', $1, 30, false)`,
      [planMap['pro'].id],
    );
    const res2 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'INACTIVE_CODE' });
    expect(res2.status).toBe(400);

    // 3. Expired code
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days, expires_at)
       VALUES ('EXPIRED_CODE', $1, 30, now() - interval '1 day')`,
      [planMap['pro'].id],
    );
    const res3 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'EXPIRED_CODE' });
    expect(res3.status).toBe(400);
    expect(res3.body.message).toContain('expired');

    // 4. Exhausted code (used_count >= max_uses)
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days, max_uses, used_count)
       VALUES ('EXHAUSTED_CODE', $1, 30, 2, 2)`,
      [planMap['pro'].id],
    );
    const res4 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'EXHAUSTED_CODE' });
    expect(res4.status).toBe(400);
    expect(res4.body.message).toContain('maximum uses');
  });

  it('activates immediately when teacher is on Free / expired plan', async () => {
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days, max_uses)
       VALUES ('FREE_TO_PRO', $1, 14, 10)`,
      [planMap['pro'].id],
    );

    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'free_to_pro' }); // tests uppercase normalization

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      action: 'ACTIVATED',
      durationDays: 14,
    });

    // Check entitlements
    const entRes = await teacherSession.get('/api/teacher/entitlements');
    expect(entRes.status).toBe(200);
    expect(entRes.body.activePlan.slug).toBe('pro');
    expect(entRes.body.activePlan.status).toBe('ACTIVE');
    expect(entRes.body.activePlan.endsAt).not.toBeNull();

    // Check promo code used_count incremented
    const { rows: promoRows } = await testPool.query(
      `SELECT used_count FROM promo_codes WHERE code = 'FREE_TO_PRO'`,
    );
    expect(promoRows[0].used_count).toBe(1);

    // Check teacher_discounts record
    const { rows: discountRows } = await testPool.query(
      `SELECT occasion, plan_slug FROM teacher_discounts WHERE teacher_id = $1`,
      [teacherId],
    );
    expect(discountRows.length).toBe(1);
    expect(discountRows[0].occasion).toBe('PROMO_CODE');
    expect(discountRows[0].plan_slug).toBe('pro');
  });

  it('rejects redeeming the exact same promo code twice', async () => {
    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'FREE_TO_PRO' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already redeemed');
  });

  it('enforces anti-stacking: unpaid teacher capped at 1 code total', async () => {
    // Teacher has only the GIFT subscription from FREE_TO_PRO (no ADMIN_PAID subscription in history)
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days)
       VALUES ('ANOTHER_FREE_CODE', $1, 7)`,
      [planMap['ultimate'].id],
    );

    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'ANOTHER_FREE_CODE' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Unpaid accounts are limited to redeeming 1 promo or referral code total');
  });

  it('stores gift in 3-slot inventory when a paid teacher redeems a code for a different plan', async () => {
    // 1. Give teacher an active ADMIN_PAID subscription on 'early-bird'
    await testPool.query(
      `INSERT INTO teacher_subscriptions (
        teacher_id, plan_id, plan_slug, tier_rank, plan_name_ar, plan_name_en,
        price_paid, currency, billing_cycle, starts_at, ends_at, source, gifts_applied_in_cycle
      ) VALUES (
        $1, $2, 'early-bird', 30, 'الانطلاقة المبكرة', 'Early Bird',
        5, 'OMR', 'MONTHLY', now(), now() + interval '30 days', 'ADMIN_PAID', 0
      )`,
      [teacherId, planMap['early-bird'].id],
    );

    // 2. Teacher redeems promo code for 'pro' (different plan tier)
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days)
       VALUES ('PAID_PRO_7', $1, 7)`,
      [planMap['pro'].id],
    );

    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'PAID_PRO_7' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      action: 'SAVED',
      durationDays: 7,
    });

    const entRes = await teacherSession.get('/api/teacher/entitlements');
    expect(entRes.body.savedGifts.length).toBe(1);
    expect(entRes.body.savedGifts[0].planSlug).toBe('pro');
    expect(entRes.body.savedGifts[0].durationDays).toBe(7);
  });

  it('caps saved gifts inventory at 3 and rejects 4th redemption', async () => {
    // Add 2 more saved gifts so total is 3
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days) VALUES
       ('SLOT_2', $1, 5),
       ('SLOT_3', $2, 10)`,
      [planMap['pro'].id, planMap['ultimate'].id],
    );

    const res2 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'SLOT_2' });
    expect(res2.status).toBe(201);
    expect(res2.body.action).toBe('SAVED');

    const res3 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'SLOT_3' });
    expect(res3.status).toBe(201);
    expect(res3.body.action).toBe('SAVED');

    const entRes = await teacherSession.get('/api/teacher/entitlements');
    expect(entRes.body.savedGifts.length).toBe(3);

    // Attempt to redeem a 4th gift for a different plan
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days) VALUES ('SLOT_4', $1, 15)`,
      [planMap['pro'].id],
    );

    const res4 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'SLOT_4' });
    expect(res4.status).toBe(400);
    expect(res4.body.message).toContain('Maximum of 3 saved gifts reached');
  });

  it('deletes saved gift to free up a slot', async () => {
    const entRes = await teacherSession.get('/api/teacher/entitlements');
    const giftToDelete = entRes.body.savedGifts[0];

    const delRes = await teacherSession.delete(`/api/teacher/entitlements/gifts/${giftToDelete.id}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const entAfter = await teacherSession.get('/api/teacher/entitlements');
    expect(entAfter.body.savedGifts.length).toBe(2);

    // Now slot 4 can be redeemed into the freed slot
    const res4 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'SLOT_4' });
    expect(res4.status).toBe(201);
    expect(res4.body.action).toBe('SAVED');
  });

  it('rejects activating a lower-tier saved gift while on a higher active plan', async () => {
    // Current active plan is early-bird (tierRank = 30).
    // Find a saved gift with lower tier (pro has tierRank = 10, ultimate has tierRank = 20)
    const entRes = await teacherSession.get('/api/teacher/entitlements');
    const proGift = entRes.body.savedGifts.find((g: any) => g.planSlug === 'pro');
    expect(proGift).toBeDefined();

    const res = await teacherSession.post(`/api/teacher/entitlements/gifts/${proGift.id}/activate`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('You are already on a higher plan');

    // Gift must still be in inventory
    const entAfter = await teacherSession.get('/api/teacher/entitlements');
    expect(entAfter.body.savedGifts.some((g: any) => g.id === proGift.id)).toBe(true);
  });

  it('extends endsAt on same-plan promo code and enforces 1 gift per paid cycle', async () => {
    // Current active plan is early-bird
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days)
       VALUES ('EXTEND_EARLY_BIRD', $1, 7)`,
      [planMap['early-bird'].id],
    );

    const entBefore = await teacherSession.get('/api/teacher/entitlements');
    const beforeEndsAt = new Date(entBefore.body.activePlan.endsAt).getTime();

    // First redemption for same plan -> EXTENDED
    const res = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'EXTEND_EARLY_BIRD' });

    expect(res.status).toBe(201);
    expect(res.body.action).toBe('EXTENDED');

    const entAfter = await teacherSession.get('/api/teacher/entitlements');
    const afterEndsAt = new Date(entAfter.body.activePlan.endsAt).getTime();
    expect(afterEndsAt).toBeGreaterThan(beforeEndsAt + 6 * 24 * 60 * 60 * 1000);

    // Second redemption in same paid cycle -> rejected (1-gift-per-cycle limit)
    await testPool.query(
      `INSERT INTO promo_codes (code, plan_id, duration_days)
       VALUES ('SECOND_EXTEND', $1, 7)`,
      [planMap['early-bird'].id],
    );

    const res2 = await teacherSession
      .post('/api/teacher/entitlements/redeem-code')
      .send({ code: 'SECOND_EXTEND' });

    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('You can only apply 1 gift per paid billing cycle');
  });
});
