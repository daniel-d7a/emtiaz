import 'dotenv/config';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });
export * as schema from './schema';

/** Closes the shared pg pool on app shutdown so tests and deploys exit cleanly. */
@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await pool.end();
  }
}
