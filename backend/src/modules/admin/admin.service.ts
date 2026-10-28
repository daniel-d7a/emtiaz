import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { and, asc, count, countDistinct, desc, eq, ilike, inArray, isNotNull, isNull, lt, or, sql, sum } from 'drizzle-orm';
import { open } from 'fs/promises';
import { logger } from '../../lib/logger';
import { db } from '../../db';
import { alias } from 'drizzle-orm/pg-core';
import { NotificationsService } from '../notifications/notifications.service';
import {
  auditLogs,
  categories,
  courses,
  grades,
  groupStudents,
  groups,
  lessonAttendance,
  lessons,
  modules,
  notifications,
  parentReports,
  parentStudents,
  quizAttempts,
  semesters,
  users,
} from '../../db/schema';

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  constructor(
    private readonly notifications: NotificationsService,
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
      .where(
        and(
          inArray(courses.teacherId, ids),
          isNull(courses.deletedAt),
          isNull(groups.deletedAt),
        ),
      )
      .groupBy(courses.teacherId);
    const numberFor = (
      list: Array<{ teacherId: string; value: number | string }>,
      teacherId: string,
    ) => Number(list.find((row) => row.teacherId === teacherId)?.value ?? 0);
    return rows.map((row) => ({
      ...row,
      courseCount: numberFor(courseCounts, row.id),
      groupCount: numberFor(groupCounts, row.id),
      uniqueStudentCount: numberFor(studentCounts, row.id),
    }));
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
    return rows;
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
    // Revoke access and drop memberships so rosters/grades stop showing the account.
    await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
    await db.delete(groupStudents).where(eq(groupStudents.studentId, userId));
    return { ok: true };
  }

  async updateTeacher(
    teacherId: string,
    dto: { name?: string; phoneNumber?: string; subjectId?: string | null },
  ) {
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER')));
    if (!teacher || teacher.deletedAt) throw new NotFoundException('Teacher not found');
    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phoneNumber !== undefined) patch.phoneNumber = dto.phoneNumber || null;
    if (dto.subjectId !== undefined) patch.subjectCategoryId = dto.subjectId;
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, teacherId))
      .returning()
      .catch((error) => {
        if (error?.code === '23505') throw new ConflictException('Phone number already in use');
        throw error;
      });
    return updated;
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
    return students.map((s) => ({
      ...s,
      enrollments: memberships
        .filter((m) => m.studentId === s.id)
        .map((m) => ({ groupName: m.groupName, courseId: m.courseId, courseTitle: m.courseTitle })),
    }));
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
    if (dto.phoneNumber !== undefined) patch.phoneNumber = dto.phoneNumber;
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
    return updated;
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
    const lessonRows = courseIds.length
      ? await db
          .select({ id: lessons.id, courseId: modules.courseId })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .where(inArray(modules.courseId, courseIds))
      : [];
    const presentRows = lessonRows.length
      ? await db
          .select({ lessonId: lessonAttendance.lessonId })
          .from(lessonAttendance)
          .where(
            and(
              eq(lessonAttendance.studentId, studentId),
              eq(lessonAttendance.isPresent, true),
              inArray(
                lessonAttendance.lessonId,
                lessonRows.map((row) => row.id),
              ),
            ),
          )
      : [];
    const presentLessons = new Set(presentRows.map((row) => row.lessonId));

    const [quiz] = await db
      .select({
        attempts: count(),
        score: sum(quizAttempts.score),
        maxScore: sum(quizAttempts.maxScore),
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId));
    const quizMax = Number(quiz?.maxScore ?? 0);

    return {
      ...student,
      parents,
      groups: groupRows.map((group) => {
        const courseLessons = lessonRows.filter((lesson) => lesson.courseId === group.courseId);
        const present = courseLessons.filter((lesson) => presentLessons.has(lesson.id)).length;
        return {
          ...group,
          attendancePercent: courseLessons.length
            ? Math.round((present / courseLessons.length) * 100)
            : 0,
        };
      }),
      quiz: {
        attempts: Number(quiz?.attempts ?? 0),
        averagePercent: quizMax
          ? Math.round((Number(quiz?.score ?? 0) / quizMax) * 100)
          : 0,
      },
    };
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
    return parents.map((p) => ({
      ...p,
      children: links
        .filter((l) => l.parentId === p.id)
        .map(({ parentId: _parentId, ...child }) => child),
    }));
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
    if (dto.phoneNumber !== undefined) patch.phoneNumber = dto.phoneNumber;
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, parentId))
      .returning()
      .catch((error) => {
        if (error?.code === '23505') throw new ConflictException('Phone number already in use');
        throw error;
      });
    return updated;
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

    return { ...parent, children, feedback: reports, deliveredReports };
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
          .where(inArray(groupStudents.groupId, groupIds))
          .groupBy(groupStudents.groupId)
      : [];
    return rows.map((r) => ({
      ...r.course,
      teacherName: r.teacherName,
      categoryName: r.categoryName,
      gradeName: r.gradeName,
      groups: groupRows
        .filter((g) => g.courseId === r.course.id)
        .map((g) => ({
          ...g,
          studentCount: Number(counts.find((c) => c.groupId === g.id)?.c ?? 0),
        })),
    }));
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
    return course;
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
    return updated;
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
    return db
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
  }

  async listParentLinks(filters: { deleted?: string } = {}) {
    const parent = alias(users, 'parent_user');
    const student = alias(users, 'student_user');
    return db
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
    const [group] = await db
      .select({ group: groups })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groups.id, groupId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      )
      .then((rows) => rows.map((row) => row.group));
    if (!group) throw new NotFoundException('Group not found');
    const [user] = await db.select().from(users).where(eq(users.id, studentId));
    if (!user || user.deletedAt) throw new NotFoundException('Student not found');
    const added = await db
      .insert(groupStudents)
      .values({ groupId, studentId })
      .onConflictDoNothing()
      .returning({ id: groupStudents.id });
    if (added.length) {
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

  async listGrades() {
    return db.select().from(grades).orderBy(asc(grades.displayOrder));
  }
  async createGrade(name: string, displayOrder?: number) {
    const [row] = await db
      .insert(grades)
      .values({ name, displayOrder: displayOrder ?? 0 })
      .returning();
    return row;
  }
  async updateGrade(id: string, dto: { name?: string; displayOrder?: number }) {
    const [row] = await db
      .update(grades)
      .set(dto)
      .where(eq(grades.id, id))
      .returning();
    if (!row) throw new NotFoundException('Grade not found');
    return row;
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
    return db.select().from(categories).orderBy(asc(categories.name));
  }
  async createCategory(name: string) {
    const [row] = await db.insert(categories).values({ name }).returning();
    return row;
  }
  async updateCategory(id: string, name: string) {
    const [row] = await db
      .update(categories)
      .set({ name })
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new NotFoundException('Category not found');
    return row;
  }
  async deleteCategory(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
    return { ok: true };
  }
}
