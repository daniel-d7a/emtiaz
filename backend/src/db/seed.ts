import { auth } from '../auth/auth';
import { db } from './index';
import { accounts, categories, grades, sessions, users } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  const existing = await db.select().from(grades).limit(1);
  if (existing.length > 0) {
    // self-heal: an admin created before better-auth wiring may lack a password account
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@emtiaz.om'));
    if (admin) {
      const accts = await db.select().from(accounts).where(eq(accounts.userId, admin.id));
      if (accts.length) {
        console.log('Already seeded.');
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
  const { response, error } = (await auth.api.signUpEmail({
    body: {
      name: 'Platform Admin',
      email: 'admin@emtiaz.om',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'admin-password-123',
      role: 'ADMIN',
    },
    returnHeaders: true,
    asResponse: false,
    headers: new Headers(),
  } as any)) as unknown as { response: { user: { id: string } }; error?: Error };
  if (error) throw error;
  // promote to ADMIN (signUpEmail creates a STUDENT by default)
  await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, response.user.id));
  await db.delete(sessions); // don't seed a live session
  console.log('Seeded grades, categories, admin (admin@emtiaz.om).');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
