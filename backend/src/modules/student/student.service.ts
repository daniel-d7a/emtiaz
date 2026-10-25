import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  categories,
  courses,
  groupLessonAccess,
  groupStudents,
  groups,
  lessonAttachments,
  lessonCompletions,
  lessons,
  manualGradeColumns,
  manualGradeValues,
  modules,
  parentStudents,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from '../../db/schema';

const norm = (s: string) => s.trim().toLowerCase();

@Injectable()
export class StudentService {

  private async assertEnrolled(studentId: string, groupId: string) {
    const rows = await db
      .select()
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, groupId),
          eq(groupStudents.studentId, studentId),
        ),
      )
      .limit(1);
    if (!rows.length) throw new ForbiddenException('Not enrolled in this group');
    return rows[0];
  }

  /** Regenerates the student's parent code and revokes all existing parent links. */
  async rotateParentCode(studentId: string) {
    return db.transaction(async (tx) => {
      await tx.delete(parentStudents).where(eq(parentStudents.studentId, studentId));
      const [row] = await tx
        .update(users)
        .set({
          parentInviteCode: sql`('P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7)))`,
        })
        .where(eq(users.id, studentId))
        .returning({ parentInviteCode: users.parentInviteCode });
      return row;
    });
  }

  async myGroups(studentId: string) {
    const enrolled = await db
      .select({
        group: groups,
        course: courses,
        teacher: { name: users.name, subject: categories.name },
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .innerJoin(users, eq(courses.teacherId, users.id))
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(eq(groupStudents.studentId, studentId));

    if (!enrolled.length) return [];

    const groupIds = enrolled.map((r) => r.group.id);
    const coursesIds = [...new Set(enrolled.map((r) => r.course.id))];
    const lessonRows = await db
      .select({ lessonId: lessons.id, courseId: modules.courseId })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(inArray(modules.courseId, coursesIds));

    const accessRows = await db
      .select()
      .from(groupLessonAccess)
      .where(inArray(groupLessonAccess.groupId, groupIds));

    const completions = await db
      .select()
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.studentId, studentId),
          inArray(
            lessonCompletions.lessonId,
            lessonRows.map((r) => r.lessonId),
          ),
        ),
      );

    return enrolled.map((r) => {
      const courseLessons = lessonRows.filter((l) => l.courseId === r.course.id);
      const isUnlocked = (lessonId: string) => {
        const row = accessRows.find(
          (a) => a.groupId === r.group.id && a.lessonId === lessonId,
        );
        return row ? row.isUnlocked : r.group.unlockAllByDefault;
      };
      const total = courseLessons.filter((l) => isUnlocked(l.lessonId)).length;
      const done = completions.filter(
        (c) => courseLessons.some((l) => l.lessonId === c.lessonId),
      ).length;
      return {
        ...r,
        progress: total === 0 ? 0 : Math.round((done / total) * 100),
        completedLessons: done,
        totalLessons: total,
      };
    });
  }

  async joinByCode(studentId: string, joinCode: string) {
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.joinCode, joinCode), eq(groups.isActive, true)))
      .limit(1);
    if (!group) throw new NotFoundException('Invalid group code');

    const existing = await db
      .select()
      .from(groupStudents)
      .where(
        and(
          eq(groupStudents.groupId, group.id),
          eq(groupStudents.studentId, studentId),
        ),
      )
      .limit(1);
    if (!existing.length) {
      await db
        .insert(groupStudents)
        .values({ groupId: group.id, studentId });
    }
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, group.courseId));
    return { group, course };
  }

  async curriculum(studentId: string, groupId: string) {
    await this.assertEnrolled(studentId, groupId);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw new NotFoundException('Group not found');

    const mods = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, group.courseId))
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

    const lessonIds = allLessons.map((l) => l.id);
    const attachments = lessonIds.length
      ? await db
          .select()
          .from(lessonAttachments)
          .where(inArray(lessonAttachments.lessonId, lessonIds))
      : [];
    const completions = lessonIds.length
      ? await db
          .select()
          .from(lessonCompletions)
          .where(
            and(
              eq(lessonCompletions.studentId, studentId),
              inArray(lessonCompletions.lessonId, lessonIds),
            ),
          )
      : [];
    const quizRows = lessonIds.length
      ? await db.select().from(quizzes).where(inArray(quizzes.lessonId, lessonIds))
      : [];
    const attemptRows = await db
      .select()
      .from(quizAttempts)
      .where(
        and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.groupId, groupId)),
      );

    const isUnlocked = (lessonId: string) => {
      const row = accessRows.find((a) => a.lessonId === lessonId);
      return row ? row.isUnlocked : group.unlockAllByDefault;
    };

    return {
      course: (
        await db.select().from(courses).where(eq(courses.id, group.courseId))
      )[0],
      group: { id: group.id, name: group.name, joinCode: group.joinCode },
      modules: mods.map((m) => ({
        ...m,
        lessons: allLessons
          .filter((l) => l.moduleId === m.id)
          .map((l) => {
            const quiz = quizRows.find((q) => q.lessonId === l.id);
            return {
              ...l,
              unlocked: isUnlocked(l.id),
              completed: completions.some((c) => c.lessonId === l.id),
              hasQuiz: !!quiz,
              bestAttempt:
                attemptRows
                  .filter((a) => quiz && a.quizId === quiz.id)
                  .sort((a, b) => b.score - a.score)[0] ?? null,
              attachments: attachments.filter(
                (a) =>
                  a.lessonId === l.id &&
                  (!a.groupId || a.groupId === groupId),
              ),
            };
          }),
      })),
    };
  }

  async markComplete(studentId: string, lessonId: string) {
    const lesson = (
      await db.select().from(lessons).where(eq(lessons.id, lessonId))
    )[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    await db
      .insert(lessonCompletions)
      .values({ lessonId, studentId })
      .onConflictDoNothing();
    return { ok: true };
  }

  async unmarkComplete(studentId: string, lessonId: string) {
    await db
      .delete(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.lessonId, lessonId),
          eq(lessonCompletions.studentId, studentId),
        ),
      );
    return { ok: true };
  }

  async getLesson(studentId: string, lessonId: string, groupId?: string) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    const enrollments = await db
      .select()
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, mod.courseId),
        ),
      );
    if (!enrollments.length) throw new ForbiddenException('Not enrolled in this course');
    // groupId present → mirror that group's curriculum exactly; else any open group grants access
    if (groupId) await this.assertEnrolled(studentId, groupId);
    const relevant = groupId ? enrollments.filter((e) => e.groups.id === groupId) : enrollments;
    if (!relevant.length) throw new ForbiddenException('Not enrolled in this group');
    const overrides = await db
      .select()
      .from(groupLessonAccess)
      .where(
        and(
          eq(groupLessonAccess.lessonId, lessonId),
          inArray(groupLessonAccess.groupId, relevant.map((e) => e.groups.id)),
        ),
      );
    const isUnlocked = relevant.some(
      (e) =>
        overrides.find((o) => o.groupId === e.groups.id)?.isUnlocked ??
        e.groups.unlockAllByDefault,
    );
    if (!isUnlocked) throw new ForbiddenException('Lesson is locked for your group');
    if (!isUnlocked) throw new ForbiddenException('Lesson is locked for your group');

    const attachments = await db
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, lessonId));
    return {
      title: lesson.title,
      content: lesson.content,
      completed: !!(await db
        .select()
        .from(lessonCompletions)
        .where(
          and(
            eq(lessonCompletions.lessonId, lessonId),
            inArray(lessonCompletions.studentId, [studentId]),
          ),
        )
        .limit(1)).length,
      attachments: attachments
        .filter((a) => !a.groupId || enrollments.some((e) => a.groupId === e.groups.id))
        .map((a) => ({ id: a.id, title: a.title })),
      hasQuiz: !!(await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1)).length,
    };
  }

  async getQuizByLesson(studentId: string, lessonId: string) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    const enrolled = await db
      .select()
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, mod.courseId),
        ),
      )
      .limit(1);
    if (!enrolled.length) throw new ForbiddenException('Not enrolled in this course');

    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    if (!quiz) return { quiz: null };
    return this.getQuiz(studentId, quiz.id);
  }

  async getQuiz(studentId: string, quizId: string) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.displayOrder));
    return {
      quiz,
      questions: questions.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        prompt: q.prompt,
        options: q.options,
        points: q.points,
      })),
    };
  }

  async submitQuiz(
    studentId: string,
    quizId: string,
    groupId: string,
    answers: Record<string, string>,
  ) {
    await this.assertEnrolled(studentId, groupId);
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.assertQuizInGroupCourse(quiz, groupId);
    if (!Object.keys(answers).length) {
      throw new BadRequestException('Answers required');
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));
    if (!questions.length) throw new NotFoundException('Quiz has no questions');

    let score = 0;
    let maxScore = 0;
    const result = questions.map((q) => {
      maxScore += q.points;
      const answer = answers[q.id];
      const correct =
        answer !== undefined && norm(answer) === norm(q.correctAnswer);
      if (correct) score += q.points;
      return {
        questionId: q.id,
        correct,
        expected: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    await db.insert(quizAttempts).values({
      quizId,
      studentId,
      groupId,
      score,
      maxScore,
      answersJson: answers,
    });

    return { score, maxScore, result };
  }

  /** A quiz is only reachable through a group whose course contains it. */
  private async assertQuizInGroupCourse(
    quiz: typeof quizzes.$inferSelect,
    groupId: string,
  ) {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw new NotFoundException('Group not found');
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId));
    const [mod] = lesson
      ? await db.select().from(modules).where(eq(modules.id, lesson.moduleId))
      : [];
    if (!mod || mod.courseId !== group.courseId) throw new ForbiddenException('Quiz not in this course');
  }

  async myGrades(studentId: string, groupId: string) {
    await this.assertEnrolled(studentId, groupId);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw new NotFoundException('Group not found');

    const attempts = await db
      .select({
        quizId: quizAttempts.quizId,
        quizTitle: quizzes.title,
        lessonTitle: lessons.title,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .where(
        and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.groupId, groupId)),
      );

    const cols = await db
      .select()
      .from(manualGradeColumns)
      .where(eq(manualGradeColumns.groupId, groupId))
      .orderBy(asc(manualGradeColumns.displayOrder));
    const vals = await db
      .select()
      .from(manualGradeValues)
      .where(and(eq(manualGradeValues.studentId, studentId)));

    return {
      quizzes: Object.values(
        attempts.reduce<Record<string, any>>((acc, r) => {
          if (!acc[r.quizId] || acc[r.quizId].score < r.score) {
            acc[r.quizId] = {
              quizId: r.quizId,
              title: r.quizTitle,
              lessonTitle: r.lessonTitle,
              score: r.score,
              maxScore: r.maxScore,
            };
          }
          return acc;
        }, {}),
      ),
      manual: cols.map((c) => {
        const v = vals.find((v) => v.columnId === c.id);
        return {
          columnId: c.id,
          title: c.title,
          maxScore: c.maxScore,
          score: v?.score ?? null,
          note: v?.teacherNote ?? null,
        };
      }),
    };
  }
}
