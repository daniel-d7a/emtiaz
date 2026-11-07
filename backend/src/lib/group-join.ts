import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import { db } from '../db';
import {
  courses,
  groupEntryCodeUses,
  groupEntryCodes,
  groupStudents,
  groups,
  inboxNotifications,
  plans,
  teacherSubscriptions,
  users,
} from '../db/schema';
import { checkAndUnlockReferralReward } from '../modules/teacher/teacher-entitlements.service';

export const ENTRY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const genMonitoringCode = (): string =>
  Array.from({ length: 8 }, () => ENTRY_ALPHABET[randomInt(ENTRY_ALPHABET.length)]).join('');

export async function generateUniqueMonitoringCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genMonitoringCode();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.monitoringCode, code))
      .limit(1);
    if (!existing) return code;
  }
  return genMonitoringCode();
}

export const genJoinCode = () =>
  `OM${Math.floor(1000 + Math.random() * 9000)}`;

export async function joinGroupByCode(
  studentId: string,
  joinCode: string,
  entryCode?: string,
) {
  const [row] = await db
    .select({
      group: groups,
      course: courses,
      teacher: {
        id: users.id,
        isActive: users.isActive,
        deletedAt: users.deletedAt,
      },
    })
    .from(groups)
    .innerJoin(courses, eq(groups.courseId, courses.id))
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(
      and(
        eq(groups.joinCode, joinCode.trim().toUpperCase()),
        isNull(groups.deletedAt),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundException('Invalid group code');

  if (!row.teacher.isActive || row.teacher.deletedAt !== null) {
    throw new NotFoundException('Course or teacher not available');
  }

  if (!row.group.isActive) {
    throw new BadRequestException('Group is inactive');
  }

  const existing = await db
    .select({ id: groupStudents.id })
    .from(groupStudents)
    .where(
      and(
        eq(groupStudents.groupId, row.group.id),
        eq(groupStudents.studentId, studentId),
      ),
    )
    .limit(1);

  if (existing.length) return { ...row, enrolled: false };

  const teacherId = row.course.teacherId;
  const alreadyActiveResult = await db.execute<{ count: number }>(sql`
    SELECT count(1)::int AS count
    FROM (
      SELECT gs.student_id
      FROM group_students gs
      JOIN groups g ON g.id = gs.group_id
      JOIN courses c ON c.id = g.course_id
      WHERE c.teacher_id = ${teacherId}
        AND gs.student_id = ${studentId}
        AND c.deleted_at IS NULL
        AND g.deleted_at IS NULL
        AND g.is_active = true

      UNION

      SELECT gs.student_id
      FROM group_students gs
      JOIN courses c ON c.id = (SELECT course_id FROM groups WHERE id = gs.group_id)
      WHERE c.teacher_id = ${teacherId}
        AND gs.student_id = ${studentId}
        AND c.deleted_at IS NULL
        AND gs.joined_at >= date_trunc('month', now())
    ) s
  `);
  const isNewStudentForTeacher = Number(alreadyActiveResult.rows[0]?.count ?? 0) === 0;

  if (isNewStudentForTeacher) {
    const countResult = await db.execute<{ count: number }>(sql`
      SELECT count(DISTINCT s.student_id)::int AS count
      FROM (
        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND g.deleted_at IS NULL
          AND g.is_active = true
          AND u.deleted_at IS NULL

        UNION

        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND gs.joined_at >= date_trunc('month', now())
          AND u.deleted_at IS NULL
      ) s
    `);
    const activeStudentCount = Number(countResult.rows[0]?.count ?? 0);

    const [activeSub] = await db
      .select({ maxStudents: teacherSubscriptions.maxStudents })
      .from(teacherSubscriptions)
      .where(
        and(
          eq(teacherSubscriptions.teacherId, teacherId),
          gt(teacherSubscriptions.endsAt, sql`now()`),
        ),
      )
      .orderBy(desc(teacherSubscriptions.endsAt), desc(teacherSubscriptions.tierRank))
      .limit(1);

    let maxStudents: number | null = null;
    if (activeSub) {
      maxStudents = activeSub.maxStudents;
    } else {
      const [freePlan] = await db
        .select({ maxStudents: plans.maxStudents })
        .from(plans)
        .where(eq(plans.slug, 'free'))
        .limit(1);
      maxStudents = freePlan?.maxStudents ?? 10;
    }

    if (maxStudents !== null && activeStudentCount >= maxStudents) {
      await db.insert(inboxNotifications).values({
        userId: teacherId,
        type: 'SYSTEM',
        message:
          'A student tried to join your group, but you have reached your plan limit. Please upgrade to accept more students. / حاول طالب الانضمام ولكنك وصلت للحد الأقصى لخطتك، يُرجى الترقية.',
      });
      throw new ConflictException(
        'This group has reached its maximum capacity — please contact your teacher',
      );
    }
  }

  if (row.group.requiresEntryCode) {
    const normalized = entryCode?.trim().toUpperCase();
    if (!normalized) throw new BadRequestException('Entry code is required');

    const [code] = await db
      .select()
      .from(groupEntryCodes)
      .where(
        and(
          eq(groupEntryCodes.groupId, row.group.id),
          eq(groupEntryCodes.code, normalized),
        ),
      )
      .limit(1);

    if (!code) throw new BadRequestException('Invalid entry code');

    await db.transaction(async (tx) => {
      const [use] = await tx
        .insert(groupEntryCodeUses)
        .values({ entryCodeId: code.id, studentId })
        .onConflictDoNothing()
        .returning({ id: groupEntryCodeUses.id });

      if (!use) return;

      const [claimed] = await tx
        .update(groupEntryCodes)
        .set({ usedCount: sql`${groupEntryCodes.usedCount} + 1` })
        .where(
          and(
            eq(groupEntryCodes.id, code.id),
            sql`${groupEntryCodes.usedCount} < ${groupEntryCodes.maxUses}`,
          ),
        )
        .returning({ id: groupEntryCodes.id });

      if (!claimed) throw new BadRequestException('Entry code is used up');
    });
  }

  const [inserted] = await db
    .insert(groupStudents)
    .values({ groupId: row.group.id, studentId })
    .onConflictDoNothing()
    .returning({ id: groupStudents.id });

  if (inserted) {
    await checkAndUnlockReferralReward(teacherId);
  }

  return { ...row, enrolled: Boolean(inserted) };
}
