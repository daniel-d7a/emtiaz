import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { and, asc, count, countDistinct, desc, eq, gt, ilike, inArray, isNotNull, isNull, lt, or, sql, sum } from 'drizzle-orm';
import { open } from 'fs/promises';
import { logger } from '../../lib/logger';
import { db } from '../../db';
import { alias } from 'drizzle-orm/pg-core';
import { NotificationsService } from '../notifications/notifications.service';
import {
  checkAndUnlockReferralReward,
  TeacherEntitlementsService,
} from '../teacher/teacher-entitlements.service';
import {
  accounts,
  adminRoles,
  auditLogs,
  categories,
  courses,
  grades,
  groupLessonAccess,
  groupStudents,
  groups,
  lessonAttendance,
  lessons,
  modules,
  notifications,
  parentReports,
  parentStudents,
  plans,
  promoCodes,
  quizAttempts,
  semesters,
  teacherDiscounts,
  teacherGifts,
  teacherSubscriptions,
  users,
} from '../../db/schema';
import type { ResetUserPasswordResultDto } from '../../../../shared/api';
import { type AuditCategory, getActionsForCategory } from '../../../../shared/audit-events';
import type { AdminPermission } from '../../lib/admin-permissions';
import {
  serializeAdminAuditEntry,
  serializeAdminCourseRow,
  serializeAdminDeliveredReport,
  serializeAdminGroupRow,
  serializeAdminParentChild,
  serializeAdminParentLink,
  serializeAdminParentProfile,
  serializeAdminParentReport,
  serializeAdminParentRow,
  serializeAdminRole,
  serializeAdminStudentProfile,
  serializeAdminStudentRow,
  serializeAdminTeacherRow,
  serializeAdminUser,
  serializeCategory,
  serializeCourse,
  serializeGrade,
  serializeUser,
} from '../../lib/serializers';

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  constructor(
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => TeacherEntitlementsService))
    private readonly entitlements: TeacherEntitlementsService,
  ) {}

  async overview() {
    const [teachers] = await db
      .select({ c: count() })
      .from(users)
      .where(and(eq(users.role, 'TEACHER'), isNull(users.deletedAt)));
    const [students] = await db
      .select({ c: count() })
      .from(users)
      .where(and(eq(users.role, 'STUDENT'), isNull(users.deletedAt)));
    const [allCourses] = await db
      .select({ c: count() })
      .from(courses)
      .where(isNull(courses.deletedAt));
    const [academic] = await db
      .select({ c: count() })
      .from(courses)
      .where(and(eq(courses.courseType, 'ACADEMIC'), isNull(courses.deletedAt)));
    const [general] = await db
      .select({ c: count() })
      .from(courses)
      .where(and(eq(courses.courseType, 'GENERAL'), isNull(courses.deletedAt)));
    const [allGroups] = await db
      .select({ c: count() })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(and(isNull(groups.deletedAt), isNull(courses.deletedAt)));
    const [activeGroups] = await db
      .select({ c: count() })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groups.isActive, true),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    return {
      totalTeachers: Number(teachers.c),
      totalStudents: Number(students.c),
      totalCourses: Number(allCourses.c),
      academicCourses: Number(academic.c),
      generalCourses: Number(general.c),
      totalGroups: Number(allGroups.c),
      activeGroups: Number(activeGroups.c),
    };
  }

  async listTeachers(filters: {
    status?: 'ACTIVE' | 'SUSPENDED';
    search?: string;
    name?: string;
    phone?: string;
    subjectId?: string;
    deleted?: string;
    limit?: string;
  }) {
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    const deleted = filters.deleted === 'true';
    const conditions = [
      eq(users.role, 'TEACHER'),
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
    ];
    if (filters.status === 'ACTIVE') conditions.push(eq(users.isActive, true));
    if (filters.status === 'SUSPENDED') conditions.push(eq(users.isActive, false));
    if (filters.subjectId) conditions.push(eq(users.subjectCategoryId, filters.subjectId));
    if (filters.name) conditions.push(ilike(users.name, `%${filters.name}%`));
    if (filters.phone) conditions.push(ilike(users.phoneNumber, `%${filters.phone}%`));
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.phoneNumber, `%${filters.search}%`),
        )!,
      );
    }
    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
        landingSlug: users.landingSlug,
        landingPublished: users.landingPublished,
        isTopTeacher: users.isTopTeacher,
        subjectCategoryId: users.subjectCategoryId,
        subject: { id: categories.id, name: categories.name },
      })
      .from(users)
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(users.name));
    const rows = limit ? await query.limit(limit) : await query;
    const ids = rows.map((row) => row.id);
    if (!ids.length) return [];
    const courseCounts = await db
      .select({ teacherId: courses.teacherId, value: count() })
      .from(courses)
      .where(and(inArray(courses.teacherId, ids), isNull(courses.deletedAt)))
      .groupBy(courses.teacherId);
    const groupCounts = await db
      .select({ teacherId: courses.teacherId, value: count() })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          inArray(courses.teacherId, ids),
          isNull(courses.deletedAt),
          isNull(groups.deletedAt),
        ),
      )
      .groupBy(courses.teacherId);
    const studentCounts = await db
      .select({ teacherId: courses.teacherId, value: countDistinct(groupStudents.studentId) })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(
        and(
          inArray(courses.teacherId, ids),
          isNull(courses.deletedAt),
          isNull(groups.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .groupBy(courses.teacherId);
    const numberFor = (
      list: Array<{ teacherId: string; value: number | string }>,
      teacherId: string,
    ) => Number(list.find((row) => row.teacherId === teacherId)?.value ?? 0);
    return rows.map((row) =>
      serializeAdminTeacherRow({
        ...row,
        courseCount: numberFor(courseCounts, row.id),
        groupCount: numberFor(groupCounts, row.id),
        uniqueStudentCount: numberFor(studentCounts, row.id),
      }),
    );
  }

  async onApplicationBootstrap() {
    await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
      .catch((error) => logger.error({ err: error }, 'audit retention cleanup failed'));
  }

  async audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    metadata?: Record<string, unknown>,
    opts: { endpoint?: string; responseType?: string } = {},
  ) {
    try {
      await db.insert(auditLogs).values({
        actorId,
        action,
        targetType,
        targetId,
        endpoint: opts.endpoint,
        responseType: opts.responseType,
        metadata,
      });
    } catch (error) {
      logger.error({ err: error }, 'audit write failed');
    }
  }

  async listAudit(
    limit = 100,
    filters: {
      action?: string;
      actorId?: string;
      userId?: string;
      category?: string;
      actor?: string;
      target?: string;
      actorRole?: string;
      endpoint?: string;
      responseType?: string;
    } = {},
  ) {
    const conditions = [];
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId));
    if (filters.userId) {
      conditions.push(
        or(
          eq(auditLogs.actorId, filters.userId),
          eq(auditLogs.targetId, filters.userId),
        )!,
      );
    }
    if (filters.category) {
      const actions = getActionsForCategory(filters.category as AuditCategory);
      if (actions.length > 0) {
        conditions.push(inArray(auditLogs.action, actions));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    if (filters.actorRole) conditions.push(eq(users.role, filters.actorRole as any));
    if (filters.actor) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.actor}%`),
          ilike(users.email, `%${filters.actor}%`),
          ilike(users.phoneNumber, `%${filters.actor}%`),
        )!,
      );
    }
    if (filters.target) {
      conditions.push(
        or(
          eq(auditLogs.targetType, filters.target),
          ilike(auditLogs.endpoint, `%${filters.target}%`),
        )!,
      );
    }
    if (filters.endpoint) {
      conditions.push(ilike(auditLogs.endpoint, `%${filters.endpoint}%`));
    }
    if (filters.responseType) {
      conditions.push(eq(auditLogs.responseType, filters.responseType));
    }
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        endpoint: auditLogs.endpoint,
        responseType: auditLogs.responseType,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorPhone: users.phoneNumber,
        actorRole: users.role,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.actorId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows.map(serializeAdminAuditEntry);
  }

  async errorTail() {
    const file = process.env.ERROR_LOG_FILE ?? 'logs/error.log';
    try {
      const handle = await open(file, 'r');
      try {
        const { size } = await handle.stat();
        const length = Math.min(size, 256 * 1024);
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, Math.max(0, size - length));
        const lines = buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
        return { file, lines: lines.slice(-500) };
      } finally {
        await handle.close();
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT') return { file, lines: [] };
      throw error;
    }
  }

  async resetUserPassword(
    adminId: string,
    userId: string,
    dto?: { password?: string },
  ): Promise<ResetUserPasswordResultDto> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');

    const passwordToSet =
      dto?.password && dto.password.trim().length >= 8
        ? dto.password.trim()
        : generateTemporaryPassword();

    const hashedPassword = await hashPassword(passwordToSet);

    const existingAccount = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
      .limit(1);

    if (existingAccount.length > 0) {
      await db
        .update(accounts)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(accounts.id, existingAccount[0].id));
    } else {
      await db.insert(accounts).values({
        id: randomUUID(),
        accountId: user.email || user.phoneNumber || user.id,
        providerId: 'credential',
        userId: user.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db
      .update(users)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Revoke all active sessions immediately so an attacker with a stolen cookie cannot persist
    await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);

    await this.audit(adminId, 'user.password.reset', 'user', userId, {
      forcedChange: true,
    });

    return {
      success: true,
      temporaryPassword: passwordToSet,
      userId: user.id,
      userName: user.name,
      userPhone: user.phoneNumber ?? null,
    };
  }

  async setUserStatus(
    userId: string,
    isActive: boolean,
    opts: { revokeSessions?: boolean } = {},
  ) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    if (!isActive && opts.revokeSessions !== false) {
      // Suspension is a lockout: drop all existing sessions
      await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
    }
    return { ok: true };
  }

  async deleteUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    await db
      .update(users)
      .set({ isActive: false, deletedAt: new Date() })
      .where(eq(users.id, userId));
    // Revoke sessions. Group memberships and history are preserved so restoreUser can recover them.
    await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
    return { ok: true };
  }

  async updateTeacher(
    teacherId: string,
    dto: { name?: string; phoneNumber?: string; subjectId?: string | null; isTopTeacher?: boolean },
  ) {
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER')));
    if (!teacher || teacher.deletedAt) throw new NotFoundException('Teacher not found');
    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phoneNumber !== undefined) {
      if (!dto.phoneNumber) throw new BadRequestException('Phone number cannot be cleared');
      patch.phoneNumber = dto.phoneNumber;
      if (teacher.email?.endsWith('@phone.emtiaz.om')) {
        patch.email = `${dto.phoneNumber.replace(/\D/g, '')}@phone.emtiaz.om`;
      }
    }
    if (dto.subjectId !== undefined) patch.subjectCategoryId = dto.subjectId;
    if (dto.isTopTeacher !== undefined) patch.isTopTeacher = dto.isTopTeacher;
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, teacherId))
      .returning()
      .catch((error) => {
        if (error?.code === '23505') throw new ConflictException('Phone number already in use');
        throw error;
      });
    return serializeUser(updated);
  }

  async restoreUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.deletedAt) throw new NotFoundException('Deleted user not found');
    await db
      .update(users)
      .set({ isActive: true, deletedAt: null })
      .where(eq(users.id, userId));
    return { ok: true };
  }

  async listStudents(filters: {
    gradeId?: string;
    courseId?: string;
    groupId?: string;
    teacherId?: string;
    search?: string;
    name?: string;
    phone?: string;
    deleted?: string;
    limit?: string;
  }) {
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    let groupIds: string[] | null = null;
    if (filters.teacherId || filters.courseId) {
      const conditions = [];
      if (filters.teacherId)
        conditions.push(eq(courses.teacherId, filters.teacherId));
      if (filters.courseId) conditions.push(eq(courses.id, filters.courseId));
      const rows = await db
        .select({ groupId: groups.id })
        .from(groups)
        .innerJoin(courses, eq(groups.courseId, courses.id))
        .where(
          and(
            ...conditions,
            isNull(groups.deletedAt),
            isNull(courses.deletedAt),
          ),
        );
      if (!rows.length) return [];
      groupIds = rows.map((r) => r.groupId);
    }
    if (filters.groupId) groupIds = [filters.groupId];

    const deleted = filters.deleted === 'true';
    const conditions = [
      eq(users.role, 'STUDENT'),
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
    ];
    if (filters.gradeId) conditions.push(eq(users.gradeId, filters.gradeId));
    if (filters.name) conditions.push(ilike(users.name, `%${filters.name}%`));
    if (filters.phone) conditions.push(ilike(users.phoneNumber, `%${filters.phone}%`));
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.phoneNumber, `%${filters.search}%`),
        )!,
      );
    }
    if (groupIds) {
      const enrolled = await db
        .select({ studentId: groupStudents.studentId })
        .from(groupStudents)
        .where(inArray(groupStudents.groupId, groupIds));
      const ids = enrolled.map((r) => r.studentId);
      if (!ids.length) return [];
      conditions.push(inArray(users.id, ids));
    }
    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        gradeId: users.gradeId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
    const students = limit ? await query.limit(limit) : await query;
    const memberships = await db
      .select({
        studentId: groupStudents.studentId,
        groupName: groups.name,
        courseId: courses.id,
        courseTitle: courses.title,
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(and(isNull(groups.deletedAt), isNull(courses.deletedAt)));
    return students.map((s) =>
      serializeAdminStudentRow({
        ...s,
        enrollments: memberships
          .filter((m) => m.studentId === s.id)
          .map((m) => ({ groupName: m.groupName, courseId: m.courseId, courseTitle: m.courseTitle })),
      }),
    );
  }

  async updateStudent(
    studentId: string,
    dto: { name?: string; phoneNumber?: string; gradeId?: string | null },
  ) {
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'STUDENT')));
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');
    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phoneNumber !== undefined) {
      if (!dto.phoneNumber) throw new BadRequestException('Phone number cannot be cleared');
      patch.phoneNumber = dto.phoneNumber;
      if (student.email?.endsWith('@phone.emtiaz.om')) {
        patch.email = `${dto.phoneNumber.replace(/\D/g, '')}@phone.emtiaz.om`;
      }
    }
    if (dto.gradeId !== undefined) patch.gradeId = dto.gradeId;
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, studentId))
      .returning()
      .catch((error) => {
        if (error?.code === '23505') throw new ConflictException('Phone number already in use');
        throw error;
      });
    return serializeUser(updated);
  }

  async studentProfile(studentId: string) {
    const [student] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        gradeId: users.gradeId,
        gradeName: grades.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .leftJoin(grades, eq(users.gradeId, grades.id))
      .where(and(eq(users.id, studentId), eq(users.role, 'STUDENT')));
    if (!student) throw new NotFoundException('Student not found');

    const parentUser = alias(users, 'parent_user');
    const teacherUser = alias(users, 'teacher_user');
    const parents = await db
      .select({
        id: parentUser.id,
        name: parentUser.name,
        email: parentUser.email,
        phoneNumber: parentUser.phoneNumber,
      })
      .from(parentStudents)
      .innerJoin(parentUser, eq(parentStudents.parentId, parentUser.id))
      .where(
        and(
          eq(parentStudents.studentId, studentId),
          isNull(parentStudents.deletedAt),
          isNull(parentUser.deletedAt),
        ),
      )
      .orderBy(asc(parentUser.name));

    const groupRows = await db
      .select({
        groupId: groups.id,
        groupName: groups.name,
        courseId: courses.id,
        courseTitle: courses.title,
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        joinedAt: groupStudents.joinedAt,
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .innerJoin(teacherUser, eq(courses.teacherId, teacherUser.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      )
      .orderBy(desc(groupStudents.joinedAt));

    const courseIds = [...new Set(groupRows.map((row) => row.courseId))];
    const groupIds = [...new Set(groupRows.map((row) => row.groupId))];
    const lessonRows = courseIds.length
      ? await db
          .select({ id: lessons.id, courseId: modules.courseId })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .where(inArray(modules.courseId, courseIds))
      : [];

    const hiddenLessonRows = groupIds.length && lessonRows.length
      ? await db
          .select({
            groupId: groupLessonAccess.groupId,
            lessonId: groupLessonAccess.lessonId,
          })
          .from(groupLessonAccess)
          .where(
            and(
              inArray(groupLessonAccess.groupId, groupIds),
              eq(groupLessonAccess.isHidden, true),
              inArray(
                groupLessonAccess.lessonId,
                lessonRows.map((r) => r.id),
              ),
            ),
          )
      : [];
    const hiddenByGroup = new Set(
      hiddenLessonRows.map((r) => `${r.groupId}:${r.lessonId}`),
    );

    const attendanceRecords = lessonRows.length
      ? await db
          .select({
            lessonId: lessonAttendance.lessonId,
            isPresent: lessonAttendance.isPresent,
          })
          .from(lessonAttendance)
          .where(
            and(
              eq(lessonAttendance.studentId, studentId),
              inArray(
                lessonAttendance.lessonId,
                lessonRows.map((row) => row.id),
              ),
            ),
          )
      : [];
    const attendanceByLesson = new Map(
      attendanceRecords.map((row) => [row.lessonId, row.isPresent]),
    );

    const [quiz] = await db
      .select({
        attempts: count(),
        score: sum(quizAttempts.score),
        maxScore: sum(quizAttempts.maxScore),
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId));
    const quizMax = Number(quiz?.maxScore ?? 0);

    return serializeAdminStudentProfile({
      ...student,
      parents,
      groups: groupRows.map((group) => {
        const visibleLessons = lessonRows.filter(
          (lesson) =>
            lesson.courseId === group.courseId &&
            !hiddenByGroup.has(`${group.groupId}:${lesson.id}`),
        );
        let marked = 0;
        let present = 0;
        for (const lesson of visibleLessons) {
          const isPresent = attendanceByLesson.get(lesson.id);
          if (isPresent !== undefined) {
            marked++;
            if (isPresent) present++;
          }
        }
        return {
          ...group,
          attendancePercent: marked ? Math.round((present / marked) * 100) : 0,
        };
      }),
      quiz: {
        attempts: Number(quiz?.attempts ?? 0),
        averagePercent: quizMax
          ? Math.round((Number(quiz?.score ?? 0) / quizMax) * 100)
          : 0,
      },
    });
  }

  async removeStudentFromGroup(studentId: string, groupId: string) {
    const [membership] = await db
      .select({ id: groupStudents.id })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groupStudents.groupId, groupId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    if (!membership) throw new NotFoundException('Enrollment not found');
    await db
      .delete(groupStudents)
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groupStudents.groupId, groupId),
        ),
      );
    return { ok: true };
  }

  async moveStudentGroup(studentId: string, fromGroupId: string, toGroupId: string) {
    const [toGroup] = await db
      .select({ id: groups.id, isActive: groups.isActive })
      .from(groups)
      .where(and(eq(groups.id, toGroupId), isNull(groups.deletedAt)));
    if (!toGroup) throw new NotFoundException('Target group not found');
    if (!toGroup.isActive) throw new BadRequestException('Group is inactive');
    if (fromGroupId === toGroupId) return { ok: true };
    const [membership] = await db
      .select({ id: groupStudents.id })
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groupStudents.groupId, fromGroupId),
        ),
      );
    if (!membership) throw new NotFoundException('Enrollment not found');
    await this.adminEnroll(studentId, toGroupId);
    await db
      .delete(groupStudents)
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groupStudents.groupId, fromGroupId),
        ),
      );
    return { ok: true };
  }

  async moveStudent(studentId: string, fromGroupId: string, toGroupId: string) {
    return this.moveStudentGroup(studentId, fromGroupId, toGroupId);
  }

  async listParents(filters: {
    search?: string;
    name?: string;
    phone?: string;
    status?: 'ACTIVE' | 'SUSPENDED';
    deleted?: string;
    limit?: string;
  }) {
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    const deleted = filters.deleted === 'true';
    const conditions = [
      eq(users.role, 'PARENT'),
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
    ];
    if (filters.status === 'ACTIVE') conditions.push(eq(users.isActive, true));
    if (filters.status === 'SUSPENDED') conditions.push(eq(users.isActive, false));
    if (filters.name) conditions.push(ilike(users.name, `%${filters.name}%`));
    if (filters.phone) conditions.push(ilike(users.phoneNumber, `%${filters.phone}%`));
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.phoneNumber, `%${filters.search}%`),
        )!,
      );
    }
    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        isActive: users.isActive,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
    const parents = limit ? await query.limit(limit) : await query;
    const parentIds = parents.map((p) => p.id);
    const links = parentIds.length
      ? await db
          .select({
            parentId: parentStudents.parentId,
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(parentStudents)
          .innerJoin(users, eq(parentStudents.studentId, users.id))
          .where(
            and(
              inArray(parentStudents.parentId, parentIds),
              isNull(parentStudents.deletedAt),
              isNull(users.deletedAt),
            ),
          )
      : [];
    return parents.map((p) =>
      serializeAdminParentRow({
        ...p,
        children: links
          .filter((l) => l.parentId === p.id)
          .map(({ parentId: _parentId, ...child }) => child),
      }),
    );
  }

  async updateParent(
    parentId: string,
    dto: { name?: string; phoneNumber?: string },
  ) {
    const [parent] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, parentId), eq(users.role, 'PARENT')));
    if (!parent || parent.deletedAt) throw new NotFoundException('Parent not found');
    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phoneNumber !== undefined) {
      if (!dto.phoneNumber) throw new BadRequestException('Phone number cannot be cleared');
      patch.phoneNumber = dto.phoneNumber;
      if (parent.email?.endsWith('@phone.emtiaz.om')) {
        patch.email = `${dto.phoneNumber.replace(/\D/g, '')}@phone.emtiaz.om`;
      }
    }
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, parentId))
      .returning()
      .catch((error) => {
        if (error?.code === '23505') throw new ConflictException('Phone number already in use');
        throw error;
      });
    return serializeUser(updated);
  }

  async parentProfile(parentId: string) {
    const [parent] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        isActive: users.isActive,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(eq(users.id, parentId), eq(users.role, 'PARENT')));
    if (!parent) throw new NotFoundException('Parent not found');

    const children = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        gradeName: grades.name,
      })
      .from(parentStudents)
      .innerJoin(users, eq(parentStudents.studentId, users.id))
      .leftJoin(grades, eq(users.gradeId, grades.id))
      .where(
        and(
          eq(parentStudents.parentId, parentId),
          isNull(parentStudents.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(asc(users.name));

    const reports = await db
      .select({
        id: parentReports.id,
        studentId: parentReports.studentId,
        studentName: users.name,
        message: parentReports.message,
        createdAt: parentReports.createdAt,
      })
      .from(parentReports)
      .innerJoin(users, eq(parentReports.studentId, users.id))
      .where(eq(parentReports.parentId, parentId))
      .orderBy(desc(parentReports.createdAt))
      .limit(50);

    const recipients = [parent.phoneNumber, parent.email].filter(
      (value): value is string => Boolean(value),
    );
    const deliveredReports = recipients.length
      ? await db
          .select({
            id: notifications.id,
            channel: notifications.channel,
            type: notifications.type,
            recipient: notifications.recipient,
            message: notifications.message,
            status: notifications.status,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(or(...recipients.map((recipient) => eq(notifications.recipient, recipient))))
          .orderBy(desc(notifications.createdAt))
          .limit(50)
      : [];

    return serializeAdminParentProfile({
      ...parent,
      children: children.map(serializeAdminParentChild),
      feedback: reports.map(serializeAdminParentReport),
      deliveredReports: deliveredReports.map(serializeAdminDeliveredReport),
    });
  }

  async linkParentChild(parentId: string, studentId: string) {
    const [parent] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, parentId),
          eq(users.role, 'PARENT'),
          isNull(users.deletedAt),
        ),
      );
    if (!parent) throw new NotFoundException('Parent not found');
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, studentId),
          eq(users.role, 'STUDENT'),
          isNull(users.deletedAt),
        ),
      );
    if (!student) throw new NotFoundException('Student not found');
    await db
      .insert(parentStudents)
      .values({ parentId, studentId })
      .onConflictDoUpdate({
        target: [parentStudents.parentId, parentStudents.studentId],
        set: { deletedAt: null },
      });
    return { ok: true };
  }

  async listCourses(filters: {
    name?: string;
    courseType?: 'ACADEMIC' | 'GENERAL';
    gradeId?: string;
    categoryId?: string;
    teacherId?: string;
    deleted?: string;
    limit?: string;
  }) {
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    const conditions = [
      filters.deleted === 'true' ? isNotNull(courses.deletedAt) : isNull(courses.deletedAt),
    ];
    if (filters.name) conditions.push(ilike(courses.title, `%${filters.name}%`));
    if (filters.courseType)
      conditions.push(eq(courses.courseType, filters.courseType));
    if (filters.gradeId) conditions.push(eq(courses.gradeId, filters.gradeId));
    if (filters.categoryId)
      conditions.push(eq(courses.categoryId, filters.categoryId));
    if (filters.teacherId) conditions.push(eq(courses.teacherId, filters.teacherId));
    const query = db
      .select({
        course: courses,
        teacherName: users.name,
        categoryName: categories.name,
        gradeName: grades.name,
      })
      .from(courses)
      .innerJoin(users, eq(courses.teacherId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .leftJoin(grades, eq(courses.gradeId, grades.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(courses.createdAt));
    const rows = limit ? await query.limit(limit) : await query;
    const courseIds = rows.map((r) => r.course.id);
    const groupRows = courseIds.length
      ? await db
          .select()
          .from(groups)
          .where(and(inArray(groups.courseId, courseIds), isNull(groups.deletedAt)))
      : [];
    const groupIds = groupRows.map((g) => g.id);
    const counts = groupIds.length
      ? await db
          .select({ groupId: groupStudents.groupId, c: count() })
          .from(groupStudents)
          .innerJoin(users, eq(groupStudents.studentId, users.id))
          .where(and(inArray(groupStudents.groupId, groupIds), isNull(users.deletedAt)))
          .groupBy(groupStudents.groupId)
      : [];
    return rows.map((r) =>
      serializeAdminCourseRow({
        course: r.course,
        teacherName: r.teacherName,
        categoryName: r.categoryName,
        gradeName: r.gradeName,
        groups: groupRows
          .filter((g) => g.courseId === r.course.id)
          .map((g) => ({
            id: g.id,
            name: g.name,
            joinCode: g.joinCode,
            studentCount: Number(counts.find((c) => c.groupId === g.id)?.c ?? 0),
          })),
      }),
    );
  }

  async createCourse(dto: {
    title: string;
    teacherId: string;
    courseType: 'ACADEMIC' | 'GENERAL';
    gradeId?: string;
    semester?: string;
    categoryId?: string;
  }) {
    await this.assertTeacher(dto.teacherId);
    if (dto.courseType === 'ACADEMIC' && !dto.gradeId) {
      throw new BadRequestException('Academic courses need a grade');
    }
    if (dto.courseType === 'GENERAL' && !dto.categoryId) {
      throw new BadRequestException('General courses need a specialization');
    }
    const [course] = await db
      .insert(courses)
      .values({
        title: dto.title,
        teacherId: dto.teacherId,
        courseType: dto.courseType,
        gradeId: dto.courseType === 'ACADEMIC' ? dto.gradeId : null,
        categoryId: dto.courseType === 'GENERAL' ? dto.categoryId : null,
        semester: dto.semester?.trim() || null,
      })
      .returning();
    return serializeCourse(course);
  }

  async updateCourse(
    courseId: string,
    dto: {
      title?: string;
      teacherId?: string;
      courseType?: 'ACADEMIC' | 'GENERAL';
      gradeId?: string | null;
      semester?: string | null;
      categoryId?: string | null;
    },
  ) {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course || course.deletedAt) throw new NotFoundException('Course not found');
    if (dto.teacherId) await this.assertTeacher(dto.teacherId);
    const courseType = dto.courseType ?? course.courseType;
    const gradeId = dto.gradeId !== undefined ? dto.gradeId : course.gradeId;
    const categoryId = dto.categoryId !== undefined ? dto.categoryId : course.categoryId;
    if (courseType === 'ACADEMIC' && !gradeId) {
      throw new BadRequestException('Academic courses need a grade');
    }
    if (courseType === 'GENERAL' && !categoryId) {
      throw new BadRequestException('General courses need a specialization');
    }
    const [updated] = await db
      .update(courses)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.semester !== undefined && { semester: dto.semester?.trim() || null }),
        courseType,
        gradeId: courseType === 'ACADEMIC' ? gradeId : null,
        categoryId: courseType === 'GENERAL' ? categoryId : null,
      })
      .where(eq(courses.id, courseId))
      .returning();
    return serializeCourse(updated);
  }

  private async assertTeacher(teacherId: string) {
    const [teacher] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, teacherId),
          eq(users.role, 'TEACHER'),
          isNull(users.deletedAt),
        ),
      );
    if (!teacher) throw new NotFoundException('Teacher not found');
  }

  async listGroups(filters: { deleted?: string; courseId?: string } = {}) {
    const deleted = filters.deleted === 'true';
    const conditions = [
      deleted ? isNotNull(groups.deletedAt) : isNull(groups.deletedAt),
      ...(deleted ? [] : [isNull(courses.deletedAt)]),
    ];
    if (filters.courseId) conditions.push(eq(groups.courseId, filters.courseId));
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        joinCode: groups.joinCode,
        isActive: groups.isActive,
        courseId: groups.courseId,
        courseTitle: courses.title,
        deletedAt: groups.deletedAt,
      })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(asc(groups.name));
    return rows.map(serializeAdminGroupRow);
  }

  async listParentLinks(filters: { deleted?: string } = {}) {
    const parent = alias(users, 'parent_user');
    const student = alias(users, 'student_user');
    const rows = await db
      .select({
        parentId: parentStudents.parentId,
        parentName: parent.name,
        studentId: parentStudents.studentId,
        studentName: student.name,
        deletedAt: parentStudents.deletedAt,
      })
      .from(parentStudents)
      .innerJoin(parent, eq(parentStudents.parentId, parent.id))
      .innerJoin(student, eq(parentStudents.studentId, student.id))
      .where(
        filters.deleted === 'true'
          ? isNotNull(parentStudents.deletedAt)
          : isNull(parentStudents.deletedAt),
      )
      .orderBy(asc(parent.name), asc(student.name));
    return rows.map(serializeAdminParentLink);
  }

  async deleteCourse(courseId: string) {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course || course.deletedAt) throw new NotFoundException('Course not found');
    await db.update(courses).set({ deletedAt: new Date() }).where(eq(courses.id, courseId));
    return { ok: true };
  }

  async restoreCourse(courseId: string) {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course || !course.deletedAt) throw new NotFoundException('Deleted course not found');
    await db.update(courses).set({ deletedAt: null }).where(eq(courses.id, courseId));
    return { ok: true };
  }

  async deleteGroup(groupId: string) {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group || group.deletedAt) throw new NotFoundException('Group not found');
    await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));
    return { ok: true };
  }

  async restoreGroup(groupId: string) {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group || !group.deletedAt) throw new NotFoundException('Deleted group not found');
    await db.update(groups).set({ deletedAt: null }).where(eq(groups.id, groupId));
    return { ok: true };
  }

  async deleteParentLink(parentId: string, studentId: string) {
    const [link] = await db
      .select()
      .from(parentStudents)
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
    if (!link || link.deletedAt) throw new NotFoundException('Parent link not found');
    await db
      .update(parentStudents)
      .set({ deletedAt: new Date() })
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
    return { ok: true };
  }

  async restoreParentLink(parentId: string, studentId: string) {
    const [link] = await db
      .select()
      .from(parentStudents)
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
    if (!link || !link.deletedAt) throw new NotFoundException('Deleted parent link not found');
    await db
      .update(parentStudents)
      .set({ deletedAt: null })
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
    return { ok: true };
  }

  async adminEnroll(studentId: string, groupId: string) {
    const [groupData] = await db
      .select({ group: groups, teacherId: courses.teacherId })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groups.id, groupId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    if (!groupData) throw new NotFoundException('Group not found');
    const group = groupData.group;
    if (!group.isActive) throw new BadRequestException('Group is inactive');
    const [user] = await db.select().from(users).where(eq(users.id, studentId));
    if (!user || user.deletedAt) throw new NotFoundException('Student not found');
    const added = await db
      .insert(groupStudents)
      .values({ groupId, studentId })
      .onConflictDoNothing()
      .returning({ id: groupStudents.id });
    if (added.length) {
      await checkAndUnlockReferralReward(groupData.teacherId);
      const message = `تم تسجيلك في «${group.name}» بنجاح 🎉`;
      await this.notifications.sendWhatsApp(user.phoneNumber ?? '', message, 'ADMIN');
      await this.notifications.sendInApp(studentId, message, 'ADMIN');
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
          this.notifications.sendInApp(p.id, `تم تسجيل ${user.name} في «${group.name}»`, 'PARENT'),
        ),
      );
    }
    return { ok: true };
  }

  // ---------- Taxonomy ----------

  // ---------- Admin roles ----------

  async listAdminRoles() {
    const rows = await db.select().from(adminRoles).orderBy(asc(adminRoles.name));
    return rows.map(serializeAdminRole);
  }
  async createAdminRole(name: string, permissions: AdminPermission[]) {
    const [row] = await db.insert(adminRoles).values({ name, permissions }).returning();
    return serializeAdminRole(row);
  }
  async updateAdminRole(id: string, dto: { name?: string; permissions?: AdminPermission[] }) {
    const [row] = await db
      .update(adminRoles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(adminRoles.id, id))
      .returning();
    if (!row) throw new NotFoundException('Admin role not found');
    return serializeAdminRole(row);
  }
  async listAdmins() {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        adminRoleId: users.adminRoleId,
        adminRoleName: adminRoles.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(adminRoles, eq(users.adminRoleId, adminRoles.id))
      .where(and(eq(users.role, 'ADMIN'), isNull(users.deletedAt)))
      .orderBy(asc(users.name));
    return rows.map(serializeAdminUser);
  }
  async setAdminRole(userId: string, roleId: string | null) {
    if (roleId) {
      const [role] = await db.select({ id: adminRoles.id }).from(adminRoles).where(eq(adminRoles.id, roleId));
      if (!role) throw new NotFoundException('Admin role not found');
    }
    const [row] = await db
      .update(users)
      .set({ adminRoleId: roleId, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.role, 'ADMIN')))
      .returning({ id: users.id, adminRoleId: users.adminRoleId });
    if (!row) throw new NotFoundException('Admin not found');
    return row;
  }

  async listGrades(country?: string) {
    const query = db.select().from(grades);
    const rows =
      country === 'OM' || country === 'EG'
        ? await query
            .where(eq(grades.country, country))
            .orderBy(asc(grades.displayOrder), asc(grades.nameEn))
        : await query.orderBy(asc(grades.country), asc(grades.displayOrder), asc(grades.nameEn));
    return rows.map(serializeGrade);
  }
  async createGrade(dto: {
    name?: string;
    nameAr?: string;
    nameEn?: string;
    country?: 'OM' | 'EG';
    displayOrder?: number;
  }) {
    const nameEn = dto.nameEn?.trim() || dto.name?.trim() || dto.nameAr?.trim() || '';
    const nameAr = dto.nameAr?.trim() || dto.name?.trim() || dto.nameEn?.trim() || '';
    const name = nameEn || nameAr;
    const [row] = await db
      .insert(grades)
      .values({
        name,
        nameAr,
        nameEn,
        country: dto.country ?? 'OM',
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();
    return serializeGrade(row);
  }
  async updateGrade(
    id: string,
    dto: {
      name?: string;
      nameAr?: string;
      nameEn?: string;
      country?: 'OM' | 'EG';
      displayOrder?: number;
    },
  ) {
    const patch: Partial<typeof grades.$inferInsert> = {};
    if (dto.nameEn !== undefined) {
      patch.nameEn = dto.nameEn;
      patch.name = dto.nameEn;
    } else if (dto.name !== undefined) {
      patch.name = dto.name;
      patch.nameEn = dto.name;
    }
    if (dto.nameAr !== undefined) {
      patch.nameAr = dto.nameAr;
      if (!patch.name) {
        const [existing] = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
        if (existing && !existing.nameEn) {
          patch.name = dto.nameAr;
        }
      }
    }
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    const [row] = await db
      .update(grades)
      .set(patch)
      .where(eq(grades.id, id))
      .returning();
    if (!row) throw new NotFoundException('Grade not found');
    return serializeGrade(row);
  }
  async deleteGrade(id: string) {
    await db.delete(grades).where(eq(grades.id, id));
    return { ok: true };
  }
  async listSemesters() {
    return db.select().from(semesters).orderBy(asc(semesters.displayOrder));
  }
  async createSemester(name: string, displayOrder?: number) {
    const [row] = await db
      .insert(semesters)
      .values({ name, displayOrder: displayOrder ?? 0 })
      .returning();
    return row;
  }
  async updateSemester(id: string, dto: { name?: string; displayOrder?: number }) {
    const [row] = await db
      .update(semesters)
      .set(dto)
      .where(eq(semesters.id, id))
      .returning();
    if (!row) throw new NotFoundException('Semester not found');
    return row;
  }
  async deleteSemester(id: string) {
    await db.delete(semesters).where(eq(semesters.id, id));
    return { ok: true };
  }
  async listCategories() {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.nameEn), asc(categories.name));
    return rows.map(serializeCategory);
  }
  async createCategory(dto: { name?: string; nameAr?: string; nameEn?: string }) {
    const nameEn = dto.nameEn?.trim() || dto.name?.trim() || dto.nameAr?.trim() || '';
    const nameAr = dto.nameAr?.trim() || dto.name?.trim() || dto.nameEn?.trim() || '';
    const name = nameEn || nameAr;
    const [row] = await db
      .insert(categories)
      .values({ name, nameAr, nameEn })
      .returning();
    return serializeCategory(row);
  }
  async updateCategory(id: string, dto: { name?: string; nameAr?: string; nameEn?: string }) {
    const patch: Partial<typeof categories.$inferInsert> = {};
    if (dto.nameEn !== undefined) {
      patch.nameEn = dto.nameEn;
      patch.name = dto.nameEn;
    } else if (dto.name !== undefined) {
      patch.name = dto.name;
      patch.nameEn = dto.name;
    }
    if (dto.nameAr !== undefined) {
      patch.nameAr = dto.nameAr;
    }
    const [row] = await db
      .update(categories)
      .set(patch)
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new NotFoundException('Category not found');
    return serializeCategory(row);
  }
  async deleteCategory(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
    return { ok: true };
  }

  // ---------- Plans ----------
  async listPlans() {
    return db
      .select()
      .from(plans)
      .orderBy(asc(plans.tierRank), asc(plans.displayOrder));
  }

  async createPlan(dto: {
    slug: string;
    tierRank?: number;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
    monthlyPriceOmr?: number;
    yearlyMonthlyPriceOmr?: number;
    monthlyPriceEgp?: number;
    yearlyMonthlyPriceEgp?: number;
    maxStudents?: number | null;
    maxStorageBytes?: number | null;
    maxGroups?: number | null;
    trialDays?: number;
    isPublic?: boolean;
    isDefault?: boolean;
    displayOrder?: number;
  }) {
    const [existing] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.slug, dto.slug))
      .limit(1);

    if (existing) {
      throw new ConflictException('Plan with this slug already exists');
    }

    const [row] = await db
      .insert(plans)
      .values({
        slug: dto.slug,
        tierRank: dto.tierRank ?? 0,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        descriptionAr: dto.descriptionAr ?? null,
        descriptionEn: dto.descriptionEn ?? null,
        monthlyPriceOmr: dto.monthlyPriceOmr ?? 0,
        yearlyMonthlyPriceOmr: dto.yearlyMonthlyPriceOmr ?? 0,
        monthlyPriceEgp: dto.monthlyPriceEgp ?? 0,
        yearlyMonthlyPriceEgp: dto.yearlyMonthlyPriceEgp ?? 0,
        maxStudents: dto.maxStudents ?? null,
        maxStorageBytes: dto.maxStorageBytes ?? null,
        maxGroups: dto.maxGroups ?? null,
        trialDays: dto.trialDays ?? 0,
        isPublic: dto.isPublic ?? false,
        isDefault: dto.isDefault ?? false,
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();

    return row;
  }

  async updatePlan(
    id: string,
    dto: {
      tierRank?: number;
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string | null;
      descriptionEn?: string | null;
      monthlyPriceOmr?: number;
      yearlyMonthlyPriceOmr?: number;
      monthlyPriceEgp?: number;
      yearlyMonthlyPriceEgp?: number;
      maxStudents?: number | null;
      maxStorageBytes?: number | null;
      maxGroups?: number | null;
      trialDays?: number;
      isPublic?: boolean;
      isDefault?: boolean;
      displayOrder?: number;
    },
  ) {
    const [row] = await db
      .update(plans)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException('Plan not found');
    }

    return row;
  }

  // ---------- Promo Codes ----------
  async listPromoCodes() {
    const rows = await db
      .select({
        id: promoCodes.id,
        code: promoCodes.code,
        planId: promoCodes.planId,
        planSlug: plans.slug,
        planNameAr: plans.nameAr,
        planNameEn: plans.nameEn,
        durationDays: promoCodes.durationDays,
        maxUses: promoCodes.maxUses,
        usedCount: promoCodes.usedCount,
        expiresAt: promoCodes.expiresAt,
        isActive: promoCodes.isActive,
        createdAt: promoCodes.createdAt,
      })
      .from(promoCodes)
      .innerJoin(plans, eq(promoCodes.planId, plans.id))
      .orderBy(desc(promoCodes.createdAt));

    return rows.map((r) => ({
      ...r,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createPromoCode(dto: {
    code: string;
    planId: string;
    durationDays: number;
    maxUses?: number | null;
    expiresAt?: string | null;
  }) {
    const code = dto.code.trim().toUpperCase();
    const [existing] = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(eq(promoCodes.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException('Promo code already exists');
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, dto.planId))
      .limit(1);

    if (!plan) {
      throw new NotFoundException('Target plan not found');
    }

    const [row] = await db
      .insert(promoCodes)
      .values({
        code,
        planId: dto.planId,
        durationDays: dto.durationDays,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      })
      .returning();

    return {
      id: row.id,
      code: row.code,
      planId: row.planId,
      planSlug: plan.slug,
      planNameAr: plan.nameAr,
      planNameEn: plan.nameEn,
      durationDays: row.durationDays,
      maxUses: row.maxUses,
      usedCount: row.usedCount,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async updatePromoCode(
    id: string,
    dto: {
      isActive?: boolean;
      maxUses?: number | null;
      expiresAt?: string | null;
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.maxUses !== undefined) patch.maxUses = dto.maxUses;
    if (dto.expiresAt !== undefined) {
      patch.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const [row] = await db
      .update(promoCodes)
      .set(patch)
      .where(eq(promoCodes.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException('Promo code not found');
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, row.planId))
      .limit(1);

    return {
      id: row.id,
      code: row.code,
      planId: row.planId,
      planSlug: plan?.slug ?? '',
      planNameAr: plan?.nameAr ?? '',
      planNameEn: plan?.nameEn ?? '',
      durationDays: row.durationDays,
      maxUses: row.maxUses,
      usedCount: row.usedCount,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // ---------- Teacher Entitlements & Drawer ----------
  async getTeacherEntitlements(teacherId: string) {
    const [teacher] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        country: users.country,
      })
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER'), isNull(users.deletedAt)))
      .limit(1);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const entitlements = await this.entitlements.getEntitlements(teacherId);

    const discounts = await db
      .select()
      .from(teacherDiscounts)
      .where(eq(teacherDiscounts.teacherId, teacherId))
      .orderBy(desc(teacherDiscounts.createdAt));

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      teacherPhone: teacher.phoneNumber,
      country: teacher.country,
      currency: entitlements.currency,
      activePlan: entitlements.activePlan,
      usage: entitlements.usage,
      isLockedOut: entitlements.isLockedOut,
      savedGifts: entitlements.savedGifts,
      referral: entitlements.referral,
      discounts: discounts.map((d) => ({
        id: d.id,
        occasion: d.occasion,
        planSlug: d.planSlug,
        referenceId: d.referenceId,
        description: d.description,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async assignTeacherSubscription(
    teacherId: string,
    dto: {
      planId: string;
      currency: 'OMR' | 'EGP';
      billingCycle: 'MONTHLY' | 'YEARLY';
      durationDays?: number | null;
      pricePaid?: number | null;
      recordLimitCrossingDiscount?: boolean;
    },
    actorId: string,
  ) {
    const [teacher] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER'), isNull(users.deletedAt)))
      .limit(1);
    if (!teacher) throw new NotFoundException('Teacher not found');

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, dto.planId))
      .limit(1);
    if (!plan) throw new NotFoundException('Plan not found');

    const durationDays = dto.durationDays ?? (dto.billingCycle === 'YEARLY' ? 365 : 30);
    const pricePaid =
      dto.pricePaid ??
      (dto.currency === 'OMR'
        ? dto.billingCycle === 'YEARLY'
          ? plan.yearlyMonthlyPriceOmr * 12
          : plan.monthlyPriceOmr
        : dto.billingCycle === 'YEARLY'
          ? plan.yearlyMonthlyPriceEgp * 12
          : plan.monthlyPriceEgp);

    const sub = await db.transaction(async (tx) => {
      const [activeSub] = await tx
        .select()
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, teacherId),
            gt(teacherSubscriptions.endsAt, sql`now()`),
          ),
        )
        .orderBy(desc(teacherSubscriptions.endsAt))
        .limit(1);

      const now = new Date();
      const baseTime =
        activeSub?.endsAt && activeSub.endsAt.getTime() > now.getTime()
          ? activeSub.endsAt.getTime()
          : now.getTime();
      const endsAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000);

      const [created] = await tx
        .insert(teacherSubscriptions)
        .values({
          teacherId,
          planId: plan.id,
          planSlug: plan.slug,
          tierRank: plan.tierRank,
          planNameAr: plan.nameAr,
          planNameEn: plan.nameEn,
          pricePaid,
          currency: dto.currency,
          billingCycle: dto.billingCycle,
          maxStudents: plan.maxStudents,
          maxStorageBytes: plan.maxStorageBytes,
          maxGroups: plan.maxGroups,
          startsAt: now,
          endsAt,
          source: 'ADMIN_PAID',
          giftsAppliedInCycle: 0,
        })
        .returning();

      // Ensure teacher gets a referral code for paid subscription
      await this.entitlements.ensureTeacherReferralCode(teacherId, tx);

      if (dto.recordLimitCrossingDiscount) {
        const occasion = `LIMIT_CROSS_${plan.slug.toUpperCase().replace(/-/g, '_')}`;
        await tx.insert(teacherDiscounts).values({
          teacherId,
          occasion,
          planSlug: plan.slug,
          referenceId: created.id,
          description: 'Admin limit-crossing discount assignment',
        });
      }

      return created;
    });

    await this.audit(actorId, 'teacher.subscription.assign', 'teacher_subscription', sub.id, {
      teacherId,
      planId: plan.id,
      planSlug: plan.slug,
      billingCycle: dto.billingCycle,
      currency: dto.currency,
      pricePaid,
      durationDays,
      recordLimitCrossingDiscount: !!dto.recordLimitCrossingDiscount,
    });

    return sub;
  }

  async grantTeacherGift(
    teacherId: string,
    dto: {
      planId: string;
      durationDays: number;
      adminOverride?: boolean;
      note?: string;
    },
    actorId: string,
  ) {
    const [teacher] = await db
      .select({ id: users.id, country: users.country })
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER'), isNull(users.deletedAt)))
      .limit(1);
    if (!teacher) throw new NotFoundException('Teacher not found');

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, dto.planId))
      .limit(1);
    if (!plan) throw new NotFoundException('Plan not found');

    const currency = teacher.country === 'EG' ? 'EGP' : 'OMR';

    const result = await db.transaction(async (tx) => {
      const [activeSub] = await tx
        .select()
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, teacherId),
            gt(teacherSubscriptions.endsAt, sql`now()`),
          ),
        )
        .orderBy(desc(teacherSubscriptions.endsAt), desc(teacherSubscriptions.tierRank))
        .limit(1);

      if (!dto.adminOverride) {
        if (activeSub) {
          if (activeSub.planSlug === plan.slug) {
            if (activeSub.source === 'ADMIN_PAID' && activeSub.giftsAppliedInCycle >= 1) {
              throw new BadRequestException('Teacher has already applied a gift in this billing cycle');
            }
          } else {
            const [savedCountRes] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(teacherGifts)
              .where(eq(teacherGifts.teacherId, teacherId));
            if (Number(savedCountRes?.count ?? 0) >= 3) {
              throw new BadRequestException('Maximum of 3 saved gifts reached');
            }
          }
        }
      }

      let action: 'ACTIVATED' | 'EXTENDED' | 'SAVED';

      if (!activeSub) {
        action = 'ACTIVATED';
        const now = new Date();
        const endsAt = new Date(now.getTime() + dto.durationDays * 24 * 60 * 60 * 1000);
        await tx.insert(teacherSubscriptions).values({
          teacherId,
          planId: plan.id,
          planSlug: plan.slug,
          tierRank: plan.tierRank,
          planNameAr: plan.nameAr,
          planNameEn: plan.nameEn,
          pricePaid: 0,
          currency,
          billingCycle: 'TRIAL',
          maxStudents: plan.maxStudents,
          maxStorageBytes: plan.maxStorageBytes,
          maxGroups: plan.maxGroups,
          startsAt: now,
          endsAt,
          source: 'ADMIN_TRIAL',
          giftsAppliedInCycle: 1,
        });
      } else if (activeSub.planSlug === plan.slug) {
        action = 'EXTENDED';
        const baseTime =
          activeSub.endsAt && activeSub.endsAt.getTime() > Date.now()
            ? activeSub.endsAt.getTime()
            : Date.now();
        const newEndsAt = new Date(baseTime + dto.durationDays * 24 * 60 * 60 * 1000);
        await tx
          .update(teacherSubscriptions)
          .set({
            endsAt: newEndsAt,
            giftsAppliedInCycle: activeSub.giftsAppliedInCycle + 1,
          })
          .where(eq(teacherSubscriptions.id, activeSub.id));
      } else {
        if (dto.adminOverride) {
          action = 'ACTIVATED';
          const now = new Date();
          const baseTime =
            activeSub.endsAt && activeSub.endsAt.getTime() > now.getTime()
              ? activeSub.endsAt.getTime()
              : now.getTime();
          const endsAt = new Date(baseTime + dto.durationDays * 24 * 60 * 60 * 1000);
          await tx.insert(teacherSubscriptions).values({
            teacherId,
            planId: plan.id,
            planSlug: plan.slug,
            tierRank: plan.tierRank,
            planNameAr: plan.nameAr,
            planNameEn: plan.nameEn,
            pricePaid: 0,
            currency,
            billingCycle: 'TRIAL',
            maxStudents: plan.maxStudents,
            maxStorageBytes: plan.maxStorageBytes,
            maxGroups: plan.maxGroups,
            startsAt: now,
            endsAt,
            source: 'ADMIN_TRIAL',
            giftsAppliedInCycle: 1,
          });
        } else {
          action = 'SAVED';
          await tx.insert(teacherGifts).values({
            teacherId,
            planId: plan.id,
            planSlug: plan.slug,
            tierRank: plan.tierRank,
            planNameAr: plan.nameAr,
            planNameEn: plan.nameEn,
            durationDays: dto.durationDays,
            source: 'ADMIN_TRIAL',
            sourceRef: dto.note || null,
          });
        }
      }

      await tx.insert(teacherDiscounts).values({
        teacherId,
        occasion: 'ADMIN_TRIAL',
        planSlug: plan.slug,
        description:
          dto.note ||
          `Admin granted ${dto.durationDays} gift days (${dto.adminOverride ? 'Override' : 'Standard'})`,
      });

      return {
        success: true,
        action,
        planNameAr: plan.nameAr,
        planNameEn: plan.nameEn,
        durationDays: dto.durationDays,
      };
    });

    await this.audit(actorId, 'teacher.gift.grant', 'user', teacherId, {
      planId: plan.id,
      planSlug: plan.slug,
      durationDays: dto.durationDays,
      adminOverride: !!dto.adminOverride,
      note: dto.note,
    });

    return result;
  }
}

function generateTemporaryPassword(): string {
  // 64-char set (alphanumeric + safe symbols) provides exactly 6 bits per character.
  // 10 chars = 60 bits of CSPRNG entropy, preceded by 'Emtiaz#'.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += chars[randomInt(0, chars.length)];
  }
  return `Emtiaz#${rand}`;
}

