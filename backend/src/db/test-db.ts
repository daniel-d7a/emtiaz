import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export function createTestDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return { db: drizzle({ client: pool }), pool };
}
