import { Injectable, BadRequestException, ConflictException, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../../db';
import { auth } from '../../auth/auth';
import { categories, courses, grades, groupStudents, groups, parentStudents, teacherGrades, users } from '../../db/schema';
import * as schema from '../../db/schema';
import { normalizePhone, isValidPhoneForCountry } from '../../lib/phone';
import { joinGroupByCode, genJoinCode, generateUniqueMonitoringCode } from '../../lib/group-join';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { ParentService } from '../parent/parent.service';
import { serializeCategory, serializeCourse, serializeGrade, serializeGroup, serializeMe, serializeUser } from '../../lib/serializers';
import { seedTaxonomy } from '../../db/seed-taxonomy';

export { genJoinCode };

@Injectable()
export class OnboardingService implements OnApplicationBootstrap {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly parents: ParentService,
  ) {}

  async onApplicationBootstrap() {
    await seedTaxonomy(db);
  }

  async checkAvailability(dto: {
    email?: string;
    phoneNumber?: string;
    country?: schema.Country;
  }): Promise<{
    available: boolean;
    field?: 'email' | 'phoneNumber';
    reason?: string;
  }> {
    if (dto.email !== undefined && dto.email.trim() !== '') {
      const email = dto.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
          available: false,
          field: 'email',
          reason: 'Invalid email address',
        };
      }
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (taken) {
        return {
          available: false,
          field: 'email',
          reason: 'Email is already registered',
        };
      }
    }

    if (dto.phoneNumber !== undefined && dto.phoneNumber.trim() !== '') {
      const country = dto.country ?? 'OM';
      const normalized = normalizePhone(dto.phoneNumber.trim(), country);
      if (!isValidPhoneForCountry(normalized, country)) {
        return {
          available: false,
          field: 'phoneNumber',
          reason: 'Invalid phone number for selected country',
        };
      }
      const syntheticEmail = `${normalized.replace(/\D/g, '')}@phone.emtiaz.om`;
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          or(
            eq(users.phoneNumber, normalized),
            eq(users.email, syntheticEmail),
          ),
        )
        .limit(1);
      if (taken) {
        return {
          available: false,
          field: 'phoneNumber',
          reason: 'Phone number is already registered',
        };
      }
    }

    return { available: true };
  }

  /** Adds the given student to a group identified by its join code. */
  async joinByCode(studentId: string, joinCode: string, entryCode?: string) {
    const { group, course, enrolled } = await joinGroupByCode(
      studentId,
      joinCode,
      entryCode,
    );
    if (enrolled) await this.notifyEnrolled(studentId, group);
    return { group: serializeGroup(group), course: serializeCourse(course) };
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
      .where(
        or(
          ilike(categories.name, trimmed),
          ilike(categories.nameAr, trimmed),
          ilike(categories.nameEn, trimmed),
        ),
      )
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(categories)
      .values({ name: trimmed, nameAr: trimmed, nameEn: trimmed })
      .returning();
    return created;
  }

  /** Free-text grade from signup/profile forms normalizes into country-scoped grades. */
  async ensureGrade(name: string, country: schema.Country = 'OM') {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('grade name is required');
    const [existing] = await db
      .select()
      .from(grades)
      .where(
        and(
          eq(grades.country, country),
          or(
            ilike(grades.name, trimmed),
            ilike(grades.nameAr, trimmed),
            ilike(grades.nameEn, trimmed),
          ),
        ),
      )
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(grades)
      .values({
        country,
        name: trimmed,
        nameAr: trimmed,
        nameEn: trimmed,
        displayOrder: 99,
      })
      .returning();
    return created;
  }

  async syncTeacherGrades(
    teacherId: string,
    country: schema.Country,
    gradeIds?: string[],
    customGrades?: string[],
  ) {
    const resolvedIds = new Set<string>();
    if (gradeIds?.length) {
      const validRows = await db
        .select({ id: grades.id })
        .from(grades)
        .where(inArray(grades.id, gradeIds));
      for (const row of validRows) {
        resolvedIds.add(row.id);
      }
    }
    if (customGrades?.length) {
      for (const custom of customGrades) {
        if (custom.trim()) {
          const grade = await this.ensureGrade(custom, country);
          resolvedIds.add(grade.id);
        }
      }
    }
    await db.delete(teacherGrades).where(eq(teacherGrades.teacherId, teacherId));
    if (resolvedIds.size > 0) {
      await db
        .insert(teacherGrades)
        .values([...resolvedIds].map((gradeId) => ({ teacherId, gradeId })))
        .onConflictDoNothing();
    }
  }

  async getTeacherGrades(teacherId: string) {
    const rows = await db
      .select({ grade: grades })
      .from(teacherGrades)
      .innerJoin(grades, eq(teacherGrades.gradeId, grades.id))
      .where(eq(teacherGrades.teacherId, teacherId))
      .orderBy(asc(grades.displayOrder), asc(grades.nameEn));
    return rows.map((r) => serializeGrade(r.grade));
  }

  async createStudent(dto: {
    name: string;
    password: string;
    phoneNumber: string;
    country?: schema.Country;
    email?: string;
    gradeId?: string;
  }) {
    const country = dto.country ?? 'OM';
    const email = dto.email?.trim()
      ? dto.email.trim().toLowerCase()
      : `${dto.phoneNumber.replace(/[^\d]/g, '')}@phone.emtiaz.om`;
    const monitoringCode = await generateUniqueMonitoringCode();
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email,
        password: dto.password,
        role: 'STUDENT',
        country,
        phoneNumber: dto.phoneNumber,
        gradeId: dto.gradeId,
        monitoringCode,
      },
      returnHeaders: true,
    });
    await db.update(users).set({ monitoringCode }).where(eq(users.id, data.response.user.id));
    const [user] = await db.select().from(users).where(eq(users.id, data.response.user.id));
    return serializeUser(user);
  }

  async createParent(dto: {
    name: string;
    email?: string;
    password: string;
    phoneNumber: string;
    country?: schema.Country;
    monitoringCode?: string;
    studentPhone?: string;
  }) {
    const country = dto.country ?? 'OM';
    if (dto.monitoringCode) await this.parents.resolveStudentByCode(dto.monitoringCode);
    const email = dto.email?.trim()
      ? dto.email.trim().toLowerCase()
      : `${dto.phoneNumber.replace(/[^\d]/g, '')}@phone.emtiaz.om`;
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email,
        password: dto.password,
        role: 'PARENT',
        country,
        phoneNumber: dto.phoneNumber,
      },
      returnHeaders: true,
    });
    const parentId = data.response.user.id;
    if (dto.monitoringCode) {
      await this.parents.linkByCode(parentId, dto.monitoringCode);
    } else if (dto.studentPhone?.trim()) {
      const raw = dto.studentPhone.trim();
      const normalized = normalizePhone(raw, country);
      const fallbackNormalized = normalizePhone(raw);
      const [student] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'STUDENT'),
            eq(users.isActive, true),
            isNull(users.deletedAt),
            or(
              eq(users.phoneNumber, normalized),
              eq(users.phoneNumber, fallbackNormalized),
              eq(users.monitoringCode, raw.toUpperCase()),
            ),
          ),
        )
        .limit(1);
      if (student) {
        await db
          .insert(parentStudents)
          .values({ parentId, studentId: student.id })
          .onConflictDoUpdate({
            target: [parentStudents.parentId, parentStudents.studentId],
            set: { deletedAt: null },
          });
      }
    }
    const [user] = await db.select().from(users).where(eq(users.id, parentId));
    return serializeUser(user);
  }

  async createTeacher(dto: {
    name: string;
    email?: string;
    password: string;
    phoneNumber: string;
    country?: schema.Country;
    courseFocus?: 'ACADEMIC' | 'GENERAL';
    gradeIds?: string[];
    customGrades?: string[];
    subject?: string;
  }) {
    const country = dto.country ?? 'OM';
    const courseFocus = dto.courseFocus ?? 'ACADEMIC';
    const subjectCategoryId = dto.subject?.trim()
      ? (await this.ensureCategory(dto.subject)).id
      : undefined;
    const email = dto.email?.trim()
      ? dto.email.trim().toLowerCase()
      : `${dto.phoneNumber.replace(/[^\d]/g, '')}@phone.emtiaz.om`;
    const data = await auth.api.signUpEmail({
      body: {
        name: dto.name,
        email,
        password: dto.password,
        role: 'TEACHER',
        country,
        courseFocus,
        phoneNumber: dto.phoneNumber,
        subjectCategoryId,
      },
      returnHeaders: true,
    });
    const userId = data.response.user.id;
    await db
      .update(users)
      .set({ courseFocus, ...(subjectCategoryId ? { subjectCategoryId } : {}) })
      .where(eq(users.id, userId));
    if (dto.gradeIds?.length || dto.customGrades?.length) {
      await this.syncTeacherGrades(userId, country, dto.gradeIds, dto.customGrades);
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const taughtGrades = await this.getTeacherGrades(userId);
    return serializeUser(user, taughtGrades);
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
    headers: Headers,
  ) {
    const res = await auth.api.changePassword({
      body: {
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
        revokeOtherSessions: true,
      },
      headers,
      returnHeaders: true,
    });
    await db
      .update(users)
      .set({ mustChangePassword: false })
      .where(eq(users.id, userId));
    return { ok: true, headers: res.headers };
  }

  async listCategories() {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    return rows.map(serializeCategory);
  }

  async listGrades(country?: string) {
    const validCountry = country === 'OM' || country === 'EG' ? country : undefined;
    const rows = validCountry
      ? await db
          .select()
          .from(grades)
          .where(eq(grades.country, validCountry))
          .orderBy(asc(grades.displayOrder), asc(grades.nameEn))
      : await db
          .select()
          .from(grades)
          .orderBy(asc(grades.country), asc(grades.displayOrder), asc(grades.nameEn));
    return rows.map(serializeGrade);
  }

  async updateMe(
    userId: string,
    dto: Partial<{
      name: string;
      phoneNumber: string;
      country: schema.Country;
      courseFocus: 'ACADEMIC' | 'GENERAL';
      gradeIds: string[];
      customGrades: string[];
      subject: string;
      onboardingCompleted: boolean;
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
    const targetCountry = dto.country ?? user.country;
    if (dto.country !== undefined) {
      allowed.country = dto.country;
    }
    if (dto.courseFocus !== undefined) {
      allowed.courseFocus = dto.courseFocus;
    }
    if (dto.onboardingCompleted !== undefined) {
      allowed.onboardingCompletedAt = dto.onboardingCompleted ? new Date() : null;
    }
    if (dto.name !== undefined && dto.name.trim()) allowed.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) {
      const raw = dto.phoneNumber.trim();
      if (!raw) {
        if (user.role !== 'ADMIN') {
          throw new BadRequestException('Phone number cannot be cleared');
        }
        allowed.phoneNumber = null;
      } else {
        const normalized = normalizePhone(raw, targetCountry);
        if (!isValidPhoneForCountry(normalized, targetCountry)) {
          throw new BadRequestException('Invalid phone number for country');
        }
        allowed.phoneNumber = normalized;
        if (user.email?.endsWith('@phone.emtiaz.om')) {
          allowed.email = `${normalized.replace(/\D/g, '')}@phone.emtiaz.om`;
        }
      }
    } else if (dto.country !== undefined && user.phoneNumber) {
      if (!isValidPhoneForCountry(user.phoneNumber, dto.country)) {
        throw new BadRequestException('Current phone number is not valid for the new country');
      }
    }
    if (dto.subject !== undefined && dto.subject.trim()) {
      allowed.subjectCategoryId = (await this.ensureCategory(dto.subject)).id;
    }
    if (dto.gradeIds !== undefined || dto.customGrades !== undefined) {
      await this.syncTeacherGrades(userId, targetCountry, dto.gradeIds, dto.customGrades);
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
    if (dto.landingSlug !== undefined) {
      const slug = dto.landingSlug.trim().toLowerCase() || null;
      if (slug) {
        const [taken] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.landingSlug, slug), ne(users.id, userId)))
          .limit(1);
        if (taken) throw new ConflictException('Landing link already taken');
      }
      allowed.landingSlug = slug;
    }
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
    if (!Object.keys(allowed).length) {
      const taughtGrades = user.role === 'TEACHER' ? await this.getTeacherGrades(userId) : undefined;
      return serializeUser(user, taughtGrades);
    }
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
    const taughtGrades = updated.role === 'TEACHER' ? await this.getTeacherGrades(userId) : undefined;
    return serializeUser(updated, taughtGrades);
  }

  async me(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    const taughtGrades = user.role === 'TEACHER' ? await this.getTeacherGrades(userId) : [];
    return serializeMe(
      user,
      await this.avatarUrl(userId),
      await this.bannerUrl(userId),
      taughtGrades,
    );
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
