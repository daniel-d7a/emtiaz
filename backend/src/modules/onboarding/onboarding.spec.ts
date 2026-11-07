import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { createApp } from '../../main';
import request from 'supertest';
import { Pool } from 'pg';
import { resetTestDb } from '../../db/migrate';
import { StorageService } from '../storage/storage.service';
import { countryCurrency } from '../../lib/phone';

jest.setTimeout(90000);

let app: INestApplication;
let server: any;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

beforeAll(async () => {
  const migrator = await resetTestDb();
  await migrator.end();
  app = await createApp();
  server = app.getHttpAdapter().getInstance();
});

afterAll(async () => {
  await app?.close();
  await pool.end();
});

describe('Phase 2: auth & onboarding', () => {
  it('health endpoint is public', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'up' });
  });

  it('serves the OpenAPI contract outside production', async () => {
    const res = await request(server).get('/api/docs-json');
    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Emtiaz LMS API');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(10);
    const ui = await request(server).get('/api/docs');
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');
  });

  it('blocks protected endpoints without session', async () => {
    const res = await request(server).post('/api/onboarding/join/OM999999');
    expect(res.status).toBe(403);
  });

  it('registers a teacher with role TEACHER via self onboarding', async () => {
    const res = await request(server)
      .post('/api/onboarding/teacher')
      .send({
        name: 'Salim Al Balushi',
        email: 'salim@teacher.om',
        password: 'Passw0rd!123',
        phoneNumber: '+96891110001',
        subject: 'Math',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('TEACHER');
    const { rows } = await pool.query(
      "SELECT u.subject_category_id, c.name FROM \"user\" u JOIN categories c ON c.id=u.subject_category_id WHERE u.email='salim@teacher.om'",
    );
    expect(rows[0]).toMatchObject({ name: 'Math', subject_category_id: expect.any(String) });
  });
  it('teacher signup without a subject is rejected (400)', async () => {
    const res = await request(server)
      .post('/api/onboarding/teacher')
      .send({ name: 'No Subject', email: 'nosubject@teacher.om', password: 'Passw0rd!123' });
    expect(res.status).toBe(400);
  });

  it('registers a student via onboarding with default role STUDENT', async () => {
    const res = await request(server)
      .post('/api/onboarding/student')
      .send({
        name: 'Aisha',
        email: 'aisha@student.om',
        password: 'Passw0rd!123',
        phoneNumber: '+96892220002',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('PATCH /api/me updates teacher name and phone, disallows empty phone', async () => {
    const s = request.agent(server);
    await s.post('/api/auth/sign-in/email').send({ email: 'salim@teacher.om', password: 'Passw0rd!123' });
    const res = await s
      .patch('/api/me')
      .send({ name: 'Salim B', phoneNumber: '+96891119999', subject: 'Physics' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Salim B', phoneNumber: '+96891119999' });
    expect(res.body.subjectCategoryId).toBeDefined(); // subject normalized to the taxonomy FK
    expect(res.body).not.toHaveProperty('adminRoleId');
    expect(res.body).not.toHaveProperty('deletedAt');
    expect(res.body).not.toHaveProperty('landingBanner');
    const me = await s.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.user).not.toHaveProperty('adminRoleId');
    expect(me.body.user).not.toHaveProperty('deletedAt');
    expect(me.body.user).not.toHaveProperty('image');
    expect(me.body.user).not.toHaveProperty('landingBanner');
    const res2 = await s.patch('/api/me').send({ phoneNumber: '' });
    expect(res2.status).toBe(400);
    const res3 = await s.patch('/api/me').send({});
    expect(res3.status).toBe(200);
    expect(res3.body.name).toBe('Salim B'); // no-op still returns profile
  });

  it('updates synthetic email when phone number changes on a phone-only account', async () => {
    const signup = await request(server)
      .post('/api/onboarding/student')
      .send({
        name: 'Phone User',
        phoneNumber: '+96893330001',
        password: 'Passw0rd!123',
      });
    expect(signup.status).toBe(201);
    const agent = request.agent(server);
    await agent.post('/api/auth/sign-in/phone-number').send({
      phoneNumber: '+96893330001',
      password: 'Passw0rd!123',
    });
    const updateRes = await agent.patch('/api/me').send({
      phoneNumber: '+96893330002',
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.phoneNumber).toBe('+96893330002');
    expect(updateRes.body.email).toBe('96893330002@phone.emtiaz.om');

    // Fresh sign-in with the new phone number succeeds
    const relogin = request.agent(server);
    const loginRes = await relogin.post('/api/auth/sign-in/phone-number').send({
      phoneNumber: '+96893330002',
      password: 'Passw0rd!123',
    });
    expect(loginRes.status).toBe(200);
  });

  it('rejects a landing slug already used by another teacher', async () => {
    await request(server).post('/api/onboarding/teacher').send({
      name: 'Other Teacher',
      email: 'other-slug@teacher.om',
      password: 'Passw0rd!123',
      phoneNumber: '+96891110077',
      subject: 'Math',
    });
    const owner = request.agent(server);
    await owner.post('/api/auth/sign-in/email').send({ email: 'salim@teacher.om', password: 'Passw0rd!123' });
    expect((await owner.patch('/api/me').send({ landingSlug: 'shared-link' })).status).toBe(200);

    const other = request.agent(server);
    await other.post('/api/auth/sign-in/email').send({ email: 'other-slug@teacher.om', password: 'Passw0rd!123' });
    const res = await other.patch('/api/me').send({ landingSlug: 'shared-link' });
    expect(res.status).toBe(409);
    const me = await other.get('/api/me');
    expect(me.body.user.landingSlug).toBeNull();
    expect((await other.patch('/api/me').send({ landingSlug: 'other-link' })).status).toBe(200);
  });

  it('avatar: presigns images, rejects non-images/foreign keys, serves a signed redirect', async () => {
    const { rows } = await pool.query(
      `SELECT id FROM "user" WHERE email='salim@teacher.om'`,
    );
    const userId = rows[0].id;
    const s = request.agent(server);
    await s.post('/api/auth/sign-in/email').send({ email: 'salim@teacher.om', password: 'Passw0rd!123' });

    const nonImage = await s
      .post('/api/storage/avatar')
      .send({ fileName: 'cv.pdf', mimeType: 'application/pdf', fileSizeBytes: 100 });
    expect(nonImage.status).toBe(400);
    const saved = { ...process.env };
    process.env.R2_ENDPOINT = 'http://127.0.0.1:9';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    try {
      const up = await s
        .post('/api/storage/avatar')
        .send({ fileName: 'me.png', mimeType: 'image/png', fileSizeBytes: 100 });
      expect(up.status).toBe(201);
      expect(up.body.objectKey).toMatch(new RegExp(`^avatars/${userId}/`));
      expect(up.body.uploadUrl).toContain(up.body.objectKey);

      const foreign = await s
        .patch('/api/me')
        .send({ image: 'avatars/someone-else/pic.png' });
      expect(foreign.status).toBe(400);

      const own = await s.patch('/api/me').send({ image: up.body.objectKey });
      expect(own.status).toBe(200);
      expect(own.body).not.toHaveProperty('image');
      const savedRow = await pool.query('SELECT image FROM "user" WHERE id=$1', [userId]);
      expect(savedRow.rows[0].image).toBe(up.body.objectKey);

      const av = await s.get('/api/me/avatar');
      expect(av.status).toBe(302);
      expect(av.headers.location).toContain(up.body.objectKey);

      const storage = app.get(StorageService);
      const del = jest.spyOn(storage, 'deleteObject').mockResolvedValue();
      const cleared = await s.patch('/api/me').send({ image: null });
      expect(cleared.body).not.toHaveProperty('image');
      expect(del).toHaveBeenCalledWith(up.body.objectKey);
      del.mockRestore();
      const none = await s.get('/api/me/avatar');
      expect(none.status).toBe(404);
    } finally {
      process.env.R2_ENDPOINT = saved.R2_ENDPOINT;
      process.env.R2_ACCESS_KEY_ID = saved.R2_ACCESS_KEY_ID;
      process.env.R2_SECRET_ACCESS_KEY = saved.R2_SECRET_ACCESS_KEY;
      process.env.R2_BUCKET_NAME = saved.R2_BUCKET_NAME;
      if (saved.R2_ENDPOINT === undefined) delete process.env.R2_ENDPOINT;
      if (saved.R2_ACCESS_KEY_ID === undefined) delete process.env.R2_ACCESS_KEY_ID;
      if (saved.R2_SECRET_ACCESS_KEY === undefined) delete process.env.R2_SECRET_ACCESS_KEY;
      if (saved.R2_BUCKET_NAME === undefined) delete process.env.R2_BUCKET_NAME;
    }
  });

  it('blocks /api/me for anonymous users', async () => {
    const res = await request(server).patch('/api/me').send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  it('signs in via better-auth and cookie reaches guarded endpoints', async () => {
    const s = request.agent(server);
    const login = await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });
    expect(login.status).toBe(200);
    const join = await s.post('/api/onboarding/join/OM404404');
    expect(join.status).toBe(404); // authenticated but bad code
  });

  it('joins an existing group via join code and is idempotent', async () => {
    const { rows: courseRows } = await pool.query(
      `INSERT INTO courses (title, teacher_id) SELECT 'Physics', id FROM "user" WHERE email='salim@teacher.om' RETURNING id`,
    );
    const courseId = courseRows[0].id;
    await pool.query(
      `INSERT INTO groups (course_id, name, join_code, requires_entry_code) VALUES ('${courseId}', 'Batch A', 'OM123456', false)`,
    );

    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });

    const first = await s.post('/api/onboarding/join/OM123456');
    expect(first.status).toBe(201);
    expect(first.body.group.joinCode).toBe('OM123456');
    expect(first.body.course.title).toBe('Physics');

    await s.post('/api/onboarding/join/OM123456');
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM group_students
       WHERE student_id = (SELECT id FROM "user" WHERE email='aisha@student.om')`,
    );
    expect(rows[0].c).toBe(1);
  });

  it('requires an entry code for protected onboarding joins', async () => {
    const { rows: courseRows } = await pool.query(
      `INSERT INTO courses (title, teacher_id) SELECT 'Protected', id FROM "user" WHERE email='salim@teacher.om' RETURNING id`,
    );
    const group = (
      await pool.query(
        `INSERT INTO groups (course_id, name, join_code, requires_entry_code)
         VALUES ($1, 'Protected batch', 'OM555555', true) RETURNING id`,
        [courseRows[0].id],
      )
    ).rows[0].id;
    await pool.query(
      `INSERT INTO group_entry_codes (group_id, code, max_uses) VALUES ($1, 'ENTRY123', 1)`,
      [group],
    );

    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });

    const missing = await s.post('/api/onboarding/join/OM555555');
    expect(missing.status).toBe(400);

    const joined = await s
      .post('/api/onboarding/join/OM555555')
      .send({ entryCode: 'ENTRY123' });
    expect(joined.status).toBe(201);
    expect(joined.body.group.id).toBe(group);
  });

  it('mock-whatsapp messages are logged for new enrollments only', async () => {
    const { rows: courseRows } = await pool.query(
      `INSERT INTO courses (title, teacher_id) SELECT 'Chem', id FROM "user" WHERE email='salim@teacher.om' RETURNING id`,
    );
    await pool.query(
      `INSERT INTO groups (course_id, name, join_code, requires_entry_code) VALUES ('${courseRows[0].id}', 'Batch B', 'OM777777', false)`,
    );
    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });

    await s.post('/api/onboarding/join/OM777777');
    await s.post('/api/onboarding/join/OM777777'); // re-join: no second message
    const { rows } = await pool.query(
      `SELECT recipient, message FROM notifications
       WHERE message LIKE '%Batch B%'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].message).toContain('Batch B');
    expect(rows[0].recipient).toBe(
      (
        await pool.query(
          `SELECT phone_number FROM "user" WHERE email='aisha@student.om'`,
        )
      ).rows[0].phone_number,
    );
  });

  it('suspended users are rejected by the guard', async () => {
    await pool.query(
      `UPDATE "user" SET is_active=false WHERE email='aisha@student.om'`,
    );
    const s = request.agent(server);
    await s
      .post('/api/auth/sign-in/email')
      .send({ email: 'aisha@student.om', password: 'Passw0rd!123' });
    // suspended users are rejected everywhere, even public routes (lockout)
    const res = await s.get('/api/health');
    expect(res.status).toBe(403);
    const join = await s.post('/api/onboarding/join/OM123456');
    expect([403, 500]).toContain(join.status);
    await pool.query(
      `UPDATE "user" SET is_active=true WHERE email='aisha@student.om'`,
    );
  });

  describe('Country and phone validation for Oman and Egypt', () => {
    it('resolves correct currency from country', () => {
      expect(countryCurrency('OM')).toBe('OMR');
      expect(countryCurrency('EG')).toBe('EGP');
    });

    it('registers an Omani teacher with valid +968 phone and sets country OM', async () => {
      const res = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'Oman Teacher',
          email: 'oman-teacher@teacher.om',
          password: 'Passw0rd!123',
          country: 'OM',
          phoneNumber: '94001122',
          subject: 'Science',
        });
      expect(res.status).toBe(201);
      expect(res.body.user.country).toBe('OM');
      expect(res.body.user.phoneNumber).toBe('+96894001122');
    });

    it('rejects an Omani teacher signup with invalid phone for Oman', async () => {
      const res = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'Invalid Oman Teacher',
          email: 'invalid-oman@teacher.om',
          password: 'Passw0rd!123',
          country: 'OM',
          phoneNumber: '+201012345678', // Egypt phone with OM country
          subject: 'Science',
        });
      expect(res.status).toBe(400);
    });

    it('registers an Egyptian teacher with valid +20 phone and sets country EG', async () => {
      const res = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'Egypt Teacher',
          email: 'egypt-teacher@teacher.eg',
          password: 'Passw0rd!123',
          country: 'EG',
          phoneNumber: '01012345678',
          subject: 'Arabic',
        });
      expect(res.status).toBe(201);
      expect(res.body.user.country).toBe('EG');
      expect(res.body.user.phoneNumber).toBe('+201012345678');
    });

    it('rejects an Egyptian teacher signup with invalid phone for Egypt', async () => {
      const res = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'Invalid Egypt Teacher',
          email: 'invalid-egypt@teacher.eg',
          password: 'Passw0rd!123',
          country: 'EG',
          phoneNumber: '+96894001122', // Oman phone with EG country
          subject: 'Arabic',
        });
      expect(res.status).toBe(400);
    });

    it('updates user country and phone via PATCH /api/me', async () => {
      const s = request.agent(server);
      await s
        .post('/api/auth/sign-in/email')
        .send({ email: 'oman-teacher@teacher.om', password: 'Passw0rd!123' });

      // Updating country to EG with valid EG phone succeeds
      const update = await s
        .patch('/api/me')
        .send({ country: 'EG', phoneNumber: '01123456789' });
      expect(update.status).toBe(200);
      expect(update.body.country).toBe('EG');
      expect(update.body.phoneNumber).toBe('+201123456789');

      // Attempting to change country back to OM without matching phone fails
      const invalidSwitch = await s.patch('/api/me').send({ country: 'OM' });
      expect(invalidSwitch.status).toBe(400);
    });

    it('returns country-scoped grades (12 OM, 12 EG) and 30+ bilingual general categories', async () => {
      const omGrades = await request(server).get('/api/onboarding/grades?country=OM');
      expect(omGrades.status).toBe(200);
      expect(omGrades.body.length).toBeGreaterThanOrEqual(12);
      expect(omGrades.body.every((g: any) => g.country === 'OM')).toBe(true);
      expect(omGrades.body.some((g: any) => g.nameAr === 'الصف الأول' && g.nameEn === 'Grade 1')).toBe(true);
      expect(omGrades.body.some((g: any) => g.nameAr === 'الصف الثاني عشر' && g.nameEn === 'Grade 12')).toBe(true);

      const egGrades = await request(server).get('/api/onboarding/grades?country=EG');
      expect(egGrades.status).toBe(200);
      expect(egGrades.body.length).toBeGreaterThanOrEqual(12);
      expect(egGrades.body.every((g: any) => g.country === 'EG')).toBe(true);
      expect(
        egGrades.body.some(
          (g: any) => g.nameAr === 'الصف الأول الابتدائي' && g.nameEn === '1st Grade Primary Education',
        ),
      ).toBe(true);
      expect(
        egGrades.body.some(
          (g: any) => g.nameAr === 'الصف الثالث الثانوي' && g.nameEn === '3rd Grade Secondary Education',
        ),
      ).toBe(true);

      const cats = await request(server).get('/api/onboarding/categories');
      expect(cats.status).toBe(200);
      expect(cats.body.length).toBeGreaterThanOrEqual(30);
      expect(
        cats.body.some(
          (c: any) =>
            c.nameAr === 'البرمجة وعلوم الحاسب' &&
            c.nameEn === 'Programming & Computer Science',
        ),
      ).toBe(true);
      expect(
        cats.body.some(
          (c: any) =>
            c.nameAr === 'تطوير المواقع والتطبيقات' &&
            c.nameEn === 'Web & App Development',
        ),
      ).toBe(true);
    });

    it('supports teacher signup and profile update with courseFocus, gradeIds, customGrades, and onboardingCompleted', async () => {
      const egGradesRes = await request(server).get('/api/onboarding/grades?country=EG');
      const g1 = egGradesRes.body[0];
      const g2 = egGradesRes.body[1];

      const signupRes = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'Academic EG Teacher',
          email: 'acad-eg@teacher.eg',
          password: 'Passw0rd!123',
          country: 'EG',
          phoneNumber: '01099887766',
          courseFocus: 'ACADEMIC',
          gradeIds: [g1.id, g2.id],
          customGrades: ['STEM Grade 10'],
        });
      expect(signupRes.status).toBe(201);
      expect(signupRes.body.user.courseFocus).toBe('ACADEMIC');
      expect(signupRes.body.user.taughtGrades).toHaveLength(3);
      expect(signupRes.body.user.taughtGrades.some((g: any) => g.name === 'STEM Grade 10' && g.country === 'EG')).toBe(true);

      const agent = request.agent(server);
      await agent
        .post('/api/auth/sign-in/email')
        .send({ email: 'acad-eg@teacher.eg', password: 'Passw0rd!123' });

      const meRes = await agent.get('/api/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.courseFocus).toBe('ACADEMIC');
      expect(meRes.body.onboardingCompletedAt).toBeNull();
      expect(meRes.body.taughtGrades).toHaveLength(3);

      const patchRes = await agent.patch('/api/me').send({
        courseFocus: 'GENERAL',
        subject: 'UI/UX Design',
        gradeIds: [g1.id],
        onboardingCompleted: true,
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.courseFocus).toBe('GENERAL');
      expect(patchRes.body.onboardingCompletedAt).toBeTruthy();
      expect(patchRes.body.taughtGrades).toHaveLength(1);
      expect(patchRes.body.taughtGrades[0].id).toBe(g1.id);
    });

    it('POST /api/onboarding/check-availability validates email uniqueness and country phone format/uniqueness', async () => {
      // Unused email
      const freeEmail = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ email: 'brandnew@teacher.om' });
      expect([200, 201]).toContain(freeEmail.status);
      expect(freeEmail.body).toEqual({ available: true });

      // Taken email (case-insensitive)
      const takenEmail = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ email: 'SALIM@TEACHER.OM' });
      expect([200, 201]).toContain(takenEmail.status);
      expect(takenEmail.body).toEqual({
        available: false,
        field: 'email',
        reason: 'Email is already registered',
      });

      // Invalid phone for OM
      const badOmPhone = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ phoneNumber: '01012345678', country: 'OM' });
      expect([200, 201]).toContain(badOmPhone.status);
      expect(badOmPhone.body).toEqual({
        available: false,
        field: 'phoneNumber',
        reason: 'Invalid phone number for selected country',
      });

      // Invalid phone for EG
      const badEgPhone = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ phoneNumber: '94001122', country: 'EG' });
      expect([200, 201]).toContain(badEgPhone.status);
      expect(badEgPhone.body).toEqual({
        available: false,
        field: 'phoneNumber',
        reason: 'Invalid phone number for selected country',
      });

      // Taken phone (already registered by Egypt Teacher +201012345678)
      const takenPhone = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ phoneNumber: '01012345678', country: 'EG' });
      expect([200, 201]).toContain(takenPhone.status);
      expect(takenPhone.body).toEqual({
        available: false,
        field: 'phoneNumber',
        reason: 'Phone number is already registered',
      });

      // Unused valid phone for EG
      const freePhone = await request(server)
        .post('/api/onboarding/check-availability')
        .send({ phoneNumber: '01234567890', country: 'EG' });
      expect([200, 201]).toContain(freePhone.status);
      expect(freePhone.body).toEqual({ available: true });
    });

    it('supports multi-step role registration payloads (GENERAL teacher, student with gradeId, parent with studentPhone) and GET /api/public/support', async () => {
      const supportRes = await request(server).get('/api/public/support');
      expect(supportRes.status).toBe(200);
      expect(supportRes.body).toHaveProperty('supportWhatsapp');

      // 1) Teacher GENERAL focus
      const generalTeacherRes = await request(server)
        .post('/api/onboarding/teacher')
        .send({
          name: 'General Track Teacher',
          email: 'general-track@teacher.om',
          password: 'Passw0rd!123',
          country: 'OM',
          phoneNumber: '95112233',
          courseFocus: 'GENERAL',
          subject: 'البرمجة وعلوم الحاسب',
        });
      expect(generalTeacherRes.status).toBe(201);
      expect(generalTeacherRes.body.user.courseFocus).toBe('GENERAL');
      expect(generalTeacherRes.body.user.subjectCategoryId).toBeTruthy();

      // 2) Student with country-scoped gradeId
      const omGradesRes = await request(server).get('/api/onboarding/grades?country=OM');
      const grade10 = omGradesRes.body.find((g: any) => g.nameEn === 'Grade 10') ?? omGradesRes.body[0];
      const studentRes = await request(server)
        .post('/api/onboarding/student')
        .send({
          name: 'MultiStep Student',
          password: 'Passw0rd!123',
          country: 'OM',
          phoneNumber: '95445566',
          gradeId: grade10.id,
        });
      expect(studentRes.status).toBe(201);
      expect(studentRes.body.user.gradeId).toBe(grade10.id);

      // 3) Parent linking child immediately via studentPhone
      const parentRes = await request(server)
        .post('/api/onboarding/parent')
        .send({
          name: 'MultiStep Parent',
          password: 'Passw0rd!123',
          country: 'OM',
          phoneNumber: '95778899',
          studentPhone: '95445566',
        });
      expect(parentRes.status).toBe(201);
      expect(parentRes.body.user.role).toBe('PARENT');

      const parentAgent = request.agent(server);
      await parentAgent
        .post('/api/auth/sign-in/phone-number')
        .send({ phoneNumber: '+96895778899', password: 'Passw0rd!123' });
      const childrenRes = await parentAgent.get('/api/parent/students');
      expect(childrenRes.status).toBe(200);
      expect(childrenRes.body.some((c: any) => c.id === studentRes.body.user.id)).toBe(true);
    });
  });
});
