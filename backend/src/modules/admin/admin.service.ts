import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
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
  parentStudents,
  users,
} from '../../db/schema';

@Injectable()
export class AdminService {
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
        subjectCategoryId: users.subjectCategoryId,
        subject: { id: categories.id, name: categories.name },
      })
      .from(users)
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(users.name));
    return limit ? query.limit(limit) : query;
  }

  async audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    metadata?: Record<string, unknown>,
  ) {
    await db.insert(auditLogs).values({
      actorId,
      action,
      targetType,
      targetId,
      metadata,
    });
  }

  async listAudit(
    limit = 100,
    filters: { action?: string; actorId?: string } = {},
  ) {
    const conditions = [];
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId));
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.actorId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows;
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

  async listParents(filters: { search?: string; status?: 'ACTIVE' | 'SUSPENDED'; deleted?: string; limit?: string }) {
    const limit = Math.min(Math.max(Number(filters.limit) || 0, 0), 200);
    const deleted = filters.deleted === 'true';
    const conditions = [
      eq(users.role, 'PARENT'),
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
    ];
    if (filters.status === 'ACTIVE') conditions.push(eq(users.isActive, true));
    if (filters.status === 'SUSPENDED') conditions.push(eq(users.isActive, false));
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

  async listCourses(filters: {
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
      })
      .from(courses)
      .innerJoin(users, eq(courses.teacherId, users.id))
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
      groups: groupRows
        .filter((g) => g.courseId === r.course.id)
        .map((g) => ({
          ...g,
          studentCount: Number(counts.find((c) => c.groupId === g.id)?.c ?? 0),
        })),
    }));
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
