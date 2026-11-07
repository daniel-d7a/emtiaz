import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../db';
import {
  groupLessonAccess,
  lessonAttendance,
  lessons,
  modules,
  parentReports,
  parentStudents,
  users,
} from '../../db/schema';
import { StudentService } from '../student/student.service';

@Injectable()
export class ParentService {
  constructor(private readonly students: StudentService) {}

  /**
   * Resolves an active student by monitoring code.
   */
  async resolveStudentByCode(monitoringCode: string) {
    const code = monitoringCode.trim().toUpperCase();
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.monitoringCode, code),
          eq(users.role, 'STUDENT'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!student) throw new NotFoundException('No active student with this code');
    return student;
  }

  /** Links a parent to a student using the student's monitoring code. */
  async linkByCode(parentId: string, monitoringCode: string) {
    const student = await this.resolveStudentByCode(monitoringCode);
    await db
      .insert(parentStudents)
      .values({ parentId, studentId: student.id })
      .onConflictDoUpdate({
        target: [parentStudents.parentId, parentStudents.studentId],
        set: { deletedAt: null },
      });
    return student;
  }

  async myStudents(parentId: string) {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        gradeId: users.gradeId,
      })
      .from(parentStudents)
      .innerJoin(users, eq(parentStudents.studentId, users.id))
      .where(
        and(
          eq(parentStudents.parentId, parentId),
          isNull(parentStudents.deletedAt),
          isNull(users.deletedAt),
        ),
      );

    return Promise.all(
      rows.map(async (student) => {
        const groups = await this.students.myGroups(student.id);
        const [reports, withAttendance] = await Promise.all([
          db
            .select({
              id: parentReports.id,
              message: parentReports.message,
              createdAt: parentReports.createdAt,
            })
            .from(parentReports)
            .where(
              and(
                eq(parentReports.parentId, parentId),
                eq(parentReports.studentId, student.id),
              ),
            )
            .orderBy(desc(parentReports.createdAt))
            .limit(5),
          Promise.all(
            groups.map(async (group) => ({
              ...group,
              attendance: await this.attendance(
                student.id,
                group.course.id,
                group.group.id,
              ),
              averageGrade: await this.averageGrade(student.id, group.group.id),
            })),
          ),
        ]);
        return { ...student, groups: withAttendance, reports };
      }),
    );
  }

  private async averageGrade(studentId: string, groupId: string) {
    const grades = await this.students.myGrades(studentId, groupId);
    const gradedQuizzes = grades.quizzes.filter((quiz) => !quiz.pending);
    const nonNullManual = grades.manual.filter((grade) => grade.score !== null);
    const totalEarned =
      gradedQuizzes.reduce((sum, q) => sum + q.score, 0) +
      nonNullManual.reduce((sum, m) => sum + (m.score ?? 0), 0);
    const totalMax =
      gradedQuizzes.reduce((sum, q) => sum + q.maxScore, 0) +
      nonNullManual.reduce((sum, m) => sum + m.maxScore, 0);
    if (!totalMax) return 0;
    return Math.round((totalEarned / totalMax) * 100);
  }

  private async attendance(
    studentId: string,
    courseId: string,
    groupId: string,
  ) {
    const courseLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));

    if (!courseLessons.length) {
      return { present: 0, total: 0, percent: 0 };
    }

    const hiddenLessonRows = await db
      .select({ lessonId: groupLessonAccess.lessonId })
      .from(groupLessonAccess)
      .where(
        and(
          eq(groupLessonAccess.groupId, groupId),
          eq(groupLessonAccess.isHidden, true),
          inArray(
            groupLessonAccess.lessonId,
            courseLessons.map((l) => l.id),
          ),
        ),
      );
    const hiddenLessonIds = new Set(hiddenLessonRows.map((r) => r.lessonId));
    const visibleLessonIds = courseLessons
      .map((l) => l.id)
      .filter((id) => !hiddenLessonIds.has(id));

    if (!visibleLessonIds.length) {
      return { present: 0, total: 0, percent: 0 };
    }

    const records = await db
      .select({ isPresent: lessonAttendance.isPresent })
      .from(lessonAttendance)
      .where(
        and(
          eq(lessonAttendance.studentId, studentId),
          inArray(lessonAttendance.lessonId, visibleLessonIds),
        ),
      );

    const marked = records.length;
    const present = records.filter((r) => r.isPresent).length;
    return {
      present,
      total: marked,
      percent: marked === 0 ? 0 : Math.round((present / marked) * 100),
    };
  }

  async unlink(parentId: string, studentId: string) {
    await db
      .update(parentStudents)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(parentStudents.parentId, parentId),
          eq(parentStudents.studentId, studentId),
          isNull(parentStudents.deletedAt),
        ),
      );
    return { ok: true };
  }

  async grades(parentId: string, studentId: string, groupId: string) {
    await this.assertLinked(parentId, studentId);
    return this.students.myGrades(studentId, groupId);
  }

  private async assertLinked(parentId: string, studentId: string) {
    const [link] = await db
      .select()
      .from(parentStudents)
      .where(
        and(
          eq(parentStudents.parentId, parentId),
          eq(parentStudents.studentId, studentId),
          isNull(parentStudents.deletedAt),
        ),
      )
      .limit(1);
    if (!link) throw new ForbiddenException('Not linked to this student');
  }
}
