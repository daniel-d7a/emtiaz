import { auth } from '../auth/auth';
import { db } from './index';
import {
  accounts,
  categories,
  courses,
  grades,
  groupStudents,
  groups,
  lessonCompletions,
  lessons,
  parentStudents,
  modules,
  quizQuestions,
  quizzes,
  sessions,
  users,
} from './schema';
import { eq } from 'drizzle-orm';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo-password';

async function signUp(name: string, email: string, password: string, role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT', extra: { phoneNumber?: string; gradeId?: string } = {}) {
  try {
    const { response, error } = (await auth.api.signUpEmail({
      body: { name, email, password, role, ...extra },
      returnHeaders: true,
      asResponse: false,
      headers: new Headers(),
    } as any)) as unknown as { response: { user: { id: string } }; error?: { message?: string } };
    if (error) throw error;
    return response.user.id;
  } catch (e: any) {
    // rerun tolerance: better-auth throws APIError itself for an existing user.
    // reuse the user if the demo password already works; otherwise wipe + recreate so the password is always ours
    if (e?.body?.message !== 'User already exists. Use another email.') throw e;
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    if (!existingUser) throw e;
    const signInOk = await auth.api
      .signInEmail({ body: { email, password }, asResponse: false, headers: new Headers() })
      .then(() => true)
      .catch(() => false);
    if (!signInOk) {
      await db.delete(sessions).where(eq(sessions.userId, existingUser.id));
      await db.delete(accounts).where(eq(accounts.userId, existingUser.id));
      await db.delete(users).where(eq(users.id, existingUser.id));
      return await signUp(name, email, password, role, extra);
    }
    return existingUser.id;
  }
}

async function getOrCreateCategory(name: string) {
  const [existing] = await db.select().from(categories).where(eq(categories.name, name));
  if (existing) return existing;
  return (await db.insert(categories).values({ name }).returning())[0];
}

const joinCode = () => `OM${Math.floor(100000 + Math.random() * 900000)}`;

async function makeCourse(teacherId: string, dto: {
  title: string;
  courseType: 'ACADEMIC' | 'GENERAL';
  gradeName?: string;
  categoryName?: string;
  semester?: string;
}) {
  let gradeId: string | null = null;
  let categoryId: string | null = null;
  if (dto.courseType === 'ACADEMIC') {
    gradeId = (await db.select().from(grades).where(eq(grades.name, dto.gradeName ?? 'Grade 10')))[0]?.id ?? null;
  } else {
    categoryId = (await db.select().from(categories).where(eq(categories.name, dto.categoryName ?? 'English Speaking')))[0]?.id ?? null;
  }
  const [course] = await db
    .insert(courses)
    .values({ title: dto.title, courseType: dto.courseType, teacherId, gradeId, categoryId, semester: dto.semester })
    .returning();
  return course;
}

/** One module, two lessons, quiz on lesson 1 with the phase-3 question set. */
async function makeCurriculum(courseId: string, title: string, defs: Array<{ title: string; content?: string; withQuiz?: boolean }>) {
  const [mod] = await db.insert(modules).values({ courseId, title, displayOrder: 0 }).returning();
  const inserted: string[] = [];
  for (let i = 0; i < defs.length; i++) {
    const [l] = await db
      .insert(lessons)
      .values({ moduleId: mod.id, title: defs[i].title, content: defs[i].content ?? null, displayOrder: i })
      .returning();
    inserted.push(l.id);
    if (defs[i].withQuiz) {
      const [quiz] = await db.insert(quizzes).values({ lessonId: l.id, title: `${defs[i].title} — Quiz` }).returning();
      await db.insert(quizQuestions).values([
        { quizId: quiz.id, questionType: 'MCQ', prompt: 'What is the S.I unit of speed?', options: ['km/h', 'm/s', 'N', 'J'], correctAnswer: 'm/s', explanation: 'speed is m/s', points: 1, displayOrder: 0 },
        { quizId: quiz.id, questionType: 'TRUE_FALSE', prompt: 'Gravity accelerates objects at 9.8 m/s² on Earth', options: null, correctAnswer: 'true', explanation: 'g = 9.8', points: 1, displayOrder: 1 },
      ]);
    }
  }
  return inserted;
}

async function seed() {
  const existing = await db.select().from(grades).limit(1);
  if (existing.length > 0) {
    // self-heal: an admin created before better-auth wiring may lack a password account
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@emtiaz.om'));
    if (admin) {
      const accts = await db.select().from(accounts).where(eq(accounts.userId, admin.id));
      if (accts.length) {
        await seedDemo();
        process.exit(0);
      }
      // passwordless legacy admin: drop and recreate with credentials below
      await db.delete(sessions).where(eq(sessions.userId, admin.id));
      await db.delete(users).where(eq(users.id, admin.id));
    }
  }
  const gradeNames = Array.from({ length: 8 }, (_, i) => `Grade ${i + 5}`);
  await db.insert(grades).values(gradeNames.map((name, i) => ({ name, displayOrder: i })));
  await db.insert(categories).values([
    { name: 'English Speaking' },
    { name: 'Grammar' },
    { name: 'IELTS' },
    { name: 'IELTS Preparation' },
  ]);
  await signUp('Platform Admin', 'admin@emtiaz.om', process.env.SEED_ADMIN_PASSWORD ?? 'admin-password-123', 'ADMIN');
  await db.delete(sessions); // don't seed a live session
  console.log('Seeded grades, categories, admin (admin@emtiaz.om).');
  await seedDemo();
  process.exit(0);
}

/** Demo world: 2 teachers × (1 academic + 1 general) course, shared students, groups, lessons, one quiz. */
async function seedDemo() {
  if (process.env.SEED_DEMO === '0') return;

  // always ensure the demo users exist (same email: reused if demo password works, else wiped + recreated)
  const teacher1 = await signUp('Salim Al Balushi', 'salim@teacher.om', DEMO_PASSWORD, 'TEACHER', {
    phoneNumber: '+96894000001',
  });
  await db.update(users).set({ subjectCategoryId: (await getOrCreateCategory('Sciences')).id }).where(eq(users.id, teacher1));
  await db
    .update(users)
    .set({
      landingSlug: 'salim',
      landingBio: 'Physics teacher in Muscat.',
      landingPublished: true,
      landingTheme: {
        layout: 'split',
        primary: '#0F766E',
        secondary: '#EA580C',
        marquee: 'فيزياء أوضح — Physics made simple',
        arabicFont: 'cairo',
        englishFont: 'dm-sans',
      },
    })
    .where(eq(users.id, teacher1));
  const teacher2 = await signUp('Fatma Al Hinai', 'fatma@teacher.om', DEMO_PASSWORD, 'TEACHER', {
    phoneNumber: '+96894000002',
  });
  await db.update(users).set({ subjectCategoryId: (await getOrCreateCategory('Languages')).id }).where(eq(users.id, teacher2));
  const studentIds: string[] = [];
  for (let i = 1; i <= 6; i++) {
    studentIds.push(await signUp(`Student ${i}`, `student${i}@demo.om`, DEMO_PASSWORD, 'STUDENT', { phoneNumber: `+96894100006${i}` }));
  }
  const parentId = await signUp('Umm Student One', 'parent1@demo.om', DEMO_PASSWORD, 'PARENT', {
    phoneNumber: '+968941000070',
  });
  await db.insert(parentStudents).values({ parentId, studentId: studentIds[0] }).onConflictDoNothing();

  const [anyCourse] = await db.select({ id: courses.id }).from(courses).limit(1);
  if (anyCourse) {
    console.log('Demo users ensured; course/group data present — skipping rest.');
    return;
  }

  // Teacher 1: academic physics (2 groups) + general English (1 group)
  const physics = await makeCourse(teacher1, { title: 'Physics — Grade 10', courseType: 'ACADEMIC', gradeName: 'Grade 10', semester: 'Semester 1' });
  const g1a = (await db.insert(groups).values({ courseId: physics.id, name: 'Physics — Sun Tue', joinCode: joinCode() }).returning())[0];
  const g1b = (await db.insert(groups).values({ courseId: physics.id, name: 'Physics — Wed Thu', joinCode: joinCode() }).returning())[0];
  const physicsLessons = await makeCurriculum(physics.id, 'Unit 1 — Motion', [
    { title: 'Speed & velocity', content: 'A constant speed v covers d = v·t. Units: m/s.', withQuiz: true },
    { title: 'Force basics', content: 'F = m·a. Read chapter 2 before class.' },
  ]);
  const english = await makeCourse(teacher1, { title: 'English Speaking — Everyday', courseType: 'GENERAL', categoryName: 'English Speaking' });
  const g1c = (await db.insert(groups).values({ courseId: english.id, name: 'Speaking Circle A', joinCode: joinCode() }).returning())[0];

  // Teacher 2: academic math + general IELTS
  const math = await makeCourse(teacher2, { title: 'Math — Grade 7', courseType: 'ACADEMIC', gradeName: 'Grade 7', semester: 'Semester 1' });
  const g2a = (await db.insert(groups).values({ courseId: math.id, name: 'Math — Group 1', joinCode: joinCode() }).returning())[0];
  const ielts = await makeCourse(teacher2, { title: 'IELTS Crash Prep', courseType: 'GENERAL', categoryName: 'IELTS Preparation' });
  const g2b = (await db.insert(groups).values({ courseId: ielts.id, name: 'IELTS — Evening', joinCode: joinCode() }).returning())[0];

  // enrollments: students 1-3 in g1a, students 2+4 in g1b, students 3+5 in g1c; 5+6 in g2a; 1+6 in g2b
  const plan: Array<[string, string]> = [
    [g1a.id, studentIds[0]], [g1a.id, studentIds[1]], [g1a.id, studentIds[2]],
    [g1b.id, studentIds[1]], [g1b.id, studentIds[3]],
    [g1c.id, studentIds[2]], [g1c.id, studentIds[4]],
    [g2a.id, studentIds[4]], [g2a.id, studentIds[5]],
    [g2b.id, studentIds[0]], [g2b.id, studentIds[5]],
  ];
  await db.insert(groupStudents).values(plan.map(([groupId, studentId]) => ({ groupId, studentId })));

  // a bit of progress so the student dashboard looks alive
  await db.insert(lessonCompletions).values({ lessonId: physicsLessons[0], studentId: studentIds[0] });

  console.log(
    `Demo seeded (${DEMO_PASSWORD} everywhere):\n` +
      `  teachers: salim@teacher.om, fatma@teacher.om\n` +
      `  students: student1@demo.om … student6@demo.om\n` +
      `  parent: parent1@demo.om (linked to Student 1)\n` +
      `  courses: ${physics.title}, ${english.title}, ${math.title}, ${ielts.title}\n` +
      `  join codes: ${g1a.joinCode}, ${g1b.joinCode}, ${g1c.joinCode}, ${g2a.joinCode}, ${g2b.joinCode}`,
  );
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
