import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, countDistinct, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { randomInt } from 'crypto';
import { auth } from '../../auth/auth';
import { logger } from '../../lib/logger';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { TeacherEntitlementsService } from './teacher-entitlements.service';
import {
  serializeAttachment,
  serializeCourse,
  serializeGrade,
  serializeGroup,
  serializeLesson,
  serializeManualGradeColumn,
  serializeModule,
  serializeQuiz,
  serializeQuizAttempt,
  serializeTeacherQuizQuestion,
} from '../../lib/serializers';
import {
  categories,
  courses,
  grades,
  groupEntryCodeUses,
  groupEntryCodes,
  groupLessonAccess,
  groupQuizAccess,
  groupStudents,
  groups,
  lessonAttachments,
  lessonAttendance,
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
import { ENTRY_ALPHABET, genJoinCode, generateUniqueMonitoringCode } from '../../lib/group-join';
export { genJoinCode };

const genEntryCode = () =>
  Array.from({ length: 8 }, () => ENTRY_ALPHABET[randomInt(ENTRY_ALPHABET.length)]).join('');

type QuizPayload = {
  title: string;
  questions: Array<{
    questionType: 'MCQ' | 'TRUE_FALSE' | 'WRITTEN';
    prompt: string;
    imageKey?: string | null;
    options?: string[] | null;
    correctAnswer: string;
    explanation?: string | null;
    points: number;
  }>;
};

@Injectable()
export class TeacherService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly entitlementsService: TeacherEntitlementsService,
  ) {}

  async homeStats(teacherId: string) {
    const [courseRow] = await db
      .select({ value: count() })
      .from(courses)
      .where(and(eq(courses.teacherId, teacherId), isNull(courses.deletedAt)));
    const [groupRow] = await db
      .select({ value: count() })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(courses.teacherId, teacherId),
          isNull(courses.deletedAt),
          isNull(groups.deletedAt),
        ),
      );
    const [studentRow] = await db
      .select({ value: countDistinct(groupStudents.studentId) })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(
        and(
          eq(courses.teacherId, teacherId),
          isNull(courses.deletedAt),
          isNull(groups.deletedAt),
          isNull(users.deletedAt),
        ),
      );
    return {
      curricula: Number(courseRow?.value ?? 0),
      groups: Number(groupRow?.value ?? 0),
      uniqueStudents: Number(studentRow?.value ?? 0),
    };
  }

  private async signedImage(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.presignedGet(key);
    } catch {
      return null;
    }
  }

  private async assertOwnsCourse(teacherId: string, courseId: string) {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
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
      .where(and(eq(courses.teacherId, teacherId), isNull(courses.deletedAt)))
      .orderBy(asc(courses.createdAt));
    const courseIds = coursesList.map((c) => c.id);
    const groupsList = courseIds.length
      ? await db
          .select()
          .from(groups)
          .where(and(inArray(groups.courseId, courseIds), isNull(groups.deletedAt)))
      : [];
    const groupIds = groupsList.map((g) => g.id);
    const memberships = groupIds.length
      ? await db
          .select({ groupId: groupStudents.groupId, studentId: groupStudents.studentId })
          .from(groupStudents)
          .innerJoin(users, eq(groupStudents.studentId, users.id))
          .where(and(inArray(groupStudents.groupId, groupIds), isNull(users.deletedAt)))
      : [];
    const lessonRows = courseIds.length
      ? await db
          .select({
            id: lessons.id,
            title: lessons.title,
            createdAt: lessons.createdAt,
            courseId: modules.courseId,
          })
          .from(lessons)
          .innerJoin(modules, eq(lessons.moduleId, modules.id))
          .where(inArray(modules.courseId, courseIds))
      : [];
    const studentIds = [...new Set(memberships.map((m) => m.studentId))];
    const lessonIds = lessonRows.map((l) => l.id);
    const hiddenLessonAccess = groupIds.length && lessonIds.length
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
              inArray(groupLessonAccess.lessonId, lessonIds),
            ),
          )
      : [];
    const hiddenLessonSet = new Set(
      hiddenLessonAccess.map((r) => `${r.groupId}:${r.lessonId}`),
    );
    const completions = lessonIds.length && studentIds.length
      ? await db
          .select({ studentId: lessonCompletions.studentId, lessonId: lessonCompletions.lessonId })
          .from(lessonCompletions)
          .where(
            and(
              inArray(lessonCompletions.lessonId, lessonIds),
              inArray(lessonCompletions.studentId, studentIds),
            ),
          )
      : [];
    const imageUrls = new Map(
      await Promise.all(
        coursesList
          .filter((c) => c.image)
          .map(async (c) => [c.id, await this.signedImage(c.image)] as const),
      ),
    );
    return coursesList.map((c) => {
      const cGroups = groupsList.filter((g) => g.courseId === c.id);
      const cGroupIds = new Set(cGroups.map((g) => g.id));
      const cStudentIds = new Set(
        memberships.filter((m) => cGroupIds.has(m.groupId)).map((m) => m.studentId),
      );
      const cLessonIds = new Set(
        lessonRows.filter((l) => l.courseId === c.id).map((l) => l.id),
      );
      const done = completions.filter(
        (x) => cStudentIds.has(x.studentId) && cLessonIds.has(x.lessonId),
      ).length;
      const possible = cStudentIds.size * cLessonIds.size;
      const courseLessons = lessonRows.filter((l) => l.courseId === c.id);
      const latest = [...courseLessons].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      return {
        ...serializeCourse(c),
        imageUrl: imageUrls.get(c.id) ?? null,
        analytics: {
          students: cStudentIds.size,
          groups: cGroups.length,
          lessons: cLessonIds.size,
          avgProgress: possible ? Math.round((done / possible) * 100) : 0,
        },
        latestLesson: latest ? { id: latest.id, title: latest.title } : null,
        groups: cGroups.map((g) => {
          const members = memberships.filter((m) => m.groupId === g.id);
          const memberIds = new Set(members.map((m) => m.studentId));
          const visibleCourseLessons = courseLessons.filter(
            (l) => !hiddenLessonSet.has(`${g.id}:${l.id}`),
          );
          const visibleLessonIds = new Set(visibleCourseLessons.map((l) => l.id));
          const groupDone = completions.filter(
            (x) => memberIds.has(x.studentId) && visibleLessonIds.has(x.lessonId),
          ).length;
          const groupPossible = memberIds.size * visibleLessonIds.size;
          return {
            ...serializeGroup(g),
            studentCount: members.length,
            progress: groupPossible ? Math.round((groupDone / groupPossible) * 100) : 0,
          };
        }),
      };
    });
  }

  async listGrades(teacherId: string, country?: string) {
    let targetCountry = country;
    if (targetCountry !== 'OM' && targetCountry !== 'EG') {
      const [teacher] = await db
        .select({ country: users.country })
        .from(users)
        .where(eq(users.id, teacherId))
        .limit(1);
      targetCountry = teacher?.country ?? 'OM';
    }
    const rows = await db
      .select()
      .from(grades)
      .where(eq(grades.country, targetCountry as 'OM' | 'EG'))
      .orderBy(asc(grades.displayOrder), asc(grades.nameEn));
    return rows.map(serializeGrade);
  }

  async createCourse(
    teacherId: string,
    dto: {
      title: string;
      description?: string;
      courseType: 'ACADEMIC' | 'GENERAL';
      gradeId?: string;
      gradeName?: string;
      semester?: string;
      categoryId?: string;
      categoryName?: string;
      previewUrl?: string | null;
    },
  ) {
    let gradeId = dto.gradeId;
    let categoryId = dto.categoryId;
    if (dto.courseType === 'ACADEMIC') {
      if (!gradeId && dto.gradeName?.trim()) {
        const [teacher] = await db
          .select({ country: users.country })
          .from(users)
          .where(eq(users.id, teacherId))
          .limit(1);
        gradeId = (await this.ensureGrade(dto.gradeName, teacher?.country ?? 'OM')).id;
      }
      if (!gradeId) throw new ForbiddenException('Academic courses need a grade');
    } else if (!categoryId && dto.categoryName?.trim()) {
      categoryId = (await this.ensureCategory(dto.categoryName)).id;
    }
    const [course] = await db
      .insert(courses)
      .values({
        title: dto.title,
        description: dto.description,
        courseType: dto.courseType,
        teacherId,
        gradeId,
        semester: dto.semester?.trim() || null,
        categoryId,
        previewUrl: dto.previewUrl?.trim() || null,
      })
      .returning();
    return serializeCourse(course);
  }

  private async ensureGrade(
    name: string,
    country: 'OM' | 'EG' = 'OM',
  ): Promise<{ id: string }> {
    const trimmed = name.trim();
    const [existing] = await db
      .select({ id: grades.id })
      .from(grades)
      .where(
        and(
          eq(grades.country, country),
          or(
            ilike(grades.name, trimmed),
            ilike(grades.nameAr, trimmed),
            ilike(grades.nameEn, trimmed),
          ),
        ),
      )
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(grades)
      .values({
        country,
        name: trimmed,
        nameAr: trimmed,
        nameEn: trimmed,
      })
      .returning({ id: grades.id });
    return created;
  }

  private async ensureCategory(name: string): Promise<{ id: string }> {
    const trimmed = name.trim();
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        or(
          ilike(categories.name, trimmed),
          ilike(categories.nameAr, trimmed),
          ilike(categories.nameEn, trimmed),
        ),
      )
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(categories)
      .values({
        name: trimmed,
        nameAr: trimmed,
        nameEn: trimmed,
      })
      .returning({ id: categories.id });
    return created;
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
      image: string | null;
      previewUrl: string | null;
    }>,
  ) {
    const before = await this.assertCourseAccess(user, courseId);
    const patch = { ...dto };
    if (patch.image !== undefined) {
      const image = patch.image?.trim() || null;
      if (image && !image.startsWith(`courses/${courseId}/cover/`)) {
        throw new BadRequestException('image must be an uploaded course cover');
      }
      patch.image = image;
    }
    if (patch.previewUrl !== undefined) patch.previewUrl = patch.previewUrl?.trim() || null;
    const [updated] = await db
      .update(courses)
      .set(patch)
      .where(eq(courses.id, courseId))
      .returning();
    if (before.image && before.image !== updated.image) {
      await this.storage.deleteObject(before.image);
    }
    return serializeCourse(updated);
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
    return serializeModule(mod);
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

  async updateModule(
    user: { id: string; role: string },
    moduleId: string,
    dto: { title: string },
  ) {
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    const [updated] = await db
      .update(modules)
      .set(dto)
      .where(eq(modules.id, moduleId))
      .returning();
    return serializeModule(updated);
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
    const [unitQuiz] = await db
      .select({ displayOrder: quizzes.displayOrder })
      .from(quizzes)
      .where(eq(quizzes.moduleId, moduleId));
    const [lesson] = await db
      .insert(lessons)
      .values({
        moduleId,
        title: dto.title,
        content: dto.content,
        displayOrder:
          Math.max(-1, ...existing.map((l) => l.displayOrder), unitQuiz?.displayOrder ?? -1) + 1,
      })
      .returning();
    return serializeLesson(lesson);
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
    return serializeLesson(updated);
  }

  async reorderModuleItems(
    user: { id: string; role: string },
    moduleId: string,
    items: Array<{ id: string; type: 'lesson' | 'quiz' }>,
  ) {
    const [mod] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    const lessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));
    const quizRows = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.moduleId, moduleId));
    const lessonIds = new Set(lessonRows.map((l) => l.id));
    const quizIds = new Set(quizRows.map((q) => q.id));
    const seen = new Set<string>();
    if (items.length !== lessonRows.length + quizRows.length) {
      throw new BadRequestException('Reorder list must include every lesson and unit quiz');
    }
    for (const item of items) {
      if (seen.has(item.id)) throw new BadRequestException('Duplicate item');
      seen.add(item.id);
      if (item.type === 'lesson' && !lessonIds.has(item.id)) {
        throw new BadRequestException('Lesson does not belong to this module');
      }
      if (item.type === 'quiz' && !quizIds.has(item.id)) {
        throw new BadRequestException('Quiz does not belong to this module');
      }
    }
    await Promise.all(
      items.map((item, i) =>
        item.type === 'lesson'
          ? db.update(lessons).set({ displayOrder: i }).where(eq(lessons.id, item.id))
          : db.update(quizzes).set({ displayOrder: i }).where(eq(quizzes.id, item.id)),
      ),
    );
    return this.getCourseCurriculum(mod.courseId);
  }

  async getCourseCurriculumFor(
    user: { id: string; role: string },
    courseId: string,
  ) {
    await this.assertCourseAccess(user, courseId);
    return this.getCourseCurriculum(courseId);
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
    const modIds = mods.map((m) => m.id);
    const quizTargets = [
      eq(quizzes.courseId, courseId),
      ...(modIds.length ? [inArray(quizzes.moduleId, modIds)] : []),
      ...(lessonIds.length ? [inArray(quizzes.lessonId, lessonIds)] : []),
    ];
    const quizRows = await db
      .select()
      .from(quizzes)
      .where(or(...quizTargets));
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
    const imageUrls = new Map<string, string | null>();
    for (const key of new Set(
      questionRows.map((q) => q.imageKey).filter((k): k is string => !!k),
    )) {
      try {
        imageUrls.set(key, await this.storage.presignedGet(key));
      } catch {
        imageUrls.set(key, null);
      }
    }
    const withQuestions = (quiz: typeof quizRows[number]) => ({
      ...serializeQuiz(quiz),
      questions: questionRows
        .filter((q) => q.quizId === quiz.id)
        .map((q) =>
          serializeTeacherQuizQuestion(
            q,
            q.imageKey ? imageUrls.get(q.imageKey) ?? null : null,
          ),
        ),
    });
    const byOrder = (a: typeof quizRows[number], b: typeof quizRows[number]) =>
      a.displayOrder - b.displayOrder || a.id.localeCompare(b.id);
    return {
      quizzes: quizRows
        .filter((q) => q.courseId === courseId)
        .sort(byOrder)
        .map(withQuestions),
      modules: mods.map((m) => {
        return {
          ...serializeModule(m),
          quizzes: quizRows
            .filter((q) => q.moduleId === m.id)
            .sort(byOrder)
            .map(withQuestions),
          lessons: allLessons
            .filter((l) => l.moduleId === m.id)
            .map((l) => {
              return {
                ...serializeLesson(l),
                quizzes: quizRows
                  .filter((q) => q.lessonId === l.id)
                  .sort(byOrder)
                  .map(withQuestions),
                attachments: attachments
                  .filter((a) => a.lessonId === l.id)
                  .map(serializeAttachment),
              };
            }),
        };
      }),
    };
  }

  async upsertQuiz(
    user: { id: string; role: string },
    lessonId: string,
    payload: QuizPayload,
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
    return this.upsertQuizFor({ lessonId }, mod.courseId, payload);
  }

  async upsertModuleQuiz(
    user: { id: string; role: string },
    moduleId: string,
    payload: QuizPayload,
  ) {
    const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    await this.assertCourseAccess(user, mod.courseId);
    return this.upsertQuizFor({ moduleId }, mod.courseId, payload);
  }

  async upsertCourseQuiz(
    user: { id: string; role: string },
    courseId: string,
    payload: QuizPayload,
  ) {
    await this.assertCourseAccess(user, courseId);
    return this.upsertQuizFor({ courseId }, courseId, payload);
  }

  private validateQuizQuestions(courseId: string, questions: QuizPayload['questions']) {
    for (const q of questions) {
      if (q.imageKey && !q.imageKey.startsWith(`courses/${courseId}/quiz/`)) {
        throw new ForbiddenException('Question image does not belong to this course');
      }
      if (q.questionType === 'MCQ' && q.options && !q.options.includes(q.correctAnswer)) {
        throw new ForbiddenException('correctAnswer must be one of options');
      }
      if (q.questionType === 'TRUE_FALSE' && !['true', 'false'].includes(q.correctAnswer.toLowerCase())) {
        throw new ForbiddenException('TRUE_FALSE correctAnswer must be true/false');
      }
    }
  }

  private async quizCourseId(quiz: typeof quizzes.$inferSelect) {
    if (quiz.courseId) return quiz.courseId;
    if (quiz.moduleId) {
      const [mod] = await db
        .select({ courseId: modules.courseId })
        .from(modules)
        .where(eq(modules.id, quiz.moduleId));
      return mod?.courseId ?? null;
    }
    if (quiz.lessonId) {
      const [lesson] = await db
        .select({ moduleId: lessons.moduleId })
        .from(lessons)
        .where(eq(lessons.id, quiz.lessonId));
      const [mod] = lesson
        ? await db
            .select({ courseId: modules.courseId })
            .from(modules)
            .where(eq(modules.id, lesson.moduleId))
        : [];
      return mod?.courseId ?? null;
    }
    return null;
  }

  private async insertQuizQuestions(
    quizId: string,
    questions: QuizPayload['questions'],
  ) {
    return questions.length
      ? db
          .insert(quizQuestions)
          .values(
            questions.map((q, i) => ({
              quizId,
              questionType: q.questionType,
              prompt: q.prompt,
              imageKey: q.imageKey ?? null,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points ?? 1,
              displayOrder: i,
            })),
          )
          .returning()
      : [];
  }

  async createQuiz(
    user: { id: string; role: string },
    courseId: string,
    dto: QuizPayload & {
      targetType: 'course' | 'module' | 'lesson';
      targetId: string;
    },
  ) {
    await this.assertCourseAccess(user, courseId);
    let target: { courseId?: string; moduleId?: string; lessonId?: string };
    let displayOrder = 0;
    if (dto.targetType === 'lesson') {
      const [lesson] = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, dto.targetId));
      if (!lesson) throw new NotFoundException('Lesson not found');
      const [mod] = await db
        .select()
        .from(modules)
        .where(eq(modules.id, lesson.moduleId));
      if (mod?.courseId !== courseId) {
        throw new ForbiddenException('Lesson not in this course');
      }
      target = { lessonId: dto.targetId };
      const rows = await db
        .select({ displayOrder: quizzes.displayOrder })
        .from(quizzes)
        .where(eq(quizzes.lessonId, dto.targetId));
      displayOrder = Math.max(-1, ...rows.map((row) => row.displayOrder)) + 1;
    } else if (dto.targetType === 'module') {
      const [mod] = await db
        .select()
        .from(modules)
        .where(eq(modules.id, dto.targetId));
      if (!mod) throw new NotFoundException('Module not found');
      if (mod.courseId !== courseId) {
        throw new ForbiddenException('Module not in this course');
      }
      target = { moduleId: dto.targetId };
      const [quizRows, lessonRows] = await Promise.all([
        db
          .select({ displayOrder: quizzes.displayOrder })
          .from(quizzes)
          .where(eq(quizzes.moduleId, dto.targetId)),
        db
          .select({ displayOrder: lessons.displayOrder })
          .from(lessons)
          .where(eq(lessons.moduleId, dto.targetId)),
      ]);
      displayOrder =
        Math.max(
          -1,
          ...quizRows.map((row) => row.displayOrder),
          ...lessonRows.map((row) => row.displayOrder),
        ) + 1;
    } else {
      target = { courseId };
      const rows = await db
        .select({ displayOrder: quizzes.displayOrder })
        .from(quizzes)
        .where(eq(quizzes.courseId, courseId));
      displayOrder = Math.max(-1, ...rows.map((row) => row.displayOrder)) + 1;
    }
    this.validateQuizQuestions(courseId, dto.questions);
    const [quiz] = await db
      .insert(quizzes)
      .values({ ...target, title: dto.title, displayOrder })
      .returning();
    const inserted = await this.insertQuizQuestions(quiz.id, dto.questions);
    return {
      ...serializeQuiz(quiz),
      questions: inserted.map((q) => serializeTeacherQuizQuestion(q, null)),
    };
  }

  async updateQuiz(
    user: { id: string; role: string },
    quizId: string,
    payload: QuizPayload,
  ) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const courseId = await this.quizCourseId(quiz);
    if (!courseId) throw new NotFoundException('Course not found');
    await this.assertCourseAccess(user, courseId);
    this.validateQuizQuestions(courseId, payload.questions);
    const [updated] = await db
      .update(quizzes)
      .set({ title: payload.title })
      .where(eq(quizzes.id, quizId))
      .returning();
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    await db.delete(quizAttempts).where(eq(quizAttempts.quizId, quizId));
    const inserted = await this.insertQuizQuestions(quizId, payload.questions);
    return {
      ...serializeQuiz(updated),
      questions: inserted.map((q) => serializeTeacherQuizQuestion(q, null)),
    };
  }

  async deleteQuiz(user: { id: string; role: string }, quizId: string) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const courseId = await this.quizCourseId(quiz);
    if (!courseId) throw new NotFoundException('Course not found');
    await this.assertCourseAccess(user, courseId);
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
    return { ok: true };
  }

  async moveQuiz(
    user: { id: string; role: string },
    quizId: string,
    direction: 'up' | 'down',
  ) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const courseId = await this.quizCourseId(quiz);
    if (!courseId) throw new NotFoundException('Course not found');
    await this.assertCourseAccess(user, courseId);
    if (!quiz.lessonId && !quiz.courseId) {
      throw new BadRequestException('Unit quizzes are ordered with module items');
    }
    const rows = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(
        quiz.lessonId
          ? eq(quizzes.lessonId, quiz.lessonId)
          : eq(quizzes.courseId, quiz.courseId!),
      )
      .orderBy(asc(quizzes.displayOrder), asc(quizzes.id));
    const ids = rows.map((row) => row.id);
    const index = ids.indexOf(quizId);
    const swapIndex = index + (direction === 'up' ? -1 : 1);
    if (index === -1 || swapIndex < 0 || swapIndex >= ids.length) {
      return { ok: true };
    }
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    await Promise.all(
      ids.map((id, order) =>
        db.update(quizzes).set({ displayOrder: order }).where(eq(quizzes.id, id)),
      ),
    );
    return { ok: true };
  }

  async quizSubmissions(
    user: { id: string; role: string },
    groupId: string,
    quizId: string,
  ) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    if ((await this.quizCourseId(quiz)) !== group.courseId) {
      throw new ForbiddenException('Quiz not in this group course');
    }
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.displayOrder));
    const rows = await db
      .select({
        attempt: quizAttempts,
        student: {
          id: users.id,
          name: users.name,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(quizAttempts)
      .innerJoin(users, eq(quizAttempts.studentId, users.id))
      .where(
        and(
          eq(quizAttempts.groupId, groupId),
          eq(quizAttempts.quizId, quizId),
        ),
      )
      .orderBy(asc(quizAttempts.submittedAt));
    return {
      quiz: { id: quiz.id, title: quiz.title },
      questions: questions.map((q) => serializeTeacherQuizQuestion(q, null)),
      submissions: rows.map(({ attempt, student }) => ({
        id: attempt.id,
        student,
        score: attempt.score,
        maxScore: attempt.maxScore,
        pending: attempt.pending,
        answers: attempt.answersJson as Record<string, string>,
        writtenGrades: attempt.writtenGrades ?? null,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  async gradeQuizAttempt(
    user: { id: string; role: string },
    attemptId: string,
    grades: Record<string, number>,
  ) {
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId));
    if (!attempt) throw new NotFoundException('Attempt not found');
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, attempt.quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const courseId = await this.quizCourseId(quiz);
    if (!courseId) throw new NotFoundException('Course not found');
    await this.assertCourseAccess(user, courseId);

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, attempt.quizId));
    const answers = attempt.answersJson as Record<string, string>;
    let score = 0;
    let maxScore = 0;
    for (const question of questions) {
      if (question.questionType === 'WRITTEN') {
        const value = grades[question.id];
        if (typeof value !== 'number') {
          throw new BadRequestException('Every written answer needs a grade');
        }
        const maxPoints = question.points ?? 10;
        if (value < 0 || value > maxPoints) {
          throw new BadRequestException(
            `Grade for question ${question.id} must be between 0 and ${maxPoints}`,
          );
        }
        score += value;
        maxScore += maxPoints;
      } else {
        maxScore += question.points;
        if (
          answers[question.id] !== undefined &&
          answers[question.id].trim().toLowerCase() ===
            question.correctAnswer.trim().toLowerCase()
        ) {
          score += question.points;
        }
      }
    }
    const [updated] = await db
      .update(quizAttempts)
      .set({ score, maxScore, pending: false, writtenGrades: grades })
      .where(eq(quizAttempts.id, attemptId))
      .returning();
    return serializeQuizAttempt(updated);
  }

  private async upsertQuizFor(
    target: { lessonId?: string; moduleId?: string; courseId?: string },
    courseId: string,
    payload: QuizPayload,
  ) {
    this.validateQuizQuestions(courseId, payload.questions);

    const targetCondition = target.lessonId
      ? eq(quizzes.lessonId, target.lessonId)
      : target.moduleId
        ? eq(quizzes.moduleId, target.moduleId)
        : eq(quizzes.courseId, target.courseId!);
    let quiz = (await db.select().from(quizzes).where(targetCondition))[0];
    if (!quiz) {
      const displayOrder = target.moduleId
        ? (
            await db
              .select({ id: lessons.id })
              .from(lessons)
              .where(eq(lessons.moduleId, target.moduleId))
          ).length
        : 0;
      quiz = (
        await db
          .insert(quizzes)
          .values({ ...target, title: payload.title, displayOrder })
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
              imageKey: q.imageKey ?? null,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: q.points ?? 1,
              displayOrder: i,
            })),
          )
          .returning()
      : [];

    return {
      ...serializeQuiz(quiz),
      questions: inserted.map((q) => serializeTeacherQuizQuestion(q, null)),
    };
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

  async entryCodes(user: { id: string; role: string }, groupId: string) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const codes = await db
      .select()
      .from(groupEntryCodes)
      .where(eq(groupEntryCodes.groupId, groupId))
      .orderBy(desc(groupEntryCodes.createdAt));
    const uses = codes.length
      ? await db
          .select({
            entryCodeId: groupEntryCodeUses.entryCodeId,
            studentId: groupEntryCodeUses.studentId,
            name: users.name,
            phoneNumber: users.phoneNumber,
            usedAt: groupEntryCodeUses.usedAt,
          })
          .from(groupEntryCodeUses)
          .innerJoin(users, eq(groupEntryCodeUses.studentId, users.id))
          .where(
            inArray(
              groupEntryCodeUses.entryCodeId,
              codes.map((code) => code.id),
            ),
          )
          .orderBy(desc(groupEntryCodeUses.usedAt))
      : [];
    return {
      group: serializeGroup(group),
      codes: codes.map((code) => ({
        id: code.id,
        groupId: code.groupId,
        code: code.code,
        maxUses: code.maxUses,
        usedCount: code.usedCount,
        usedUp: code.usedCount >= code.maxUses,
        createdAt: code.createdAt.toISOString(),
        uses: uses
          .filter((use) => use.entryCodeId === code.id)
          .map(({ studentId, name, phoneNumber, usedAt }) => ({
            studentId,
            name,
            phoneNumber,
            usedAt: usedAt.toISOString(),
          })),
      })),
    };
  }

  async createEntryCode(
    user: { id: string; role: string },
    groupId: string,
    maxUses: number,
  ) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    await this.entitlementsService.assertCanCreateEntryCode(user.id, maxUses);
    let code = genEntryCode();
    for (let i = 0; i < 5; i++) {
      const duplicate = await db
        .select({ id: groupEntryCodes.id })
        .from(groupEntryCodes)
        .where(eq(groupEntryCodes.code, code))
        .limit(1);
      if (!duplicate.length) break;
      code = genEntryCode();
    }
    const [created] = await db
      .insert(groupEntryCodes)
      .values({ groupId, code, maxUses })
      .returning();
    return {
      group: serializeGroup(group),
      code: {
        id: created.id,
        groupId: created.groupId,
        code: created.code,
        maxUses: created.maxUses,
        usedCount: created.usedCount,
        usedUp: false,
        createdAt: created.createdAt.toISOString(),
        uses: [],
      },
    };
  }

  private async assertOwnsGroup(user: { id: string; role: string }, groupId: string) {
    const [row] = await db
      .select({ group: groups, course: courses })
      .from(groups)
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groups.id, groupId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    if (!row) throw new NotFoundException('Group not found');
    if (row.course.teacherId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not your group');
    }
    return row;
  }

  private async fallbackGroupName(courseId: string, groupId?: string) {
    const [course] = await db
      .select({ title: courses.title })
      .from(courses)
      .where(eq(courses.id, courseId));
    const rows = await db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(and(eq(groups.courseId, courseId), isNull(groups.deletedAt)));
    const index = groupId ? rows.findIndex((row) => row.id === groupId) : -1;
    let n = index >= 0 ? index + 1 : rows.length + 1;
    const used = new Set(
      rows.filter((row) => row.id !== groupId).map((row) => row.name),
    );
    let name = `${course?.title ?? ''}-${n}`;
    while (used.has(name)) {
      n += 1;
      name = `${course?.title ?? ''}-${n}`;
    }
    return name;
  }

  async addGroup(
    user: { id: string; role: string },
    courseId: string,
    dto: {
      name: string;
      days?: string | null;
      time?: string | null;
      students?: Array<{ name: string; phoneNumber: string }>;
      requiresEntryCode?: boolean;
    },
  ) {
    const course = await this.assertCourseAccess(user, courseId);
    if (dto.students?.length) {
      await this.entitlementsService.assertCanAddStudents(
        user.id,
        dto.students.map((s) => s.phoneNumber),
      );
    }
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
      .values({
        courseId,
        name: dto.name.trim() || (await this.fallbackGroupName(course.id)),
        days: dto.days?.trim() || null,
        time: dto.time?.trim() || null,
        joinCode,
        requiresEntryCode: dto.requiresEntryCode ?? true,
      })
      .returning();
    if (dto.students?.length) {
      try {
        await this.bulkAddStudents(user, group.id, dto.students);
      } catch (error) {
        await db.delete(groups).where(eq(groups.id, group.id));
        throw error;
      }
    }
    return serializeGroup(group);
  }

  async updateGroup(
    user: { id: string; role: string },
    groupId: string,
    dto: {
      name?: string;
      days?: string | null;
      time?: string | null;
      isActive?: boolean;
      joinCode?: string;
      whatsappMessage?: string | null;
      requiresEntryCode?: boolean;
    },
  ) {
    const { group, course } = await this.assertOwnsGroup(user, groupId);
    if (dto.isActive === true && !group.isActive) {
      await this.entitlementsService.assertCanReactivateGroup(user.id, groupId);
    }
    const patch: Partial<typeof groups.$inferInsert> = {};
    if (dto.name !== undefined) {
      patch.name =
        dto.name.trim() || (await this.fallbackGroupName(course.id, groupId));
    }
    if (dto.days !== undefined) patch.days = dto.days?.trim() || null;
    if (dto.time !== undefined) patch.time = dto.time?.trim() || null;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.whatsappMessage !== undefined) {
      patch.whatsappMessage = dto.whatsappMessage?.trim() || null;
    }
    if (dto.requiresEntryCode !== undefined) {
      patch.requiresEntryCode = dto.requiresEntryCode;
    }
    if (dto.joinCode !== undefined) {
      const joinCode = dto.joinCode.trim().toUpperCase();
      const duplicate = await db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.joinCode, joinCode), ne(groups.id, groupId)))
        .limit(1);
      if (duplicate.length) {
        throw new BadRequestException('Join code is already in use');
      }
      patch.joinCode = joinCode;
    }
    const [updated] = await db
      .update(groups)
      .set(patch)
      .where(eq(groups.id, groupId))
      .returning();
    return serializeGroup(updated);
  }

  async groupPacing(user: { id: string; role: string }, groupId: string) {
    const { course, group } = await this.assertOwnsGroup(user, groupId);
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
    const lessonIds = allLessons.map((lesson) => lesson.id);
    const modIds = mods.map((module) => module.id);
    const quizTargets = [
      eq(quizzes.courseId, course.id),
      ...(modIds.length ? [inArray(quizzes.moduleId, modIds)] : []),
      ...(lessonIds.length ? [inArray(quizzes.lessonId, lessonIds)] : []),
    ];
    const quizRows = await db.select().from(quizzes).where(or(...quizTargets));
    const quizAccessRows = quizRows.length
      ? await db
          .select()
          .from(groupQuizAccess)
          .where(
            and(
              eq(groupQuizAccess.groupId, groupId),
              inArray(groupQuizAccess.quizId, quizRows.map((quiz) => quiz.id)),
            ),
          )
      : [];
    const orderedQuizzes: Array<{
      quiz: typeof quizRows[number];
      scope: 'course' | 'module' | 'lesson';
      contextTitle: string;
    }> = [];
    const byOrder = (a: typeof quizRows[number], b: typeof quizRows[number]) =>
      a.displayOrder - b.displayOrder || a.id.localeCompare(b.id);
    quizRows
      .filter((quiz) => quiz.courseId === course.id)
      .sort(byOrder)
      .forEach((quiz) =>
        orderedQuizzes.push({ quiz, scope: 'course', contextTitle: course.title }),
      );
    for (const mod of mods) {
      quizRows
        .filter((quiz) => quiz.moduleId === mod.id)
        .sort(byOrder)
        .forEach((quiz) =>
          orderedQuizzes.push({ quiz, scope: 'module', contextTitle: mod.title }),
        );
      for (const lesson of allLessons.filter((row) => row.moduleId === mod.id)) {
        quizRows
          .filter((quiz) => quiz.lessonId === lesson.id)
          .sort(byOrder)
          .forEach((quiz) =>
            orderedQuizzes.push({ quiz, scope: 'lesson', contextTitle: lesson.title }),
          );
      }
    }
    return {
      group: serializeGroup(group),
      lessons: allLessons.map((lesson) => {
        const row = accessRows.find((access) => access.lessonId === lesson.id);
        return {
          ...serializeLesson(lesson),
          unlocked: row ? row.isUnlocked : group.unlockAllByDefault,
          overridden: !!row,
          hidden: row?.isHidden ?? false,
        };
      }),
      quizzes: orderedQuizzes.map(({ quiz, scope, contextTitle }) => ({
        ...serializeQuiz(quiz),
        scope,
        contextTitle,
        hidden:
          quizAccessRows.find((access) => access.quizId === quiz.id)?.isHidden ??
          false,
      })),
    };
  }

  async setLessonAccess(
    user: { id: string; role: string },
    groupId: string,
    lessonId: string,
    dto: { isUnlocked?: boolean; isHidden?: boolean },
  ) {
    const { course, group } = await this.assertOwnsGroup(user, groupId);
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
    const [existing] = await db
      .select()
      .from(groupLessonAccess)
      .where(
        and(
          eq(groupLessonAccess.groupId, groupId),
          eq(groupLessonAccess.lessonId, lessonId),
        ),
      );
    const isUnlocked =
      dto.isUnlocked ?? existing?.isUnlocked ?? group.unlockAllByDefault;
    const isHidden = dto.isHidden ?? existing?.isHidden ?? false;
    await db
      .insert(groupLessonAccess)
      .values({ groupId, lessonId, isUnlocked, isHidden })
      .onConflictDoUpdate({
        target: [groupLessonAccess.groupId, groupLessonAccess.lessonId],
        set: { isUnlocked, isHidden },
      });
    return { ok: true };
  }

  async setQuizVisibility(
    user: { id: string; role: string },
    groupId: string,
    quizId: string,
    isHidden: boolean,
  ) {
    const { course } = await this.assertOwnsGroup(user, groupId);
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    let courseId = quiz.courseId;
    if (quiz.moduleId) {
      const [mod] = await db
        .select({ courseId: modules.courseId })
        .from(modules)
        .where(eq(modules.id, quiz.moduleId));
      courseId = mod?.courseId ?? null;
    } else if (quiz.lessonId) {
      const [lesson] = await db
        .select({ moduleId: lessons.moduleId })
        .from(lessons)
        .where(eq(lessons.id, quiz.lessonId));
      const [mod] = lesson
        ? await db
            .select({ courseId: modules.courseId })
            .from(modules)
            .where(eq(modules.id, lesson.moduleId))
        : [];
      courseId = mod?.courseId ?? null;
    }
    if (courseId !== course.id) throw new ForbiddenException('Quiz not in this course');
    await db
      .insert(groupQuizAccess)
      .values({ groupId, quizId, isHidden })
      .onConflictDoUpdate({
        target: [groupQuizAccess.groupId, groupQuizAccess.quizId],
        set: { isHidden },
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
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)));

    const mods = await db.select().from(modules).where(eq(modules.courseId, group.courseId));
    const courseLessons = mods.length
      ? await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
      : [];
    const access = courseLessons.length
      ? await db
          .select()
          .from(groupLessonAccess)
          .where(
            and(
              eq(groupLessonAccess.groupId, groupId),
              inArray(groupLessonAccess.lessonId, courseLessons.map((l) => l.id)),
            ),
          )
      : [];
    const visibleLessons = courseLessons.filter(
      (lesson) =>
        !access.find(
          (row) => row.lessonId === lesson.id && row.isHidden,
        ),
    );
    const unlocked = visibleLessons.filter((lesson) => {
      const row = access.find((accessRow) => accessRow.lessonId === lesson.id);
      return row ? row.isUnlocked : group.unlockAllByDefault;
    });
    const completions =
      roster.length && visibleLessons.length
        ? await db
            .select({ studentId: lessonCompletions.studentId, lessonId: lessonCompletions.lessonId })
            .from(lessonCompletions)
            .where(
              and(
                inArray(lessonCompletions.studentId, roster.map((r) => r.studentId)),
                inArray(lessonCompletions.lessonId, visibleLessons.map((l) => l.id)),
              ),
            )
        : [];

    return {
      group: serializeGroup(group),
      students: roster.map((r) => {
        const done = completions.filter(
          (c) =>
            c.studentId === r.studentId &&
            unlocked.some((l) => l.id === c.lessonId),
        ).length;
        return {
          ...r,
          completedLessons: done,
          totalLessons: unlocked.length,
          progress: unlocked.length ? Math.round((done / unlocked.length) * 100) : 0,
        };
      }),
    };
  }

  private async assertLessonInCourse(courseId: string, lessonId: string) {
    const [row] = await db
      .select({ id: lessons.id, title: lessons.title })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(eq(lessons.id, lessonId), eq(modules.courseId, courseId)));
    if (!row) throw new NotFoundException('Lesson not found');
    return row;
  }

  async getAttendance(
    user: { id: string; role: string },
    groupId: string,
    lessonId: string,
  ) {
    const { course } = await this.assertOwnsGroup(user, groupId);
    const lesson = await this.assertLessonInCourse(course.id, lessonId);
    const roster = await db
      .select({ studentId: users.id, name: users.name })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)))
      .orderBy(asc(users.name));
    const marks = roster.length
      ? await db
          .select()
          .from(lessonAttendance)
          .where(
            and(
              eq(lessonAttendance.lessonId, lessonId),
              inArray(
                lessonAttendance.studentId,
                roster.map((row) => row.studentId),
              ),
            ),
          )
      : [];
    return {
      lessonId,
      title: lesson.title,
      students: roster.map((student) => {
        const mark = marks.find((row) => row.studentId === student.studentId);
        return {
          ...student,
          isPresent: mark?.isPresent ?? null,
          markedAt: mark?.markedAt.toISOString() ?? null,
        };
      }),
    };
  }

  async setAttendance(
    user: { id: string; role: string },
    groupId: string,
    lessonId: string,
    records: Array<{ studentId: string; isPresent: boolean }>,
  ) {
    const { course } = await this.assertOwnsGroup(user, groupId);
    await this.assertLessonInCourse(course.id, lessonId);
    const roster = await db
      .select({ studentId: groupStudents.studentId })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)));
    const enrolled = new Set(roster.map((row) => row.studentId));
    if (records.some((record) => !enrolled.has(record.studentId))) {
      throw new BadRequestException('Student not in group');
    }
    await db
      .insert(lessonAttendance)
      .values(records.map((record) => ({ lessonId, ...record })))
      .onConflictDoUpdate({
        target: [lessonAttendance.lessonId, lessonAttendance.studentId],
        set: {
          isPresent: sql`excluded.is_present`,
          markedAt: new Date(),
        },
      });
    return this.getAttendance(user, groupId, lessonId);
  }

  async groupStats(user: { id: string; role: string }, groupId: string) {
    const { course, group } = await this.assertOwnsGroup(user, groupId);
    const mods = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(asc(modules.displayOrder));
    const rawCourseLessons = mods.length
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
          .orderBy(asc(lessons.displayOrder))
      : [];
    const hiddenLessonRows = rawCourseLessons.length
      ? await db
          .select({ lessonId: groupLessonAccess.lessonId })
          .from(groupLessonAccess)
          .where(
            and(
              eq(groupLessonAccess.groupId, groupId),
              eq(groupLessonAccess.isHidden, true),
              inArray(
                groupLessonAccess.lessonId,
                rawCourseLessons.map((l) => l.id),
              ),
            ),
          )
      : [];
    const hiddenLessonIds = new Set(hiddenLessonRows.map((r) => r.lessonId));
    const courseLessons = rawCourseLessons.filter(
      (l) => !hiddenLessonIds.has(l.id),
    );
    const roster = await db
      .select({ id: users.id, name: users.name })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)))
      .orderBy(asc(users.name));
    const lessonIds = courseLessons.map((lesson) => lesson.id);
    const completions =
      roster.length && lessonIds.length
        ? await db
            .select({
              studentId: lessonCompletions.studentId,
              lessonId: lessonCompletions.lessonId,
            })
            .from(lessonCompletions)
            .where(
              and(
                inArray(
                  lessonCompletions.studentId,
                  roster.map((student) => student.id),
                ),
                inArray(lessonCompletions.lessonId, lessonIds),
              ),
            )
        : [];
    const attendanceRecords =
      roster.length && lessonIds.length
        ? await db
            .select({
              studentId: lessonAttendance.studentId,
              lessonId: lessonAttendance.lessonId,
              isPresent: lessonAttendance.isPresent,
            })
            .from(lessonAttendance)
            .where(
              and(
                inArray(
                  lessonAttendance.studentId,
                  roster.map((student) => student.id),
                ),
                inArray(lessonAttendance.lessonId, lessonIds),
              ),
            )
        : [];
    const quizTargets = [
      eq(quizzes.courseId, course.id),
      ...(mods.length ? [inArray(quizzes.moduleId, mods.map((m) => m.id))] : []),
      ...(lessonIds.length ? [inArray(quizzes.lessonId, lessonIds)] : []),
    ];
    const quizRows = await db.select().from(quizzes).where(or(...quizTargets));
    const hiddenQuizRows = quizRows.length
      ? await db
          .select({ quizId: groupQuizAccess.quizId })
          .from(groupQuizAccess)
          .where(
            and(
              eq(groupQuizAccess.groupId, groupId),
              eq(groupQuizAccess.isHidden, true),
              inArray(groupQuizAccess.quizId, quizRows.map((q) => q.id)),
            ),
          )
      : [];
    const hiddenQuizIds = new Set(hiddenQuizRows.map((r) => r.quizId));
    const visibleQuizRows = quizRows.filter(
      (q) => !hiddenQuizIds.has(q.id) && (!q.lessonId || !hiddenLessonIds.has(q.lessonId)),
    );

    const questions = visibleQuizRows.length
      ? await db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, visibleQuizRows.map((quiz) => quiz.id)))
      : [];
    const questionTotals: Record<string, number> = {};
    for (const question of questions) {
      questionTotals[question.quizId] =
        (questionTotals[question.quizId] ?? 0) + (question.points ?? (question.questionType === 'WRITTEN' ? 10 : 1));
    }
    const attempts =
      roster.length && visibleQuizRows.length
        ? await db
            .select()
            .from(quizAttempts)
            .where(
              and(
                eq(quizAttempts.groupId, groupId),
                inArray(
                  quizAttempts.studentId,
                  roster.map((student) => student.id),
                ),
                inArray(
                  quizAttempts.quizId,
                  visibleQuizRows.map((quiz) => quiz.id),
                ),
              ),
            )
        : [];
    const bestGraded = new Map<string, number>();
    for (const attempt of attempts) {
      if (attempt.pending) continue;
      const key = `${attempt.studentId}:${attempt.quizId}`;
      if ((bestGraded.get(key) ?? -1) < attempt.score) bestGraded.set(key, attempt.score);
    }

    const completedLessons = new Set(completions.map((row) => row.lessonId));
    const lessonsTaken = courseLessons.filter((lesson) =>
      completedLessons.has(lesson.id),
    ).length;
    const unitsTaken = mods.filter((mod) =>
      courseLessons.some(
        (lesson) =>
          lesson.moduleId === mod.id && completedLessons.has(lesson.id),
      ),
    ).length;
    const percent = (part: number, total: number) =>
      total ? Math.round((part / total) * 100) : 0;

    const attendance = courseLessons.map((lesson) => {
      const lessonRecords = attendanceRecords.filter(
        (row) => row.lessonId === lesson.id,
      );
      const present = lessonRecords.filter((row) => row.isPresent).length;
      return {
        lessonId: lesson.id,
        title: lesson.title,
        moduleTitle:
          mods.find((mod) => mod.id === lesson.moduleId)?.title ?? '',
        present,
        total: roster.length,
        percent: percent(present, roster.length),
      };
    });

    const quizAverages = visibleQuizRows.map((quiz) => {
      const max = questionTotals[quiz.id] ?? 0;
      const scores = roster
        .map((student) => bestGraded.get(`${student.id}:${quiz.id}`))
        .filter((score): score is number => score !== undefined);
      return {
        quizId: quiz.id,
        title: quiz.title,
        contextTitle:
          courseLessons.find((lesson) => lesson.id === quiz.lessonId)?.title ??
          mods.find((mod) => mod.id === quiz.moduleId)?.title ??
          course.title,
        average:
          max && scores.length
            ? Math.round(
                (scores.reduce(
                  (sum, score) => sum + Math.min(score, max) / max,
                  0,
                ) /
                  scores.length) *
                  100,
              )
            : null,
        attempts: scores.length,
      };
    });

    const manualCols = await db
      .select()
      .from(manualGradeColumns)
      .where(eq(manualGradeColumns.groupId, groupId))
      .orderBy(asc(manualGradeColumns.displayOrder));
    const manualVals = manualCols.length && roster.length
      ? await db
          .select()
          .from(manualGradeValues)
          .where(
            and(
              inArray(manualGradeValues.columnId, manualCols.map((c) => c.id)),
              inArray(manualGradeValues.studentId, roster.map((s) => s.id)),
            ),
          )
      : [];

    const students = roster.map((student) => {
      let earned = 0;
      let studentMax = 0;
      for (const quiz of visibleQuizRows) {
        const score = bestGraded.get(`${student.id}:${quiz.id}`);
        if (score !== undefined) {
          const max = questionTotals[quiz.id] ?? 0;
          earned += Math.min(score, max);
          studentMax += max;
        }
      }
      for (const col of manualCols) {
        const val = manualVals.find(
          (v) => v.studentId === student.id && v.columnId === col.id,
        );
        if (val && val.score !== null) {
          earned += val.score;
          studentMax += col.maxScore;
        }
      }
      const gradePercent = studentMax ? Math.round((earned / studentMax) * 100) : null;
      const studentAttendance = attendanceRecords.filter(
        (row) => row.studentId === student.id,
      );
      const marked = studentAttendance.length;
      const present = studentAttendance.filter((row) => row.isPresent).length;
      const attendancePercent = percent(present, marked);
      const parts = [
        gradePercent,
        attendancePercent,
      ].filter((value): value is number => value !== null);
      return {
        id: student.id,
        name: student.name,
        gradePercent,
        attendancePercent,
        combined: parts.length
          ? Math.round(
              parts.reduce((sum, value) => sum + value, 0) / parts.length,
            )
          : 0,
      };
    });

    return {
      group: serializeGroup(group),
      startDate: group.createdAt.toISOString(),
      lessons: {
        taken: lessonsTaken,
        total: courseLessons.length,
        percent: percent(lessonsTaken, courseLessons.length),
      },
      units: {
        taken: unitsTaken,
        total: mods.length,
        percent: percent(unitsTaken, mods.length),
      },
      attendance,
      quizAverages,
      students,
    };
  }

  async announce(user: { id: string; role: string }, groupId: string, message: string) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    const students = await db
      .select({ id: groupStudents.studentId })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)));
    const studentIds = students.map((s) => s.id);
    const parents = studentIds.length
      ? await db
          .select({ id: parentStudents.parentId })
          .from(parentStudents)
          .where(
            and(
              inArray(parentStudents.studentId, studentIds),
              isNull(parentStudents.deletedAt),
            ),
          )
      : [];
    const text = `📣 ${group.name}: ${message}`;
    const parentIds = [...new Set(parents.map((p) => p.id))];
    await Promise.all([
      ...studentIds.map((id) => this.notifications.sendInApp(id, text, 'TEACHER')),
      ...parentIds.map((id) => this.notifications.sendInApp(id, text, 'PARENT')),
    ]);
    return { sent: studentIds.length + parentIds.length };
  }

  async searchStudents(phone: string) {
    return db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'STUDENT'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
          ilike(users.phoneNumber, `%${phone}%`),
        ),
      )
      .orderBy(asc(users.name))
      .limit(10);
  }

  async bulkAddStudents(
    user: { id: string; role: string },
    groupId: string,
    students: Array<{ name: string; phoneNumber: string }>,
  ) {
    const { group } = await this.assertOwnsGroup(user, groupId);
    if (!group.isActive) {
      throw new BadRequestException('Group is inactive');
    }
    await this.entitlementsService.assertCanAddStudents(
      user.id,
      students.map((s) => s.phoneNumber),
    );
    const results: Array<{ phoneNumber: string; created: boolean; enrolled: boolean }> = [];
    for (const s of students) {
      let [existing] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, s.phoneNumber));
      if (existing && (existing.role !== 'STUDENT' || existing.deletedAt)) {
        throw new BadRequestException(`Phone number ${s.phoneNumber} is registered to a non-student or deactivated account`);
      }
      let created = false;
      if (!existing) {
        // ponytail: phone digits are the first password; the student must change it on first login.
        const email = `${s.phoneNumber.replace(/[^\d]/g, '')}@phone.emtiaz.om`;
        const monitoringCode = await generateUniqueMonitoringCode();
        try {
          const data = await auth.api.signUpEmail({
            body: {
              name: s.name,
              email,
              password: s.phoneNumber.replace(/[^\d]/g, ''),
              role: 'STUDENT',
              phoneNumber: s.phoneNumber,
              monitoringCode,
            },
            returnHeaders: true,
          });
          [existing] = await db.select().from(users).where(eq(users.id, data.response.user.id));
          await db.update(users).set({ mustChangePassword: true, monitoringCode }).where(eq(users.id, existing.id));
          created = true;
        } catch {
          // race on unique phone; re-select
          [existing] = await db
            .select()
            .from(users)
            .where(eq(users.phoneNumber, s.phoneNumber));
        }
      }
      if (!existing) {
        throw new BadRequestException(`Could not create student ${s.phoneNumber}`);
      }
      if (existing.role !== 'STUDENT' || existing.deletedAt) {
        throw new BadRequestException(`Phone number ${s.phoneNumber} is registered to a non-student or deactivated account`);
      }
      if (!existing.monitoringCode) {
        const monitoringCode = await generateUniqueMonitoringCode();
        await db.update(users).set({ monitoringCode }).where(eq(users.id, existing.id));
        existing.monitoringCode = monitoringCode;
      }
      const enrolled = await this.enrollWithPasswordless(existing.id, group.id);
      results.push({ phoneNumber: s.phoneNumber, created, enrolled });
    }
    if (results.some((r) => r.enrolled)) {
      await this.entitlementsService.checkAndUnlockReferralReward(user.id);
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
      await this.notifyEnrolled(studentId, groupId);
      return true;
    }
    return false;
  }

  private async notifyEnrolled(studentId: string, groupId: string) {
    try {
      const [[student], [group]] = await Promise.all([
        db.select().from(users).where(eq(users.id, studentId)),
        db.select().from(groups).where(eq(groups.id, groupId)),
      ]);
      if (!student || !group) return;
      const message = `تم تسجيلك في «${group.name}» بنجاح 🎉`;
      await this.notifications.sendInApp(studentId, message, 'TEACHER');
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
          this.notifications.sendInApp(
            p.id,
            `تم تسجيل ${student.name} في «${group.name}»`,
            'PARENT',
          ),
        ),
      );
    } catch (e) {
      logger.error({ err: e }, 'teacher enrollment notification failed');
    }
  }

  async moveStudent(
    user: { id: string; role: string },
    studentId: string,
    fromGroupId: string,
    toGroupId: string,
  ) {
    await this.assertOwnsGroup(user, fromGroupId);
    const to = await this.assertOwnsGroup(user, toGroupId);
    if (!to.group.isActive) {
      throw new BadRequestException('Target group is inactive');
    }
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
      .where(and(eq(groupStudents.groupId, groupId), isNull(users.deletedAt)));

    // Quiz columns: one per lesson that has a quiz in this course
    const mods = await db.select().from(modules).where(eq(modules.courseId, course.id));
    const rawLessons = mods.length
      ? await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
      : [];
    const hiddenLessonRows = rawLessons.length
      ? await db
          .select({ lessonId: groupLessonAccess.lessonId })
          .from(groupLessonAccess)
          .where(
            and(
              eq(groupLessonAccess.groupId, groupId),
              eq(groupLessonAccess.isHidden, true),
              inArray(groupLessonAccess.lessonId, rawLessons.map((l) => l.id)),
            ),
          )
      : [];
    const hiddenLessonIds = new Set(hiddenLessonRows.map((r) => r.lessonId));
    const lessonsInCourse = rawLessons.filter((l) => !hiddenLessonIds.has(l.id));

    const quizTargets = [
      eq(quizzes.courseId, course.id),
      ...(mods.length ? [inArray(quizzes.moduleId, mods.map((m) => m.id))] : []),
      ...(lessonsInCourse.length ? [inArray(quizzes.lessonId, lessonsInCourse.map((l) => l.id))] : []),
    ];
    const quizRows = await db.select().from(quizzes).where(or(...quizTargets));
    const hiddenQuizRows = quizRows.length
      ? await db
          .select({ quizId: groupQuizAccess.quizId })
          .from(groupQuizAccess)
          .where(
            and(
              eq(groupQuizAccess.groupId, groupId),
              eq(groupQuizAccess.isHidden, true),
              inArray(groupQuizAccess.quizId, quizRows.map((q) => q.id)),
            ),
          )
      : [];
    const hiddenQuizIds = new Set(hiddenQuizRows.map((r) => r.quizId));
    const visibleQuizRows = quizRows.filter(
      (q) => !hiddenQuizIds.has(q.id) && (!q.lessonId || !hiddenLessonIds.has(q.lessonId)),
    );

    const questionTotals: Record<string, number> = {};
    if (visibleQuizRows.length) {
      const qq = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, visibleQuizRows.map((q) => q.id)));
      for (const q of qq) {
        questionTotals[q.quizId] =
          (questionTotals[q.quizId] ?? 0) +
          (q.points ?? (q.questionType === 'WRITTEN' ? 10 : 1));
      }
    }
    const quizLabels = Object.fromEntries(
      visibleQuizRows.map((q) => [
        q.id,
        lessonsInCourse.find((l) => l.id === q.lessonId)?.title ??
          mods.find((m) => m.id === q.moduleId)?.title ??
          (q.courseId ? course.title : q.title),
      ]),
    );

    const attempts = roster.length && visibleQuizRows.length
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
              inArray(
                quizAttempts.quizId,
                visibleQuizRows.map((q) => q.id),
              ),
            ),
          )
      : [];

    const quizColumns = visibleQuizRows.map((q) => ({
      quizId: q.id,
      lessonTitle: quizLabels[q.id],
      maxScore: questionTotals[q.id] ?? 0,
    }));

    const studentQuizAttempts = new Map<string, (typeof attempts)[number][]>();
    for (const a of attempts) {
      const key = `${a.studentId}:${a.quizId}`;
      const list = studentQuizAttempts.get(key) ?? [];
      list.push(a);
      studentQuizAttempts.set(key, list);
    }
    const cells: Record<string, number> = {};
    for (const [key, atts] of studentQuizAttempts.entries()) {
      const graded = atts.filter((a) => !a.pending).sort((a, b) => b.score - a.score);
      const best = graded.length
        ? graded[0]
        : atts
            .filter((a) => a.pending)
            .sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime(),
            )[0];
      if (best) {
        cells[key] = best.score;
      }
    }

    const attendanceRows =
      roster.length && lessonsInCourse.length
        ? await db
            .select({
              studentId: lessonAttendance.studentId,
              lessonId: lessonAttendance.lessonId,
              isPresent: lessonAttendance.isPresent,
            })
            .from(lessonAttendance)
            .where(
              and(
                inArray(lessonAttendance.studentId, roster.map((r) => r.id)),
                inArray(lessonAttendance.lessonId, lessonsInCourse.map((l) => l.id)),
              ),
            )
        : [];
    const attendance = Object.fromEntries(
      roster.map((student) => {
        const studentRows = attendanceRows.filter(
          (row) => row.studentId === student.id,
        );
        const marked = studentRows.length;
        const present = studentRows.filter((row) => row.isPresent).length;
        return [
          student.id,
          marked ? Math.round((present / marked) * 100) : 0,
        ];
      }),
    );

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
      group: serializeGroup(group),
      students: roster,
      attendance,
      quizColumns,
      quizCells: cells,
      manualColumns: manualCols.map(serializeManualGradeColumn),
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
    return serializeManualGradeColumn(col);
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
    score: number | null,
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
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');
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
    if (score === null) {
      await db
        .delete(manualGradeValues)
        .where(
          and(
            eq(manualGradeValues.columnId, columnId),
            eq(manualGradeValues.studentId, studentId),
          ),
        );
      return { ok: true };
    }
    if (score > col.maxScore) {
      throw new BadRequestException(`score must be at most ${col.maxScore}`);
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
