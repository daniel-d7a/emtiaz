import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import {
  lessonAttendance,
  lessons,
  modules,
  parentReports,
  parentStudents,
  users,
} from '../../db/schema';
import { normalizePhone } from '../../lib/phone';
import { StudentService } from '../student/student.service';

@Injectable()
export class ParentService {
  constructor(private readonly students: StudentService) {}

  /**
   * Resolves an active student by phone number. Phone possession is the only
   * proof here, by product decision; add an OTP/challenge if abuse appears.
   */
  async resolveStudent(phoneNumber: string) {
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.phoneNumber, normalizePhone(phoneNumber)),
          eq(users.role, 'STUDENT'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!student) throw new NotFoundException('No active student with this phone number');
    return student;
  }

  /** Links a parent to a student using the student's registered phone number. */
  async linkByPhone(parentId: string, phoneNumber: string) {
    const student = await this.resolveStudent(phoneNumber);
    await db
      .insert(parentStudents)
      .values({ parentId, studentId: student.id })
      .onConflictDoNothing();
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
      .where(and(eq(parentStudents.parentId, parentId), isNull(users.deletedAt)));

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
              attendance: await this.attendance(student.id, group.course.id),
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
    const percentages = [
      ...grades.quizzes.map((quiz) => quiz.score / quiz.maxScore),
      ...grades.manual
        .filter((grade) => grade.score !== null)
        .map((grade) => (grade.score ?? 0) / grade.maxScore),
    ];
    if (!percentages.length) return 0;
    return Math.round(
      (percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100,
    );
  }

  private async attendance(studentId: string, courseId: string) {
    const [totalRow] = await db
      .select({ value: count() })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));
    const [presentRow] = await db
      .select({ value: count() })
      .from(lessonAttendance)
      .innerJoin(lessons, eq(lessonAttendance.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(
        and(
          eq(lessonAttendance.studentId, studentId),
          eq(lessonAttendance.isPresent, true),
          eq(modules.courseId, courseId),
        ),
      );
    const total = Number(totalRow?.value ?? 0);
    const present = Number(presentRow?.value ?? 0);
    return { present, total, percent: total === 0 ? 0 : Math.round((present / total) * 100) };
  }

  async unlink(parentId: string, studentId: string) {
    await db
      .delete(parentStudents)
      .where(
        and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)),
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
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)))
      .limit(1);
    if (!link) throw new ForbiddenException('Not linked to this student');
  }
}
