import { db } from './index';
import { grades, categories, users } from './schema';

async function seed() {
  const existing = await db.select().from(grades).limit(1);
  if (existing.length > 0) {
    console.log('Already seeded.');
    process.exit(0);
  }
  const gradeNames = Array.from({ length: 8 }, (_, i) => `Grade ${i + 5}`);
  await db.insert(grades).values(gradeNames.map((name, i) => ({ name, displayOrder: i })));
  await db.insert(categories).values([
    { name: 'English Speaking' },
    { name: 'Grammar' },
    { name: 'IELTS' },
    { name: 'IELTS Preparation' },
  ]);
  await db.insert(users).values({
    id: 'admin_seed_000001',
    name: 'Platform Admin',
    email: 'admin@emtiaz.om',
    role: 'ADMIN',
  });
  console.log('Seeded grades, categories, admin.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
