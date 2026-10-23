import 'dotenv/config';

// Tests must point DATABASE_URL at the ephemeral test database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
