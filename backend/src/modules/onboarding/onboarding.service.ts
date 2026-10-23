import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { courses, groupStudents, groups, users } from '../../db/schema';
import * as schema from '../../db/schema';

const genJoinCode = () =>
  `OM${Math.floor(100000 + Math.random() * 900000)}`.slice(0, 6);

export { genJoinCode };

@Injectable()
export class OnboardingService {
  /** Adds the given student to a group identified by its join code. */
  async joinByCode(studentId: string, joinCode: string) {
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.joinCode, joinCode))
      .limit(1);
    if (!group.length) throw new NotFoundException('Invalid group code');

    const [groupRow] = group;
    if (!groupRow.isActive) throw new NotFoundException('Group inactive');

    const existing = await db
      .select()
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, groupRow.id),
          eq(groupStudents.studentId, studentId),
        ),
      )
      .limit(1);
    if (!existing.length) {
      await db
        .insert(groupStudents)
        .values({ groupId: groupRow.id, studentId });
    }

    const course = (
      await db.select().from(courses).where(eq(courses.id, groupRow.courseId))
    )[0];
    return { group: groupRow, course };
  }

  async updateMe(
    userId: string,
    dto: Partial<{ name: string; phoneNumber: string; specialization: string }>,
  ) {
    const allowed: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.name !== undefined && dto.name.trim()) allowed.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) allowed.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.specialization !== undefined) allowed.specialization = dto.specialization.trim() || null;
    if (!Object.keys(allowed).length) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) throw new NotFoundException('User not found');
      return user;
    }
    const [updated] = await db
      .update(users)
      .set(allowed)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}
