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
    const theme = {
      layout: 'split',
      primary: '#1D4ED8',
      secondary: '#B45309',
      marquee: 'Welcome to physics',
      arabicFont: 'tajawal',
      englishFont: 'inter',
    };
    const set = await teacher.patch('/api/me').send({
      landingSlug: 'salim-physics',
      landingBio: 'Physics for everyone',
      landingTheme: theme,
      landingPublished: true,
    });
    expect(set.status).toBe(200);
    expect(set.body.landingTheme).toEqual(theme);

    const freshSession = await login(server, TEACHER.email, TEACHER.password);
    const sessionBody = await freshSession.session.get('/api/auth/get-session');
    expect(sessionBody.body.user.landingSlug).toBe('salim-physics');

    const page = await request(server).get('/api/public/teachers/salim-physics');
    expect(page.status).toBe(200);
    expect(page.body.teacher.name).toBe(TEACHER.name);
    expect(page.body.teacher.bio).toBe('Physics for everyone');
    expect(page.body.teacher.theme).toEqual(theme);
    expect(page.body.teacher.email).toBe(TEACHER.email);
    expect(page.body.support).toHaveProperty('email');
    const course = page.body.courses.find((c: any) => c.title === 'Physics 10');
    expect(course).toBeTruthy();

    const catalog = await request(server).get('/api/public/courses?search=Physics');
    expect(catalog.status).toBe(200);
    const catalogCourse = catalog.body.courses.find((c: any) => c.id === course.id);
    expect(catalogCourse).toBeTruthy();
    expect(catalogCourse.teacher.slug).toBe('salim-physics');
    expect(catalog.body.filters.teachers.some((t: any) => t.slug === 'salim-physics')).toBe(true);

    const filtered = await request(server).get(
      `/api/public/courses?teacherId=${catalogCourse.teacher.id}&courseType=ACADEMIC`,
    );
    expect(filtered.body.courses.every((c: any) => c.teacher.id === catalogCourse.teacher.id)).toBe(true);
    expect(
      (await request(server).get('/api/public/courses?courseType=NOPE')).body.courses.length,
    ).toBeGreaterThan(0);

    const detail = await request(server).get(
      `/api/public/teachers/salim-physics/courses/${course.id}`,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.course.title).toBe('Physics 10');
    expect(detail.body.modules[0].lessons.length).toBeGreaterThan(0);
    expect(detail.body.teacher.name).toBe(TEACHER.name);

    const sitemap = await request(server).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain('/t/salim-physics');
    expect(sitemap.text).toContain('<urlset');
    const robots = await request(server).get('/robots.txt');
    expect(robots.text).toContain('Sitemap:');

    expect((await request(server).get('/api/public/teachers/salim-physics/avatar')).status).toBe(404);

    const hidden = await teacher.patch('/api/me').send({ landingPublished: false });
    expect(hidden.status).toBe(200);
    expect((await request(server).get('/api/public/teachers/salim-physics')).status).toBe(404);
    expect((await request(server).get('/api/public/courses')).body.courses).toHaveLength(0);
  });

  it('rejects invalid slugs and non-teacher pages', async () => {
    const teacher = (await login(server, TEACHER.email, TEACHER.password)).session;
    expect((await teacher.patch('/api/me').send({ landingSlug: 'Bad Slug!' })).status).toBe(400);
    expect(
      (
        await teacher.patch('/api/me').send({
          landingTheme: {
            layout: 'split',
            primary: 'teal',
            secondary: '#B45309',
            marquee: '',
            arabicFont: 'tajawal',
            englishFont: 'inter',
          },
        })
      ).status,
    ).toBe(400);

    const student = (await login(server, STUDENT1.email, STUDENT1.password)).session;
    expect((await student.patch('/api/me').send({ landingSlug: 'aisha' })).status).toBe(400);
  });
});
