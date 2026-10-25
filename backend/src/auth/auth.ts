import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
  // IP-based throttling for credential endpoints (per-account lockout is a
  // future addition; this already makes password spraying slow).
  rateLimit: {
    enabled: process.env.NODE_ENV !== 'test',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 10 },
      '/sign-in/phone-number': { window: 60, max: 10 },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days session for student convenience
    updateAge: 60 * 60 * 24, // Extend every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache to reduce DB hits
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'STUDENT', input: true },
      phoneNumber: { type: 'string', required: false, input: true },
      gradeId: { type: 'string', required: false, input: true },
      specialization: { type: 'string', required: false, input: true },
      subjectCategoryId: { type: 'string', required: false, input: true },
      isActive: { type: 'boolean', defaultValue: true, input: false },
    },
  },
});
