import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/auth';
import { db } from './index';
import { notificationSettings, plans, semesters, sessions, users } from './schema';
import { seedPlans } from './seed-plans';
import { seedTaxonomy } from './seed-taxonomy';

/**
 * Idempotent production bootstrap:
 * - Seeds default plans only when the plans table is empty (preserves admin edits).
 * - Ensures base taxonomy (grades/categories), semesters, and global settings exist.
 * - Creates the initial ADMIN account from ADMIN_EMAIL / ADMIN_PASSWORD if provided and missing.
 * - Never seeds demo users or demo courses.
 */
export async function bootstrapProduction() {
  const existingPlans = await db.select({ id: plans.id }).from(plans).limit(1);
  if (existingPlans.length === 0) {
    await seedPlans(db);
    console.log('Bootstrap: seeded default plans.');
  }

  await seedTaxonomy(db);

  const existingSemesters = await db.select({ id: semesters.id }).from(semesters).limit(1);
  if (existingSemesters.length === 0) {
    await db.insert(semesters).values([
      { name: 'Semester 1', displayOrder: 1 },
      { name: 'Semester 2', displayOrder: 2 },
    ]);
    console.log('Bootstrap: seeded default semesters.');
  }

  await db
    .insert(notificationSettings)
    .values({
      id: 'global',
      supportEmail: 'support@emtiaz.om',
      supportPhone: '+96890000000',
      supportWhatsapp: '+96890000000',
    })
    .onConflictDoNothing();

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || 'Platform Admin';

  if (adminEmail && adminPassword) {
    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (!existingAdmin) {
      const result = (await auth.api.signUpEmail({
        body: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'ADMIN',
        },
        returnHeaders: true,
        asResponse: false,
        headers: new Headers(),
      } as any)) as unknown as { response?: { user?: { id: string } }; error?: { message?: string } };

      if (result?.error) {
        throw new Error(`Failed to create admin user: ${result.error.message ?? 'unknown error'}`);
      }
      if (result?.response?.user?.id) {
        await db.delete(sessions).where(eq(sessions.userId, result.response.user.id));
      }
      console.log(`Bootstrap: created admin account (${adminEmail}).`);
    }
  }
}

if (require.main === module) {
  bootstrapProduction()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Bootstrap failed:', err);
      process.exit(1);
    });
}
