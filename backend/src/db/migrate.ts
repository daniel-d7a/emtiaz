import { join } from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/**
 * Applies migrations through drizzle-kit's own journal (`drizzle/meta/_journal.json`),
 * so runtime, `db:migrate`, and `db:generate` all share one source of truth.
 */
export async function applyMigrations(url: string, dir?: string) {
  const realDir = dir ?? join(__dirname, '..', '..', 'drizzle');
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle({ client: pool }), { migrationsFolder: realDir });
  return pool;
}

export async function resetTestDb() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await pool.query(
    'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;',
  );
  await pool.end();
  return applyMigrations(process.env.TEST_DATABASE_URL!);
}
