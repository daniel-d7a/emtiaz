import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { parentStudents, users } from '../../db/schema';
import { StudentService } from '../student/student.service';

@Injectable()
export class ParentService {
  constructor(private readonly students: StudentService) {}

  /** Resolves a student from their private parent code (used before signup too). */
  async resolveStudent(code: string) {
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.parentInviteCode, code.trim().toUpperCase()),
          eq(users.role, 'STUDENT'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!student) throw new NotFoundException('Invalid student code');
    return student;
  }

  /** Links a parent to a student using the student's private parent code. */
  async linkByCode(parentId: string, code: string) {
    const student = await this.resolveStudent(code);
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
      rows.map(async (student) => ({
        ...student,
        groups: await this.students.myGroups(student.id),
      })),
    );
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
