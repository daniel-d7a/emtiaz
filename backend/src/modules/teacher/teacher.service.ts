import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  courses,
  groupLessonAccess,
  groupStudents,
  groups,
  lessonAttachments,
  lessons,
  manualGradeColumns,
  manualGradeValues,
  modules,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from '../../db/schema';

export const genJoinCode = () =>
  `OM${Math.floor(100000 + Math.random() * 900000)}`;

@Injectable()
export class TeacherService {
  private async assertOwnsCourse(teacherId: string, courseId: string) {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId));
    if (!course) throw new NotFoundException('Course not found');
    // Admins may manage any course; teachers only their own
    return course;
  }

  private async assertCourseAccess(
    user: { id: string; role: string },
    courseId: string,
  ) {
    const course = await this.assertOwnsCourse(user.id, courseId);
    if (course.teacherId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not your course');
    }
    return course;
  }

  async listCourses(teacherId: string) {
    const coursesList = await db
      .select()
      .from(courses)
      .where(eq(courses.teacherId, teacherId))
      .orderBy(asc(courses.createdAt));
    const courseIds = coursesList.map((c) => c.id);
    const groupsList = courseIds.length
      ? await db.select().from(groups).where(inArray(groups.courseId, courseIds))
      : [];
    return coursesList.map((c) => ({
      ...c,
      groups: groupsList.filter((g) => g.courseId === c.id),
    }));
  }

  async createCourse(
    teacherId: string,
    dto: {
      title: string;
      description?: string;
      courseType: 'ACADEMIC' | 'GENERAL';
      gradeId?: string;
      semester?: string;
      categoryId?: string;
    },
  ) {
    if (dto.courseType === 'ACADEMIC' && !dto.gradeId) {
      throw new ForbiddenException('Academic courses need a grade');
    }
    const [course] = await db
      .insert(courses)
      .values({
        title: dto.title,
        description: dto.description,
        courseType: dto.courseType,
        teacherId,
        gradeId: dto.gradeId,
        semester: dto.semester,
        categoryId: dto.categoryId,
      })
      .returning();
    return course;
  }

  async updateCourse(
    user: { id: string; role: string },
    courseId: string,
    dto: Partial<{
      title: string;
      description: string;
      isPublished: boolean;
      gradeId: string;
      semester: string;
      categoryId: string;
    }>,
  ) {
    await this.assertCourseAccess(user, courseId);
    const [updated] = await db
      .update(courses)
      .set(dto)
      .where(eq(courses.id, courseId))
      .returning();
    return updated;
  }

  async addModule(
    user: { id: string; role: string },
    courseId: string,
    title: string,
  ) {
    await this.assertCourseAccess(user, courseId);
    const existing = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId));
    const [mod] = await db
      .insert(modules)
      .values({ courseId, title, displayOrder: existing.length })
      .returning();
    return mod;
  }

  async reorderModules(
    user: { id: string; role: string },
    courseId: string,
    moduleIds: string[],
  ) {
    await this.assertCourseAccess(user, courseId);
    await Promise.all(
      moduleIds.map((id, i) =>
        db
          .update(modules)
          .set({ displayOrder: i })
          .where(and(eq(modules.id, id), eq(modules.courseId, courseId))),
      ),
    );
    return this.getCourseCurriculum(courseId);
  }

  async addLesson(
    user: { id: string; role: string },
    moduleId: string,
    dto: { title: string; content?: string },
  ) {
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    const existing = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));
    const [lesson] = await db
      .insert(lessons)
      .values({
        moduleId,
        title: dto.title,
        content: dto.content,
        displayOrder: existing.length,
      })
      .returning();
    return lesson;
  }

  async updateLesson(
    user: { id: string; role: string },
    lessonId: string,
    dto: Partial<{ title: string; content: string }>,
  ) {
    const lesson = (
      await db.select().from(lessons).where(eq(lessons.id, lessonId))
    )[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, lesson.moduleId));
    await this.assertCourseAccess(user, mod.courseId);
    const [updated] = await db
      .update(lessons)
      .set(dto)
      .where(eq(lessons.id, lessonId))
      .returning();
    return updated;
  }

  async reorderLessons(
    user: { id: string; role: string },
    moduleId: string,
    lessonIds: string[],
  ) {
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    await Promise.all(
      lessonIds.map((id, i) =>
        db
          .update(lessons)
          .set({ displayOrder: i })
          .where(and(eq(lessons.id, id), eq(lessons.moduleId, moduleId))),
      ),
    );
    return this.getCourseCurriculum(mod.courseId);
  }

  async getCourseCurriculum(courseId: string) {
    const mods = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.displayOrder));
    const allLessons = mods.length
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
          .orderBy(asc(lessons.displayOrder))
      : [];
    const lessonIds = allLessons.map((l) => l.id);
    const quizRows = lessonIds.length
      ? await db
          .select()
          .from(quizzes)
          .where(inArray(quizzes.lessonId, lessonIds))
      : [];
    const questionRows = quizRows.length
      ? await db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, quizRows.map((q) => q.id)))
          .orderBy(asc(quizQuestions.displayOrder))
      : [];
    const attachments = lessonIds.length
      ? await db
          .select()
          .from(lessonAttachments)
          .where(inArray(lessonAttachments.lessonId, lessonIds))
      : [];
    return mods.map((m) => ({
      ...m,
      lessons: allLessons
        .filter((l) => l.moduleId === m.id)
        .map((l) => {
          const quiz = quizRows.find((q) => q.lessonId === l.id);
          return {
            ...l,
            quiz: quiz
              ? {
                  ...quiz,
                  questions: questionRows.filter((q) => q.quizId === quiz.id),
                }
              : null,
            attachments: attachments.filter((a) => a.lessonId === l.id),
          };
        }),
    }));
  }

  async upsertQuiz(
    user: { id: string; role: string },
    lessonId: string,
    payload: {
      title: string;
      questions: Array<{
        questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
        prompt: string;
        options?: string[];
        correctAnswer: string;
        explanation?: string;
        points?: number;
      }>;
    },
  ) {
    const lesson = (
      await db.select().from(lessons).where(eq(lessons.id, lessonId))
    )[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, lesson.moduleId));
    await this.assertCourseAccess(user, mod.courseId);

    for (const q of payload.questions) {
      if (q.questionType === 'MCQ' && q.options && !q.options.includes(q.correctAnswer)) {
        throw new ForbiddenException('correctAnswer must be one of options');
      }
      if (q.questionType === 'TRUE_FALSE' && !['true', 'false'].includes(q.correctAnswer.toLowerCase())) {
        throw new ForbiddenException('TRUE_FALSE correctAnswer must be true/false');
      }
    }

    let quiz = (
      await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId))
    )[0];
    if (!quiz) {
      quiz = (
        await db
          .insert(quizzes)
          .values({ lessonId, title: payload.title })
          .returning()
      )[0];
    } else {
      quiz = (
        await db
          .update(quizzes)
          .set({ title: payload.title })
          .where(eq(quizzes.id, quiz.id))
          .returning()
      )[0];
      await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
      await db.delete(quizAttempts).where(eq(quizAttempts.quizId, quiz.id));
    }

    const inserted = payload.questions.length
      ? await db
          .insert(quizQuestions)
          .values(
            payload.questions.map((q, i) => ({
              quizId: quiz.id,
              questionType: q.questionType,
              prompt: q.prompt,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points ?? 1,
              displayOrder: i,
            })),
          )
          .returning()
      : [];

    return { ...quiz, questions: inserted };
  }

  async deleteLesson(user: { id: string; role: string }, lessonId: string) {
    const lesson = (
      await db.select().from(lessons).where(eq(lessons.id, lessonId))
    )[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, lesson.moduleId));
    await this.assertCourseAccess(user, mod.courseId);
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    return { ok: true };
  }

  async deleteModule(user: { id: string; role: string }, moduleId: string) {
    const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    await db.delete(modules).where(eq(modules.id, moduleId));
    return { ok: true };
  }

  // ---------- Groups ----------

  private async assertOwnsGroup(user: { id: string; role: string }, groupId: string) {
    const [row] = await db
      .select({ group: groups, course: courses })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(eq(groups.id, groupId));
    if (!row) throw new NotFoundException('Group not found');
    if (row.course.teacherId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not your group');
    }
    return row;
  }

  async addGroup(
    user: { id: string; role: string },
    courseId: string,
    name: string,
  ) {
    await this.assertCourseAccess(user, courseId);
    let joinCode = genJoinCode();
    // collision-safe loop
    for (let i = 0; i < 5; i++) {
      const dupe = await db
        .select()
        .from(groups)
        .where(eq(groups.joinCode, joinCode))
        .limit(1);
      if (!dupe.length) break;
      joinCode = genJoinCode();
    }
    const [group] = await db
      .insert(groups)
      .values({ courseId, name, joinCode })
      .returning();
    return group;
  }

  async groupPacing(user: { id: string; role: string }, groupId: string) {
    const { course } = await this.assertOwnsGroup(user, groupId);
    const mods = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(asc(modules.displayOrder));
    const allLessons = mods.length
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
          .orderBy(asc(lessons.displayOrder))
      : [];
    const accessRows = await db
      .select()
      .from(groupLessonAccess)
      .where(eq(groupLessonAccess.groupId, groupId));
    const group = (
      await db.select().from(groups).where(eq(groups.id, groupId))
    )[0];
    return {
      group,
      lessons: allLessons.map((l) => {
        const row = accessRows.find((a) => a.lessonId === l.id);
        return {
          ...l,
          unlocked: row ? row.isUnlocked : group.unlockAllByDefault,
          overridden: !!row,
        };
      }),
    };
  }

  async setLessonAccess(
    user: { id: string; role: string },
    groupId: string,
    lessonId: string,
    isUnlocked: boolean,
  ) {
    const { course } = await this.assertOwnsGroup(user, groupId);
    const lesson = (
      await db.select().from(lessons).where(eq(lessons.id, lessonId))
    )[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, lesson.moduleId));
    if (mod.courseId !== course.id) {
      throw new ForbiddenException('Lesson not in this course');
    }
    await db
      .insert(groupLessonAccess)
      .values({ groupId, lessonId, isUnlocked })
      .onConflictDoUpdate({
        target: [groupLessonAccess.groupId, groupLessonAccess.lessonId],
        set: { isUnlocked },
      });
    return { ok: true };
  }

  async groupRoster(user: { id: string; role: string }, groupId: string) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const roster = await db
      .select({
        studentId: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        joinedAt: groupStudents.joinedAt,
      })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(eq(groupStudents.groupId, groupId));
    return { group, students: roster };
  }

  async bulkAddStudents(
    user: { id: string; role: string },
    groupId: string,
    students: Array<{ name: string; phoneNumber: string }>,
  ) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const results: Array<{ phoneNumber: string; created: boolean; enrolled: boolean }> = [];
    for (const s of students) {
      let [existing] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, s.phoneNumber));
      let created = false;
      if (!existing) {
        // ponytail: synthetic email for phone-only students, matches onboarding
        const email = `${s.phoneNumber.replace(/[^\d]/g, '')}@phone.emtiaz.om`;
        try {
          existing = (
            await db
              .insert(users)
              .values({ id: crypto.randomUUID(), name: s.name, email, phoneNumber: s.phoneNumber, role: 'STUDENT' })
              .returning()
          )[0];
          created = true;
        } catch {
          // race on unique phone; re-select
          [existing] = await db
            .select()
            .from(users)
            .where(eq(users.phoneNumber, s.phoneNumber));
        }
      }
      const enrolled = await this.enrollWithPasswordless(existing.id, group.id);
      results.push({ phoneNumber: s.phoneNumber, created, enrolled });
    }
    return results;
  }

  private async enrollWithPasswordless(studentId: string, groupId: string) {
    const existing = await db
      .select()
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, groupId),
          eq(groupStudents.studentId, studentId),
        ),
      );
    if (!existing.length) {
      await db.insert(groupStudents).values({ groupId, studentId });
      return true;
    }
    return false;
  }

  async moveStudent(
    user: { id: string; role: string },
    studentId: string,
    fromGroupId: string,
    toGroupId: string,
  ) {
    await this.assertOwnsGroup(user, fromGroupId);
    const to = await this.assertOwnsGroup(user, toGroupId);
    if (to.group.courseId !== (await this.getCourseOfGroup(fromGroupId))) {
      throw new ForbiddenException('Groups must be in the same course');
    }
    await db
      .delete(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, fromGroupId),
          eq(groupStudents.studentId, studentId),
        ),
      );
    await this.enrollWithPasswordless(studentId, toGroupId);
    return { ok: true };
  }

  private async getCourseOfGroup(groupId: string) {
    const [g] = await db.select().from(groups).where(eq(groups.id, groupId));
    return g.courseId;
  }

  async removeStudent(
    user: { id: string; role: string },
    groupId: string,
    studentId: string,
  ) {
    await this.assertOwnsGroup(user, groupId);
    await db
      .delete(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, groupId),
          eq(groupStudents.studentId, studentId),
        ),
      );
    return { ok: true };
  }

  // ---------- Gradebook ----------

  async gradebook(user: { id: string; role: string }, groupId: string) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const course = (
      await db.select().from(courses).where(eq(courses.id, group.courseId))
    )[0];

    const roster = await db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
      })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(eq(groupStudents.groupId, groupId));

    // Quiz columns: one per lesson that has a quiz in this course
    const mods = await db.select().from(modules).where(eq(modules.courseId, course.id));
    const lessonsInCourse = mods.length
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
      : [];
    const quizRows = lessonsInCourse.length
      ? await db
          .select()
          .from(quizzes)
          .where(inArray(quizzes.lessonId, lessonsInCourse.map((l) => l.id)))
      : [];
    const questionTotals: Record<string, number> = {};
    if (quizRows.length) {
      const qq = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, quizRows.map((q) => q.id)));
      for (const q of qq) {
        questionTotals[q.quizId] = (questionTotals[q.quizId] ?? 0) + q.points;
      }
    }
    const lessonTitles = Object.fromEntries(
      lessonsInCourse.map((l) => [
        quizRows.find((q) => q.lessonId === l.id)?.id,
        l.title,
      ]),
    );

    const attempts = roster.length && quizRows.length
      ? await db
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.groupId, groupId),
              inArray(
                quizAttempts.studentId,
                roster.map((r) => r.id),
              ),
            ),
          )
      : [];

    const quizColumns = quizRows.map((q) => ({
      quizId: q.id,
      lessonTitle: lessonTitles[q.id],
      maxScore: questionTotals[q.id] ?? 0,
    }));

    const cells = attempts.reduce<Record<string, number>>((acc, a) => {
      // best attempt wins
      if ((acc[`${a.studentId}:${a.quizId}`] ?? -1) < a.score) {
        acc[`${a.studentId}:${a.quizId}`] = a.score;
      }
      return acc;
    }, {});

    const manualCols = await db
      .select()
      .from(manualGradeColumns)
      .where(eq(manualGradeColumns.groupId, groupId))
      .orderBy(asc(manualGradeColumns.displayOrder));
    const manualVals = manualCols.length && roster.length
      ? await db
          .select()
          .from(manualGradeValues)
          .where(inArray(manualGradeValues.columnId, manualCols.map((c) => c.id)))
      : [];

    return {
      group,
      students: roster,
      quizColumns,
      quizCells: cells,
      manualColumns: manualCols,
      manualCells: manualVals.map((v) => ({
        columnId: v.columnId,
        studentId: v.studentId,
        score: v.score,
        note: v.teacherNote,
      })),
    };
  }

  async addGradeColumn(
    user: { id: string; role: string },
    groupId: string,
    dto: { title: string; maxScore?: number },
  ) {
    await this.assertOwnsGroup(user, groupId);
    const existing = await db
      .select()
      .from(manualGradeColumns)
      .where(eq(manualGradeColumns.groupId, groupId));
    const [col] = await db
      .insert(manualGradeColumns)
      .values({
        groupId,
        title: dto.title,
        maxScore: dto.maxScore ?? 10,
        displayOrder: existing.length,
      })
      .returning();
    return col;
  }

  async deleteGradeColumn(
    user: { id: string; role: string },
    groupId: string,
    columnId: string,
  ) {
    await this.assertOwnsGroup(user, groupId);
    await db
      .delete(manualGradeColumns)
      .where(
        and(
          eq(manualGradeColumns.id, columnId),
          eq(manualGradeColumns.groupId, groupId),
        ),
      );
    return { ok: true };
  }

  async setGradeCell(
    user: { id: string; role: string },
    groupId: string,
    columnId: string,
    studentId: string,
    score: number,
    teacherNote?: string,
  ) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const [col] = await db
      .select()
      .from(manualGradeColumns)
      .where(
        and(eq(manualGradeColumns.id, columnId), eq(manualGradeColumns.groupId, groupId)),
      );
    if (!col) throw new NotFoundException('Column not found');
    const [student] = await db.select().from(users).where(eq(users.id, studentId));
    if (!student) throw new NotFoundException('Student not found');
    const enrolled = await db
      .select()
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, group.id),
          eq(groupStudents.studentId, studentId),
        ),
      );
    if (!enrolled.length) {
      throw new ForbiddenException('Student not in this group');
    }
    await db
      .insert(manualGradeValues)
      .values({ columnId, studentId, score, teacherNote })
      .onConflictDoUpdate({
        target: [manualGradeValues.columnId, manualGradeValues.studentId],
        set: { score, teacherNote, updatedAt: new Date() },
      });
    return { ok: true };
  }
}
