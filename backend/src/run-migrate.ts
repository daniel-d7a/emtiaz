/** Runtime CLI: applies drizzle migrations using DATABASE_URL. Usage: node dist/run-migrate.js */
import { applyMigrations } from './db/migrate';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
applyMigrations(url, process.env.MIGRATIONS_DIR)
  .then((pool) => pool.end())
  .then(() => console.log('Migrations applied.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
