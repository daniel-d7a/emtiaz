import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  courses,
  groupEntryCodeUses,
  groupEntryCodes,
  groupStudents,
  groups,
} from '../db/schema';

export async function joinGroupByCode(
  studentId: string,
  joinCode: string,
  entryCode?: string,
) {
  const [row] = await db
    .select({ group: groups, course: courses })
    .from(groups)
    .innerJoin(courses, eq(groups.courseId, courses.id))
    .where(
      and(
        eq(groups.joinCode, joinCode.trim().toUpperCase()),
        eq(groups.isActive, true),
        isNull(groups.deletedAt),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundException('Invalid group code');

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

  return { ...row, enrolled: Boolean(inserted) };
}
