import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
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
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from '../../db/schema';
import { StorageService } from '../storage/storage.service';

const norm = (s: string) => s.trim().toLowerCase();

@Injectable()
export class StudentService {
  constructor(private readonly storage: StorageService) {}

  private async signedBanner(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.presignedGet(key);
    } catch {
      return null;
    }
  }

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

  private async lessonEnrollments(studentId: string, lessonId: string) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    const enrollments = await db
      .select({ group: groups })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, mod.courseId),
        ),
      );
    if (!enrollments.length) throw new ForbiddenException('Not enrolled in this course');
    return { lesson, enrollments };
  }

  private async lessonUnlocked(
    enrollments: Array<{ group: typeof groups.$inferSelect }>,
    lessonId: string,
    groupId?: string,
  ) {
    const relevant = groupId
      ? enrollments.filter((e) => e.group.id === groupId)
      : enrollments;
    if (!relevant.length) throw new ForbiddenException('Not enrolled in this group');
    const overrides = await db
      .select()
      .from(groupLessonAccess)
      .where(
        and(
          eq(groupLessonAccess.lessonId, lessonId),
          inArray(groupLessonAccess.groupId, relevant.map((e) => e.group.id)),
        ),
      );
    return relevant.some(
      (e) =>
        overrides.find((o) => o.groupId === e.group.id)?.isUnlocked ??
        e.group.unlockAllByDefault,
    );
  }

  async myGroups(studentId: string) {
    const enrolled = await db
      .select({
        group: groups,
        course: courses,
        joinedAt: groupStudents.joinedAt,
        teacher: {
          name: users.name,
          subject: categories.name,
          theme: users.landingTheme,
          banner: users.landingBanner,
        },
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
    const bannerKeys = [...new Set(enrolled.map((r) => r.teacher.banner).filter((k): k is string => !!k))];
    const bannerUrls = new Map(
      await Promise.all(bannerKeys.map(async (key) => [key, await this.signedBanner(key)] as const)),
    );
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
      const unlockedIds = new Set(
        courseLessons.filter((l) => isUnlocked(l.lessonId)).map((l) => l.lessonId),
      );
      const total = unlockedIds.size;
      const done = completions.filter((c) => unlockedIds.has(c.lessonId)).length;
      const { teacher, ...rest } = r;
      return {
        ...rest,
        teacher: {
          name: teacher.name,
          subject: teacher.subject,
          theme: teacher.theme,
          bannerUrl: teacher.banner ? bannerUrls.get(teacher.banner) ?? null : null,
        },
        joinedAt: r.joinedAt,
        progress: total === 0 ? 0 : Math.round((done / total) * 100),
        completedLessons: done,
        totalLessons: total,
      };
    });
  }

  async home(studentId: string) {
    const groups = await this.myGroups(studentId);
    const grades = await Promise.all(
      groups.map((g) => this.myGrades(studentId, g.group.id)),
    );
    const percentages = grades.flatMap((g) => [
      ...g.quizzes.map((q) => q.score / q.maxScore),
      ...g.manual.filter((m) => m.score !== null).map((m) => (m.score ?? 0) / m.maxScore),
    ]);
    const latestCourses = [...groups]
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 3);
    return {
      stats: {
        activeGroups: groups.length,
        lessonsDone: groups.reduce((sum, g) => sum + g.completedLessons, 0),
        averageGrade: percentages.length
          ? Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 100)
          : 0,
      },
      latestCourses,
    };
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
    const quizTargets = [
      eq(quizzes.courseId, group.courseId),
      ...(mods.length ? [inArray(quizzes.moduleId, mods.map((m) => m.id))] : []),
      ...(lessonIds.length ? [inArray(quizzes.lessonId, lessonIds)] : []),
    ];
    const quizRows = await db.select().from(quizzes).where(or(...quizTargets));
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

    const bestFor = (quizId?: string) =>
      attemptRows
        .filter((a) => quizId && a.quizId === quizId)
        .sort((a, b) => b.score - a.score)[0] ?? null;
    const courseQuiz = quizRows.find((q) => q.courseId === group.courseId);
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, group.courseId));
    const [teacher] = await db
      .select({
        name: users.name,
        theme: users.landingTheme,
        banner: users.landingBanner,
        slug: users.landingSlug,
        published: users.landingPublished,
      })
      .from(users)
      .where(eq(users.id, course.teacherId));

    return {
      course,
      teacher: {
        name: teacher?.name ?? '',
        theme: teacher?.theme ?? null,
        bannerUrl: await this.signedBanner(teacher?.banner ?? null),
        slug: teacher?.published ? teacher.slug : null,
      },
      group: { id: group.id, name: group.name, joinCode: group.joinCode },
      quiz: courseQuiz ? { ...courseQuiz, bestAttempt: bestFor(courseQuiz.id) } : null,
      modules: mods.map((m) => {
        const moduleQuiz = quizRows.find((q) => q.moduleId === m.id);
        return {
          ...m,
          quiz: moduleQuiz
            ? { ...moduleQuiz, bestAttempt: bestFor(moduleQuiz.id) }
            : null,
          lessons: allLessons
            .filter((l) => l.moduleId === m.id)
            .map((l) => {
              const quiz = quizRows.find((q) => q.lessonId === l.id);
              return {
                ...l,
                unlocked: isUnlocked(l.id),
                completed: completions.some((c) => c.lessonId === l.id),
                hasQuiz: !!quiz,
                bestAttempt: bestFor(quiz?.id),
                attachments: attachments.filter(
                  (a) =>
                    a.lessonId === l.id &&
                    (!a.groupId || a.groupId === groupId),
                ),
              };
            }),
        };
      }),
    };
  }

  async markComplete(studentId: string, lessonId: string) {
    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    if (!(await this.lessonUnlocked(enrollments, lessonId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
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
    const { lesson, enrollments } = await this.lessonEnrollments(studentId, lessonId);
    if (!(await this.lessonUnlocked(enrollments, lessonId, groupId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }

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
        .filter((a) => !a.groupId || enrollments.some((e) => a.groupId === e.group.id))
        .map((a) => ({
          id: a.id,
          title: a.title,
          fileType: a.fileType,
          mimeType: a.mimeType,
        })),
      hasQuiz: !!(await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1)).length,
    };
  }

  async getQuizByLesson(studentId: string, lessonId: string) {
    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    if (!(await this.lessonUnlocked(enrollments, lessonId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    if (!quiz) return { quiz: null };
    return this.getQuiz(studentId, quiz.id);
  }

  async getQuiz(studentId: string, quizId: string) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.assertQuizAccess(studentId, quiz);
    if (quiz.lessonId) {
      const { enrollments } = await this.lessonEnrollments(studentId, quiz.lessonId);
      if (!(await this.lessonUnlocked(enrollments, quiz.lessonId))) {
        throw new ForbiddenException('Lesson is locked for your group');
      }
    }
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
    if (quiz.lessonId) {
      const { enrollments } = await this.lessonEnrollments(studentId, quiz.lessonId);
      if (!(await this.lessonUnlocked(enrollments, quiz.lessonId, groupId))) {
        throw new ForbiddenException('Lesson is locked for your group');
      }
    }
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
  private async assertQuizAccess(
    studentId: string,
    quiz: typeof quizzes.$inferSelect,
  ) {
    let courseId = quiz.courseId;
    if (quiz.moduleId) {
      const [mod] = await db.select().from(modules).where(eq(modules.id, quiz.moduleId));
      courseId = mod?.courseId ?? null;
    } else if (quiz.lessonId) {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId));
      const [mod] = lesson
        ? await db.select().from(modules).where(eq(modules.id, lesson.moduleId))
        : [];
      courseId = mod?.courseId ?? null;
    }
    if (!courseId) throw new ForbiddenException('Quiz not in a course');
    const enrollments = await db
      .select({ group: groups })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, courseId),
        ),
      );
    if (!enrollments.length) throw new ForbiddenException('Not enrolled in this course');
    if (
      quiz.lessonId &&
      !(await this.lessonUnlocked(enrollments, quiz.lessonId))
    ) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
  }

  private async assertQuizInGroupCourse(
    quiz: typeof quizzes.$inferSelect,
    groupId: string,
  ) {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    if (!group) throw new NotFoundException('Group not found');
    let courseId: string | null = quiz.courseId;
    if (quiz.moduleId) {
      const [mod] = await db.select().from(modules).where(eq(modules.id, quiz.moduleId));
      courseId = mod?.courseId ?? null;
    } else if (quiz.lessonId) {
      const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId));
      const [mod] = lesson
        ? await db.select().from(modules).where(eq(modules.id, lesson.moduleId))
        : [];
      courseId = mod?.courseId ?? null;
    }
    if (!courseId || courseId !== group.courseId) {
      throw new ForbiddenException('Quiz not in this course');
    }
  }

  async getGroupQuiz(studentId: string, groupId: string, quizId: string) {
    await this.assertEnrolled(studentId, groupId);
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.assertQuizInGroupCourse(quiz, groupId);
    if (quiz.lessonId) {
      const { enrollments } = await this.lessonEnrollments(studentId, quiz.lessonId);
      if (!(await this.lessonUnlocked(enrollments, quiz.lessonId, groupId))) {
        throw new ForbiddenException('Lesson is locked for your group');
      }
    }
    const payload = await this.getQuiz(studentId, quizId);
    const attempt = await this.attemptResult(studentId, groupId, quizId);
    return { ...payload, attempt };
  }

  private async attemptResult(
    studentId: string,
    groupId: string,
    quizId: string,
  ) {
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.displayOrder));
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.groupId, groupId),
          eq(quizAttempts.quizId, quizId),
        ),
      )
      .orderBy(desc(quizAttempts.score))
      .limit(1);
    if (!attempt) return null;
    const answers = attempt.answersJson as Record<string, string>;
    return {
      answers,
      score: attempt.score,
      maxScore: attempt.maxScore,
      submittedAt: attempt.submittedAt,
      result: questions.map((q) => ({
        questionId: q.id,
        correct: norm(answers[q.id] ?? '') === norm(q.correctAnswer),
        expected: q.correctAnswer,
        explanation: q.explanation,
      })),
    };
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
        moduleTitle: modules.title,
        courseTitle: courses.title,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .leftJoin(modules, eq(quizzes.moduleId, modules.id))
      .leftJoin(courses, eq(quizzes.courseId, courses.id))
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
              lessonTitle: r.lessonTitle ?? r.moduleTitle ?? r.courseTitle ?? '—',
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
