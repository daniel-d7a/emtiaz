import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { and, asc, eq, ilike, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { auth } from '../../auth/auth';
import { categories, courses, groupStudents, groups, parentStudents, users } from '../../db/schema';
import * as schema from '../../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

const genJoinCode = () =>
  `OM${Math.floor(100000 + Math.random() * 900000)}`.slice(0, 6);

export { genJoinCode };

@Injectable()
export class OnboardingService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** Adds the given student to a group identified by its join code. */
  async joinByCode(studentId: string, joinCode: string) {
    const group = await db
      .select({ group: groups, course: courses })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groups.joinCode, joinCode),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);
    if (!group.length) throw new NotFoundException('Invalid group code');

    const { group: groupRow, course } = group[0];
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

    return { group: groupRow, course };
  }

  /** One welcome note per new enrollment; failure never blocks the join. */
  private async notifyEnrolled(studentId: string, groupRow: typeof groups.$inferSelect) {
    const [student] = await db.select().from(users).where(eq(users.id, studentId));
    const message = `تم تسجيلك في «${groupRow.name}» بنجاح 🎉`;
    await this.notifications.sendWhatsApp(student?.phoneNumber ?? '', message, 'TEACHER');
    await this.notifications.sendInApp(studentId, message, 'TEACHER');
    if (student) {
      const parents = await db
        .select({ id: parentStudents.parentId })
        .from(parentStudents)
        .where(
          and(
            eq(parentStudents.studentId, studentId),
            isNull(parentStudents.deletedAt),
          ),
        );
      await Promise.all(
        parents.map((p) =>
          this.notifications.sendInApp(p.id, `تم تسجيل ${student.name} في «${groupRow.name}»`, 'PARENT'),
        ),
      );
    }
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

  async createTeacher(dto: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    subject: string;
  }) {
    const subjectCategoryId = (await this.ensureCategory(dto.subject)).id;
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        role: 'TEACHER',
        phoneNumber: dto.phoneNumber,
        subjectCategoryId,
      },
      returnHeaders: true,
    });
    return data.response.user;
  }

  listCategories() {
    return db.select().from(categories).orderBy(asc(categories.name));
  }

  async updateMe(
    userId: string,
    dto: Partial<{
      name: string;
      phoneNumber: string;
      subject: string;
      dateOfBirth: string | null;
      gradeId: string | null;
      image: string | null;
      landingSlug: string;
      landingBio: string;
      landingBanner: string | null;
      landingTheme: schema.TeacherTheme;
      landingPublished: boolean;
    }>,
  ) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    const allowed: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.name !== undefined && dto.name.trim()) allowed.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) allowed.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.subject !== undefined) {
      allowed.subjectCategoryId = (await this.ensureCategory(dto.subject)).id;
    }
    if (dto.dateOfBirth !== undefined) allowed.dateOfBirth = dto.dateOfBirth?.trim() || null;
    if (dto.gradeId !== undefined) allowed.gradeId = dto.gradeId;
    if (dto.image !== undefined) {
      const image = dto.image?.trim() || null;
      if (image && !image.startsWith(`avatars/${userId}/`)) {
        throw new BadRequestException('image must be your own uploaded avatar');
      }
      allowed.image = image;
    }
    if (
      (dto.landingSlug !== undefined ||
        dto.landingBio !== undefined ||
        dto.landingBanner !== undefined ||
        dto.landingTheme !== undefined ||
        dto.landingPublished !== undefined) &&
      user.role !== 'TEACHER'
    ) {
      throw new BadRequestException('landing pages are only available to teachers');
    }
    if (dto.landingSlug !== undefined) allowed.landingSlug = dto.landingSlug.trim().toLowerCase() || null;
    if (dto.landingBio !== undefined) allowed.landingBio = dto.landingBio.trim() || null;
    if (dto.landingBanner !== undefined) {
      const banner = dto.landingBanner?.trim() || null;
      if (banner && !banner.startsWith(`banners/${userId}/`)) {
        throw new BadRequestException('banner must be your own uploaded image');
      }
      allowed.landingBanner = banner;
    }
    if (dto.landingTheme !== undefined) allowed.landingTheme = dto.landingTheme;
    if (dto.landingPublished !== undefined) allowed.landingPublished = dto.landingPublished;
    if (!Object.keys(allowed).length) return user;
    const [updated] = await db
      .update(users)
      .set(allowed)
      .where(eq(users.id, userId))
      .returning()
      .catch((e) => {
        if (e?.code === '23505') throw new ConflictException('Landing link already taken');
        throw e;
      });
    const oldImage = user.image;
    if (
      allowed.image !== undefined &&
      oldImage &&
      oldImage.startsWith(`avatars/${userId}/`) &&
      oldImage !== updated.image
    ) {
      await this.storage.deleteObject(oldImage);
    }
    const oldBanner = user.landingBanner;
    if (
      allowed.landingBanner !== undefined &&
      oldBanner &&
      oldBanner.startsWith(`banners/${userId}/`) &&
      oldBanner !== updated.landingBanner
    ) {
      await this.storage.deleteObject(oldBanner);
    }
    return updated;
  }

  async me(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    return {
      user,
      avatarUrl: await this.avatarUrl(userId),
      bannerUrl: await this.bannerUrl(userId),
    };
  }

  /** Signed URL for the caller's public banner, or null when unset/unconfigured. */
  async bannerUrl(userId: string): Promise<string | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.landingBanner) return null;
    try {
      return await this.storage.presignedGet(user.landingBanner);
    } catch {
      return null;
    }
  }

  /** Signed URL for the caller's avatar, or null when unset/unconfigured. */
  async avatarUrl(userId: string): Promise<string | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.image) return null;
    try {
      return await this.storage.presignedGet(user.image);
    } catch {
      return null;
    }
  }
}
