import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike } from 'drizzle-orm';
import { db } from '../../db';
import { categories, courses, groupStudents, groups, users } from '../../db/schema';
import * as schema from '../../db/schema';
import { NotificationsService } from '../notifications/notifications.service';

const genJoinCode = () =>
  `OM${Math.floor(100000 + Math.random() * 900000)}`.slice(0, 6);

export { genJoinCode };

@Injectable()
export class OnboardingService {
  constructor(private readonly notifications: NotificationsService) {}

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
      await this.notifyEnrolled(studentId, groupRow);
    }

    const course = (
      await db.select().from(courses).where(eq(courses.id, groupRow.courseId))
    )[0];
    return { group: groupRow, course };
  }

  /** One welcome note per new enrollment; failure never blocks the join. */
  private async notifyEnrolled(studentId: string, groupRow: typeof groups.$inferSelect) {
    const [student] = await db.select().from(users).where(eq(users.id, studentId));
    await this.notifications.sendWhatsApp(
      student?.phoneNumber ?? '',
      `تم تسجيلك في «${groupRow.name}» بنجاح 🎉`,
    );
  }

  /** Free-text subject from signup/profile forms normalizes into the shared taxonomy (case-insensitive ensure). */
  async ensureCategory(name?: string) {
    const trimmed = name?.trim();
    if (!trimmed) throw new BadRequestException('subject is required');
    const [existing] = await db
      .select()
      .from(categories)
      .where(ilike(categories.name, trimmed))
      .limit(1);
    if (existing) return existing;
    const [created] = await db.insert(categories).values({ name: trimmed }).returning();
    return created;
  }

  listCategories() {
    return db.select().from(categories).orderBy(asc(categories.name));
  }

  async updateMe(
    userId: string,
    dto: Partial<{ name: string; phoneNumber: string; subject: string }>,
  ) {
    const allowed: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.name !== undefined && dto.name.trim()) allowed.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) allowed.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.subject !== undefined) {
      allowed.subjectCategoryId = (await this.ensureCategory(dto.subject)).id;
    }
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
