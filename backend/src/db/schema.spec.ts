import 'dotenv/config';
import type { Pool } from 'pg';
import { resetTestDb } from './migrate';

describe('Phase 1: database schema', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = await resetTestDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('created all core LMS tables and auth tables', async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    );
    const names = rows.map((r) => r.table_name);
    for (const t of [
      'user', 'session', 'account', 'verification',
      'grades', 'categories',
      'courses', 'modules', 'lessons',
      'groups', 'group_students', 'group_lesson_access',
      'lesson_attachments',
      'quizzes', 'quiz_questions', 'quiz_attempts', 'lesson_completions',
      'manual_grade_columns', 'manual_grade_values',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('created expected enums', async () => {
    const { rows } = await pool.query<{ typname: string }>(
      `SELECT typname FROM pg_type WHERE typname IN ('role','course_type','attachment_type','question_type')`,
    );
    expect(rows.map((r) => r.typname).sort()).toEqual(['attachment_type', 'course_type', 'question_type', 'role']);
  });

  it('enforces unique group-student enrollment and lesson access', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email) VALUES ('u1','S','s@t.om'),('u2','T','t@t.om')`);
    const course = (
      await pool.query(`INSERT INTO courses (title, teacher_id) VALUES ('C1','u2') RETURNING id`)
    ).rows[0].id;
    const grp = (
      await pool.query(`INSERT INTO groups (course_id, name, join_code) VALUES ('${course}','G1','OM0001') RETURNING id`)
    ).rows[0].id;
    await pool.query(`INSERT INTO group_students (group_id, student_id) VALUES ('${grp}','u1')`);
    await expect(
      pool.query(`INSERT INTO group_students (group_id, student_id) VALUES ('${grp}','u1')`),
    ).rejects.toThrow();

    const lesson = (
      await pool.query(
        `INSERT INTO modules (course_id, title) VALUES ('${course}','M1') RETURNING id IS NOT NULL AS ok, id`,
      )
    ).rows[0];
    void lesson;
    const modId = (await pool.query(`SELECT id FROM modules WHERE course_id='${course}' LIMIT 1`)).rows[0].id;
    const les = (await pool.query(`INSERT INTO lessons (module_id, title) VALUES ('${modId}','L1') RETURNING id`)).rows[0].id;
    await pool.query(`INSERT INTO group_lesson_access (group_id, lesson_id) VALUES ('${grp}','${les}')`);
    await expect(
      pool.query(`INSERT INTO group_lesson_access (group_id, lesson_id) VALUES ('${grp}','${les}')`),
    ).rejects.toThrow();
    await expect(
      pool.query(`INSERT INTO lesson_completions (lesson_id, student_id) SELECT '${les}','u1'`),
    ).resolves.toBeTruthy();
    await expect(
      pool.query(`INSERT INTO lesson_completions (lesson_id, student_id) SELECT '${les}','u1'`),
    ).rejects.toThrow();
  });

  it('cascades deletes from course -> group -> students', async () => {
    await pool.query(`DELETE FROM courses WHERE title='C1'`);
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM groups WHERE join_code='OM0001'`);
    expect(rows[0].c).toBe(0);
  });

  it('rejects bad quiz points and impossible attempt scores (CHECK constraints)', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email) VALUES ('uq','Q','q@t.om')`);
    const course = (
      await pool.query(`INSERT INTO courses (title, teacher_id) VALUES ('CQ','uq') RETURNING id`)
    ).rows[0].id;
    const mod = (
      await pool.query(`INSERT INTO modules (course_id, title) VALUES ('${course}','MQ') RETURNING id`)
    ).rows[0].id;
    const les = (
      await pool.query(`INSERT INTO lessons (module_id, title) VALUES ('${mod}','LQ') RETURNING id`)
    ).rows[0].id;
    const quiz = (
      await pool.query(`INSERT INTO quizzes (lesson_id, title) VALUES ('${les}','Q Quiz') RETURNING id`)
    ).rows[0].id;
    await expect(
      pool.query(
        `INSERT INTO quiz_questions (quiz_id, prompt, correct_answer, points) VALUES ('${quiz}','P','x', 0)`,
      ),
    ).rejects.toThrow(/quiz_points_positive_chk/);

    const grp = (
      await pool.query(`INSERT INTO groups (course_id, name, join_code) VALUES ('${course}','GQ','OM000Q') RETURNING id`)
    ).rows[0].id;
    const studentId = (await pool.query(`SELECT id FROM "user" WHERE email='s@t.om'`)).rows[0]?.id;
    void studentId;
    await expect(
      pool.query(
        `INSERT INTO quiz_attempts (quiz_id, student_id, group_id, score, max_score, answers_json)
         VALUES ('${quiz}','uq','${grp}', 10, 5, '[]'::jsonb)`,
      ),
    ).rejects.toThrow(/attempt_score_sane_chk/);
  });
});
