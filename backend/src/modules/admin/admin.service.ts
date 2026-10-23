import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { NotificationsService } from '../notifications/notifications.service';
import {
  categories,
  courses,
  grades,
  groupStudents,
  groups,
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
      .where(eq(users.role, 'TEACHER'));
    const [students] = await db
      .select({ c: count() })
      .from(users)
      .where(eq(users.role, 'STUDENT'));
    const [allCourses] = await db.select({ c: count() }).from(courses);
    const [academic] = await db
      .select({ c: count() })
      .from(courses)
      .where(eq(courses.courseType, 'ACADEMIC'));
    const [general] = await db
      .select({ c: count() })
      .from(courses)
      .where(eq(courses.courseType, 'GENERAL'));
    const [allGroups] = await db.select({ c: count() }).from(groups);
    const [activeGroups] = await db
      .select({ c: count() })
      .from(groups)
      .where(eq(groups.isActive, true));
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
  }) {
    const conditions = [eq(users.role, 'TEACHER')];
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
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        subjectCategoryId: users.subjectCategoryId,
        subject: { id: categories.id, name: categories.name },
      })
      .from(users)
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(users.name));
  }

  async setUserStatus(
    userId: string,
    isActive: boolean,
    opts: { revokeSessions?: boolean } = {},
  ) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    await db.update(users).set({ isActive }).where(eq(users.id, userId));
    if (!isActive && opts.revokeSessions !== false) {
      // Suspension is a lockout: drop all existing sessions
      await db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`);
    }
    return { ok: true };
  }

  async listStudents(filters: {
    gradeId?: string;
    courseId?: string;
    groupId?: string;
    teacherId?: string;
    search?: string;
  }) {
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
        .where(and(...conditions));
      if (!rows.length) return [];
      groupIds = rows.map((r) => r.groupId);
    }
    if (filters.groupId) groupIds = [filters.groupId];

    const conditions = [eq(users.role, 'STUDENT')];
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
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        gradeId: users.gradeId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
    const memberships = await db
      .select({
        studentId: groupStudents.studentId,
        groupName: groups.name,
        courseId: courses.id,
        courseTitle: courses.title,
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id));
    return students.map((s) => ({
      ...s,
      enrollments: memberships
        .filter((m) => m.studentId === s.id)
        .map((m) => ({ groupName: m.groupName, courseId: m.courseId, courseTitle: m.courseTitle })),
    }));
  }

  async listCourses(filters: {
    courseType?: 'ACADEMIC' | 'GENERAL';
    gradeId?: string;
    categoryId?: string;
    teacherId?: string;
  }) {
    const conditions = [];
    if (filters.courseType)
      conditions.push(eq(courses.courseType, filters.courseType));
    if (filters.gradeId) conditions.push(eq(courses.gradeId, filters.gradeId));
    if (filters.categoryId)
      conditions.push(eq(courses.categoryId, filters.categoryId));
    if (filters.teacherId) conditions.push(eq(courses.teacherId, filters.teacherId));
    const rows = await db
      .select({
        course: courses,
        teacherName: users.name,
      })
      .from(courses)
      .innerJoin(users, eq(courses.teacherId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(courses.createdAt));
    const courseIds = rows.map((r) => r.course.id);
    const groupRows = courseIds.length
      ? await db.select().from(groups).where(inArray(groups.courseId, courseIds))
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

  async adminEnroll(studentId: string, groupId: string) {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw new NotFoundException('Group not found');
    const [user] = await db.select().from(users).where(eq(users.id, studentId));
    if (!user) throw new NotFoundException('Student not found');
    const added = await db
      .insert(groupStudents)
      .values({ groupId, studentId })
      .onConflictDoNothing()
      .returning({ id: groupStudents.id });
    if (added.length) {
      await this.notifications.sendWhatsApp(
        user.phoneNumber ?? '',
        `تم تسجيلك في «${group.name}» بنجاح 🎉`,
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
