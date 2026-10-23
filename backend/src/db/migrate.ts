import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

/** Applies drizzle/NNNN_*.sql files not yet recorded in drizzle.__drizzle_migrations. */
export async function applyMigrations(url: string, dir?: string) {
  const realDir =
    dir ?? join(__dirname, '..', '..', 'drizzle');
  const pool = new Pool({ connectionString: url });
  const files = readdirSync(realDir).filter((f) => f.endsWith('.sql')).sort();
  await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await pool.query(
    `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
       id serial PRIMARY KEY, hash text, created_at bigint
     )`,
  );
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations',
  );
  const applied = Number(rows[0].count);
  for (let i = applied; i < files.length; i++) {
    const sql = readFileSync(join(realDir, files[i]), 'utf8').split(
      '--> statement-breakpoint',
    ).join(';');
    await pool.query(sql);
    await pool.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [files[i], Date.now()],
    );
  }
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
