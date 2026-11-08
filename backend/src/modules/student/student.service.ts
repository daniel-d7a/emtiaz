import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../../db';
import {
  categories,
  courses,
  groupHomeworkAccess,
  groupLessonAccess,
  groupQuizAccess,
  groupStudents,
  groups,
  homework,
  homeworkSubmissions,
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
import { joinGroupByCode } from '../../lib/group-join';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminService } from '../admin/admin.service';
import {
  serializeCourse,
  serializeGroup,
  serializeHomework,
  serializeHomeworkSubmission,
  serializeLesson,
  serializeModule,
  serializeQuiz,
  serializeQuizAttempt,
  serializeQuizQuestion,
  serializeStudentAttachment,
} from '../../lib/serializers';
import type {
  HomeworkSubmissionDto,
  StudentHomeworkDto,
  SubmitHomeworkDto,
} from '../../../shared/api';

const norm = (s: string) => s.trim().toLowerCase();

@Injectable()
export class StudentService {
  constructor(
    private readonly storage: StorageService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => AdminService))
    private readonly admin: AdminService,
  ) {}

  private async signedBanner(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.presignedGet(key);
    } catch {
      return null;
    }
  }

  private async signedAvatar(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.presignedGet(key);
    } catch {
      return null;
    }
  }

  private async assertEnrolled(studentId: string, groupId: string) {
    const rows = await db
      .select({ membership: groupStudents, group: groups })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groupStudents.groupId, groupId),
          eq(groupStudents.studentId, studentId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
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
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, mod.courseId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
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
    const visible = relevant.filter(
      (enrollment) =>
        !overrides.find(
          (override) =>
            override.groupId === enrollment.group.id && override.isHidden,
        ),
    );
    if (!visible.length) throw new ForbiddenException('Lesson is hidden for your group');
    return visible.some(
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
          isTopTeacher: users.isTopTeacher,
        },
      })
      .from(groupStudents)
      .innerJoin(groups, eq(groupStudents.groupId, groups.id))
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .innerJoin(users, eq(courses.teacherId, users.id))
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
          isNull(users.deletedAt),
          eq(users.isActive, true),
        ),
      );

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
      const courseLessons = lessonRows.filter(
        (lesson) =>
          lesson.courseId === r.course.id &&
          !accessRows.some(
            (access) =>
              access.groupId === r.group.id &&
              access.lessonId === lesson.lessonId &&
              access.isHidden,
          ),
      );
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
      const { teacher } = r;
      return {
        group: serializeGroup(r.group),
        course: serializeCourse(r.course),
        teacher: {
          name: teacher.name,
          subject: teacher.subject,
          theme: teacher.theme,
          bannerUrl: teacher.banner ? bannerUrls.get(teacher.banner) ?? null : null,
          isTopTeacher: teacher.isTopTeacher,
        },
        joinedAt: r.joinedAt.toISOString(),
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
    let totalEarned = 0;
    let totalMax = 0;
    for (const g of grades) {
      const gradedQuizzes = g.quizzes.filter((q) => !q.pending);
      const nonNullManual = g.manual.filter((m) => m.score !== null);
      totalEarned +=
        gradedQuizzes.reduce((sum, q) => sum + q.score, 0) +
        nonNullManual.reduce((sum, m) => sum + (m.score ?? 0), 0);
      totalMax +=
        gradedQuizzes.reduce((sum, q) => sum + q.maxScore, 0) +
        nonNullManual.reduce((sum, m) => sum + m.maxScore, 0);
    }
    const latestCourses = [...groups]
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 3);
    return {
      stats: {
        activeGroups: groups.length,
        lessonsDone: groups.reduce((sum, g) => sum + g.completedLessons, 0),
        averageGrade: totalMax ? Math.round((totalEarned / totalMax) * 100) : 0,
      },
      latestCourses,
    };
  }

  async joinByCode(studentId: string, joinCode: string, entryCode?: string) {
    const { group, course, enrolled } = await joinGroupByCode(studentId, joinCode, entryCode);
    if (enrolled) {
      await this.notifyEnrolled(studentId, group);
      await this.admin.audit(studentId, 'student.enroll', 'group', group.id, {
        courseId: course.id,
        joinCode,
      });
    }
    return { group: serializeGroup(group), course: serializeCourse(course) };
  }

  /** One welcome note per new enrollment; failure never blocks the join. */
  private async notifyEnrolled(studentId: string, groupRow: typeof groups.$inferSelect) {
    const [student] = await db.select().from(users).where(eq(users.id, studentId));
    const message = `تم تسجيلك في «${groupRow.name}» بنجاح 🎉`;
    await this.notifications.sendWhatsApp(student?.phoneNumber ?? '', message, 'TEACHER');
    await this.notifications.sendInApp(studentId, message, 'TEACHER');
    if (student) {
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
          this.notifications.sendInApp(p.id, `تم تسجيل ${student.name} في «${groupRow.name}»`, 'PARENT'),
        ),
      );
    }
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
    const hiddenQuizRows = await db
      .select({ quizId: groupQuizAccess.quizId })
      .from(groupQuizAccess)
      .where(
        and(
          eq(groupQuizAccess.groupId, groupId),
          eq(groupQuizAccess.isHidden, true),
        ),
      );
    const hiddenQuizIds = new Set(hiddenQuizRows.map((row) => row.quizId));
    const visibleLessons = allLessons.filter(
      (lesson) =>
        !accessRows.some(
          (access) => access.lessonId === lesson.id && access.isHidden,
        ),
    );

    const lessonIds = visibleLessons.map((l) => l.id);
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

    const bestFor = (quizId?: string) => {
      const matches = attemptRows.filter((a) => quizId && a.quizId === quizId);
      if (!matches.length) return null;
      const graded = matches.filter((a) => !a.pending).sort((a, b) => b.score - a.score);
      const attempt = graded.length
        ? graded[0]
        : matches
            .filter((a) => a.pending)
            .sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime(),
            )[0];
      return attempt ? serializeQuizAttempt(attempt) : null;
    };
    const visibleQuizzes = quizRows
      .filter((q) => !hiddenQuizIds.has(q.id))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
    const withAttempt = (quiz: typeof quizRows[number]) => ({
      ...serializeQuiz(quiz),
      bestAttempt: bestFor(quiz.id),
    });
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, group.courseId));
    const [teacher] = await db
      .select({
        name: users.name,
        theme: users.landingTheme,
        banner: users.landingBanner,
        avatar: users.image,
        slug: users.landingSlug,
        published: users.landingPublished,
        isTopTeacher: users.isTopTeacher,
      })
      .from(users)
      .where(eq(users.id, course.teacherId));

    return {
      course: serializeCourse(course),
      teacher: {
        name: teacher?.name ?? '',
        theme: teacher?.theme ?? null,
        bannerUrl: await this.signedBanner(teacher?.banner ?? null),
        avatarUrl: await this.signedAvatar(teacher?.avatar ?? null),
        slug: teacher?.published ? teacher.slug : null,
        isTopTeacher: teacher?.isTopTeacher ?? false,
      },
      group: { id: group.id, name: group.name, joinCode: group.joinCode },
      quizzes: visibleQuizzes
        .filter((q) => q.courseId === group.courseId)
        .map(withAttempt),
      modules: mods.map((m) => {
        return {
          ...serializeModule(m),
          quizzes: visibleQuizzes
            .filter((q) => q.moduleId === m.id)
            .map(withAttempt),
          lessons: visibleLessons
            .filter((l) => l.moduleId === m.id)
            .map((l) => {
              const lessonQuizzes = visibleQuizzes.filter((q) => q.lessonId === l.id);
              return {
                ...serializeLesson(l),
                unlocked: isUnlocked(l.id),
                completed: completions.some((c) => c.lessonId === l.id),
                hasQuiz: lessonQuizzes.length > 0,
                bestAttempt: lessonQuizzes.length
                  ? bestFor(lessonQuizzes[0].id)
                  : null,
                quizzes: lessonQuizzes.map(withAttempt),
                attachments: attachments
                  .filter(
                    (a) =>
                      a.lessonId === l.id &&
                      (!a.groupId || a.groupId === groupId),
                  )
                  .map(serializeStudentAttachment),
              };
            }),
        };
      }),
    };
  }

  async markComplete(studentId: string, lessonId: string, groupId?: string) {
    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    const relevant = groupId ? enrollments.filter((e) => e.group.id === groupId) : enrollments;
    if (groupId && !relevant.length) {
      throw new ForbiddenException('Not enrolled in this group');
    }
    if (!relevant.some((e) => e.group.isActive)) {
      throw new BadRequestException('Group is inactive');
    }
    if (!(await this.lessonUnlocked(enrollments, lessonId, groupId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
    await db
      .insert(lessonCompletions)
      .values({ lessonId, studentId })
      .onConflictDoNothing();
    return { ok: true };
  }

  async unmarkComplete(studentId: string, lessonId: string, groupId?: string) {
    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    const relevant = groupId ? enrollments.filter((e) => e.group.id === groupId) : enrollments;
    if (groupId && !relevant.length) {
      throw new ForbiddenException('Not enrolled in this group');
    }
    if (!relevant.some((e) => e.group.isActive)) {
      throw new BadRequestException('Group is inactive');
    }
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

    let accessibleGroupIds: Set<string>;
    if (groupId) {
      accessibleGroupIds = new Set([groupId]);
    } else {
      const overrides = enrollments.length
        ? await db
            .select()
            .from(groupLessonAccess)
            .where(
              and(
                eq(groupLessonAccess.lessonId, lessonId),
                inArray(
                  groupLessonAccess.groupId,
                  enrollments.map((e) => e.group.id),
                ),
              ),
            )
        : [];
      accessibleGroupIds = new Set(
        enrollments
          .filter((e) => {
            const override = overrides.find((o) => o.groupId === e.group.id);
            if (override?.isHidden) return false;
            return override ? override.isUnlocked : e.group.unlockAllByDefault;
          })
          .map((e) => e.group.id),
      );
    }

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
        .filter((a) => !a.groupId || accessibleGroupIds.has(a.groupId))
        .map((a) => ({
          id: a.id,
          title: a.title,
          fileType: a.fileType,
          mimeType: a.mimeType,
          url: a.url,
        })),
      hasQuiz: !!(await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1)).length,
    };
  }

  async getLessonHomework(
    studentId: string,
    groupId: string,
    lessonId: string,
  ): Promise<StudentHomeworkDto[]> {
    const { group } = await this.assertEnrolled(studentId, groupId);
    if (!group.isActive) {
      throw new BadRequestException('Group is inactive');
    }

    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    if (!(await this.lessonUnlocked(enrollments, lessonId, groupId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }

    const homeworkList = await db
      .select()
      .from(homework)
      .where(
        and(
          eq(homework.lessonId, lessonId),
          or(isNull(homework.groupId), eq(homework.groupId, groupId)),
        ),
      )
      .orderBy(asc(homework.displayOrder), asc(homework.createdAt));

    if (!homeworkList.length) {
      return [];
    }

    const hwIds = homeworkList.map((h) => h.id);

    const [accessRows, submissionRows] = await Promise.all([
      db
        .select()
        .from(groupHomeworkAccess)
        .where(
          and(
            eq(groupHomeworkAccess.groupId, groupId),
            inArray(groupHomeworkAccess.homeworkId, hwIds),
          ),
        ),
      db
        .select()
        .from(homeworkSubmissions)
        .where(
          and(
            eq(homeworkSubmissions.groupId, groupId),
            eq(homeworkSubmissions.studentId, studentId),
            inArray(homeworkSubmissions.homeworkId, hwIds),
          ),
        ),
    ]);

    const accessMap = new Map(accessRows.map((a) => [a.homeworkId, a]));
    const submissionMap = new Map(submissionRows.map((s) => [s.homeworkId, s]));

    const visibleHomework = homeworkList.filter((h) => {
      const access = accessMap.get(h.id);
      return !access?.isHidden;
    });

    return visibleHomework.map((h) => {
      const access = accessMap.get(h.id);
      const sub = submissionMap.get(h.id);
      const serializedHw = serializeHomework(h, {
        dueDate: access?.dueDate ?? null,
        isHidden: access?.isHidden ?? false,
      });
      return {
        ...serializedHw,
        homework: serializedHw,
        submission: sub ? serializeHomeworkSubmission(sub, { maxScore: h.maxScore }) : null,
      };
    });
  }

  async submitHomework(
    studentId: string,
    groupId: string,
    homeworkId: string,
    dto: SubmitHomeworkDto,
  ): Promise<HomeworkSubmissionDto> {
    if (dto.fileSizeBytes !== undefined && dto.fileSizeBytes !== null) {
      if (dto.fileSizeBytes > 10 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds maximum allowed limit of 10MB');
      }
    }

    if (dto.r2ObjectKey) {
      const trimmedKey = dto.r2ObjectKey.trim();
      const validPrefix = `submissions/${homeworkId}/`;
      if (!trimmedKey.startsWith(validPrefix)) {
        throw new ForbiddenException('Invalid storage key prefix');
      }
    }

    const { group } = await this.assertEnrolled(studentId, groupId);
    if (!group.isActive) {
      throw new BadRequestException('Group is inactive');
    }

    const [hw] = await db
      .select()
      .from(homework)
      .where(eq(homework.id, homeworkId));
    if (!hw) throw new NotFoundException('Homework not found');

    if (hw.groupId && hw.groupId !== groupId) {
      throw new ForbiddenException('Homework not available for this group');
    }

    const { enrollments } = await this.lessonEnrollments(studentId, hw.lessonId);
    if (!(await this.lessonUnlocked(enrollments, hw.lessonId, groupId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }

    const [access] = await db
      .select()
      .from(groupHomeworkAccess)
      .where(
        and(
          eq(groupHomeworkAccess.groupId, groupId),
          eq(groupHomeworkAccess.homeworkId, homeworkId),
        ),
      );

    if (access?.isHidden) {
      throw new ForbiddenException('Homework is hidden for your group');
    }

    const now = new Date();
    const isLate = access?.dueDate ? now.getTime() > new Date(access.dueDate).getTime() : false;

    const [existing] = await db
      .select()
      .from(homeworkSubmissions)
      .where(
        and(
          eq(homeworkSubmissions.homeworkId, homeworkId),
          eq(homeworkSubmissions.groupId, groupId),
          eq(homeworkSubmissions.studentId, studentId),
        ),
      );

    if (existing) {
      if (existing.status === 'GRADED') {
        throw new BadRequestException('Cannot resubmit a graded assignment');
      }

      if (
        existing.r2ObjectKey &&
        dto.r2ObjectKey &&
        existing.r2ObjectKey !== dto.r2ObjectKey &&
        existing.r2ObjectKey.startsWith(`submissions/${homeworkId}/`)
      ) {
        try {
          await this.storage.deleteObject(existing.r2ObjectKey);
        } catch {
          // ignore cleanup errors
        }
      }

      const [updated] = await db
        .update(homeworkSubmissions)
        .set({
          content: dto.content !== undefined ? (dto.content?.trim() || null) : existing.content,
          attachmentType: dto.attachmentType ?? existing.attachmentType,
          r2ObjectKey: dto.r2ObjectKey !== undefined ? (dto.r2ObjectKey?.trim() || null) : existing.r2ObjectKey,
          url: dto.url !== undefined ? (dto.url?.trim() || null) : existing.url,
          fileSizeBytes: dto.fileSizeBytes !== undefined ? dto.fileSizeBytes : existing.fileSizeBytes,
          mimeType: dto.mimeType !== undefined ? (dto.mimeType?.trim() || null) : existing.mimeType,
          status: 'SUBMITTED',
          isLate,
          revisionCount: existing.revisionCount + 1,
          submittedAt: now,
        })
        .where(eq(homeworkSubmissions.id, existing.id))
        .returning();

      await this.admin.audit(studentId, 'homework.submit', 'homework_submission', updated.id, {
        homeworkId,
        groupId,
        isLate,
      });

      return serializeHomeworkSubmission(updated, { maxScore: hw.maxScore });
    }

    const [inserted] = await db
      .insert(homeworkSubmissions)
      .values({
        homeworkId,
        groupId,
        studentId,
        content: dto.content?.trim() || null,
        attachmentType: dto.attachmentType ?? 'NONE',
        r2ObjectKey: dto.r2ObjectKey?.trim() || null,
        url: dto.url?.trim() || null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
        mimeType: dto.mimeType?.trim() || null,
        status: 'SUBMITTED',
        isLate,
        revisionCount: 0,
        submittedAt: now,
      })
      .returning();

    await this.admin.audit(studentId, 'homework.submit', 'homework_submission', inserted.id, {
      homeworkId,
      groupId,
      isLate,
    });

    return serializeHomeworkSubmission(inserted, { maxScore: hw.maxScore });
  }

  async getQuizByLesson(studentId: string, lessonId: string, groupId?: string) {
    const { enrollments } = await this.lessonEnrollments(studentId, lessonId);
    if (!(await this.lessonUnlocked(enrollments, lessonId, groupId))) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    if (!quiz) return { quiz: null };
    return this.getQuiz(studentId, quiz.id, groupId);
  }

  async getQuiz(studentId: string, quizId: string, groupId?: string) {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    const enrollments = await this.assertQuizAccess(studentId, quiz, groupId);
    if (await this.quizHidden(quizId, enrollments, groupId)) {
      throw new ForbiddenException('Quiz is hidden for your group');
    }
    if (quiz.lessonId) {
      const { enrollments } = await this.lessonEnrollments(studentId, quiz.lessonId);
      if (!(await this.lessonUnlocked(enrollments, quiz.lessonId, groupId))) {
        throw new ForbiddenException('Lesson is locked for your group');
      }
    }
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.displayOrder));
    const imageUrls = new Map<string, string | null>();
    for (const key of new Set(
      questions.map((q) => q.imageKey).filter((k): k is string => !!k),
    )) {
      try {
        imageUrls.set(key, await this.storage.presignedGet(key));
      } catch {
        imageUrls.set(key, null);
      }
    }
    return {
      quiz: serializeQuiz(quiz),
      questions: questions.map((q) =>
        serializeQuizQuestion(q, q.imageKey ? imageUrls.get(q.imageKey) ?? null : null),
      ),
    };
  }

  async submitQuiz(
    studentId: string,
    quizId: string,
    groupId: string,
    answers: Record<string, string>,
  ) {
    const { group } = await this.assertEnrolled(studentId, groupId);
    if (!group.isActive) {
      throw new BadRequestException('Group is inactive');
    }
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.assertQuizInGroupCourse(quiz, groupId);
    const [hidden] = await db
      .select({ id: groupQuizAccess.id })
      .from(groupQuizAccess)
      .where(
        and(
          eq(groupQuizAccess.groupId, groupId),
          eq(groupQuizAccess.quizId, quizId),
          eq(groupQuizAccess.isHidden, true),
        ),
      )
      .limit(1);
    if (hidden) throw new ForbiddenException('Quiz is hidden for your group');
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
    let pending = false;
    const result = questions.map((q) => {
      if (q.questionType === 'WRITTEN') {
        pending = true;
        maxScore += q.points ?? 10;
        return {
          questionId: q.id,
          correct: false,
          expected: '',
          explanation: q.explanation,
        };
      }
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

    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        quizId,
        studentId,
        groupId,
        score,
        maxScore,
        answersJson: answers,
        pending,
      })
      .returning({ id: quizAttempts.id });

    await this.admin.audit(studentId, 'quiz.submit', 'quiz_submission', attempt.id, {
      quizId,
      groupId,
      score,
      maxScore,
      pending,
    });

    return { score, maxScore, pending, result };
  }

  /** A quiz is only reachable through a group whose course contains it. */
  private async assertQuizAccess(
    studentId: string,
    quiz: typeof quizzes.$inferSelect,
    groupId?: string,
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
      .innerJoin(courses, eq(groups.courseId, courses.id))
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, courseId),
          isNull(groups.deletedAt),
          isNull(courses.deletedAt),
        ),
      );
    if (!enrollments.length) throw new ForbiddenException('Not enrolled in this course');
    if (groupId && !enrollments.some((row) => row.group.id === groupId)) {
      throw new ForbiddenException('Not enrolled in this group');
    }
    if (
      quiz.lessonId &&
      !(await this.lessonUnlocked(enrollments, quiz.lessonId, groupId))
    ) {
      throw new ForbiddenException('Lesson is locked for your group');
    }
    return enrollments;
  }

  private async quizHidden(
    quizId: string,
    enrollments: Array<{ group: typeof groups.$inferSelect }>,
    groupId?: string,
  ) {
    const relevant = groupId
      ? enrollments.filter((row) => row.group.id === groupId)
      : enrollments;
    if (!relevant.length) return true;
    const rows = await db
      .select()
      .from(groupQuizAccess)
      .where(
        and(
          eq(groupQuizAccess.quizId, quizId),
          inArray(groupQuizAccess.groupId, relevant.map((row) => row.group.id)),
        ),
      );
    if (groupId) {
      return rows.some((row) => row.groupId === groupId && row.isHidden);
    }
    return relevant.every((row) =>
      rows.some((access) => access.groupId === row.group.id && access.isHidden),
    );
  }

  private async assertQuizInGroupCourse(
    quiz: typeof quizzes.$inferSelect,
    groupId: string,
  ) {
    const [group] = await db
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
    if (!courseId || courseId !== group.group.courseId) {
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
    const payload = await this.getQuiz(studentId, quizId, groupId);
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
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.groupId, groupId),
          eq(quizAttempts.quizId, quizId),
        ),
      );
    if (!attempts.length) return null;
    const graded = attempts.filter((a) => !a.pending).sort((a, b) => b.score - a.score);
    const attempt = graded.length
      ? graded[0]
      : attempts
          .filter((a) => a.pending)
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime(),
          )[0];
    if (!attempt) return null;
    const answers = attempt.answersJson as Record<string, string>;
    return {
      answers,
      score: attempt.score,
      maxScore: attempt.maxScore,
      pending: attempt.pending,
      writtenGrades: attempt.writtenGrades ?? null,
      submittedAt: attempt.submittedAt,
      result: questions.map((q) =>
        q.questionType === 'WRITTEN'
          ? {
              questionId: q.id,
              correct: false,
              expected: attempt.pending ? '' : q.correctAnswer,
              explanation: q.explanation,
            }
          : {
              questionId: q.id,
              correct: norm(answers[q.id] ?? '') === norm(q.correctAnswer),
              expected: q.correctAnswer,
              explanation: q.explanation,
            },
      ),
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
        pending: quizAttempts.pending,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .leftJoin(modules, eq(quizzes.moduleId, modules.id))
      .leftJoin(courses, eq(quizzes.courseId, courses.id))
      .where(
        and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.groupId, groupId)),
      );

    const hiddenQuizRows = await db
      .select({ quizId: groupQuizAccess.quizId })
      .from(groupQuizAccess)
      .where(
        and(
          eq(groupQuizAccess.groupId, groupId),
          eq(groupQuizAccess.isHidden, true),
        ),
      );
    const hiddenQuizIds = new Set(hiddenQuizRows.map((row) => row.quizId));
    const cols = await db
      .select()
      .from(manualGradeColumns)
      .where(eq(manualGradeColumns.groupId, groupId))
      .orderBy(asc(manualGradeColumns.displayOrder));
    const vals = await db
      .select()
      .from(manualGradeValues)
      .where(and(eq(manualGradeValues.studentId, studentId)));

    const questions = attempts.length
      ? await db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.quizId, attempts.map((a) => a.quizId)))
      : [];
    const questionTotals: Record<string, number> = {};
    for (const q of questions) {
      questionTotals[q.quizId] =
        (questionTotals[q.quizId] ?? 0) +
        (q.points ?? (q.questionType === 'WRITTEN' ? 10 : 1));
    }

    const studentQuizAttempts = new Map<string, (typeof attempts)[number][]>();
    for (const a of attempts.filter((row) => !hiddenQuizIds.has(row.quizId))) {
      const list = studentQuizAttempts.get(a.quizId) ?? [];
      list.push(a);
      studentQuizAttempts.set(a.quizId, list);
    }
    const quizGrades: {
      quizId: string;
      title: string;
      unitTitle: string;
      lessonTitle: string;
      score: number;
      maxScore: number;
      pending: boolean;
    }[] = [];
    for (const atts of studentQuizAttempts.values()) {
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
        const quizMax = questionTotals[best.quizId] ?? best.maxScore;
        quizGrades.push({
          quizId: best.quizId,
          title: best.quizTitle,
          unitTitle: best.moduleTitle ?? best.courseTitle ?? '—',
          lessonTitle: best.lessonTitle ?? '',
          score: Math.min(best.score, quizMax),
          maxScore: quizMax,
          pending: best.pending,
        });
      }
    }

    const manualGrades = cols.map((c) => {
      const v = vals.find((v) => v.columnId === c.id);
      return {
        columnId: c.id,
        title: c.title,
        maxScore: c.maxScore,
        score: v?.score ?? null,
        note: v?.teacherNote ?? null,
      };
    });

    // Visible homework assignments for this group
    const mods = await db.select().from(modules).where(eq(modules.courseId, group.courseId));
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
    const lessonIds = lessonsInCourse.map((l) => l.id);

    const homeworkRows = lessonIds.length
      ? await db
          .select()
          .from(homework)
          .where(
            and(
              inArray(homework.lessonId, lessonIds),
              or(isNull(homework.groupId), eq(homework.groupId, groupId)),
            ),
          )
          .orderBy(asc(homework.displayOrder), asc(homework.createdAt))
      : [];

    const hiddenHomeworkRows = homeworkRows.length
      ? await db
          .select()
          .from(groupHomeworkAccess)
          .where(
            and(
              eq(groupHomeworkAccess.groupId, groupId),
              inArray(groupHomeworkAccess.homeworkId, homeworkRows.map((h) => h.id)),
            ),
          )
      : [];
    const homeworkAccessMap = new Map(hiddenHomeworkRows.map((a) => [a.homeworkId, a]));
    const visibleHomeworkRows = homeworkRows.filter(
      (h) => !homeworkAccessMap.get(h.id)?.isHidden,
    );

    const homeworkColumns = visibleHomeworkRows.map((h) => ({
      id: h.id,
      title: h.title,
      maxScore: h.maxScore,
      dueDate: homeworkAccessMap.get(h.id)?.dueDate?.toISOString() ?? null,
    }));

    const hwSubmissions = visibleHomeworkRows.length
      ? await db
          .select()
          .from(homeworkSubmissions)
          .where(
            and(
              eq(homeworkSubmissions.groupId, groupId),
              eq(homeworkSubmissions.studentId, studentId),
              inArray(homeworkSubmissions.homeworkId, visibleHomeworkRows.map((h) => h.id)),
            ),
          )
      : [];
    const hwSubMap = new Map(hwSubmissions.map((s) => [s.homeworkId, s]));

    const homeworkGrades = visibleHomeworkRows.map((h) => {
      const sub = hwSubMap.get(h.id);
      const access = homeworkAccessMap.get(h.id);
      return {
        homeworkId: h.id,
        title: h.title,
        maxScore: h.maxScore,
        dueDate: access?.dueDate?.toISOString() ?? null,
        score: sub?.score ?? null,
        status: sub?.status ?? 'NOT_SUBMITTED',
        isLate: sub?.isLate ?? false,
        teacherFeedback: sub?.teacherFeedback ?? null,
      };
    });

    let earned = 0;
    let studentMax = 0;

    for (const q of quizGrades) {
      if (!q.pending) {
        earned += Math.min(q.score, q.maxScore);
        studentMax += q.maxScore;
      }
    }

    for (const m of manualGrades) {
      if (m.score !== null) {
        earned += m.score;
        studentMax += m.maxScore;
      }
    }

    for (const h of visibleHomeworkRows) {
      const sub = hwSubMap.get(h.id);
      if (sub && sub.status === 'GRADED' && sub.score !== null) {
        earned += sub.score;
        studentMax += h.maxScore;
      }
    }

    const gradePercent = studentMax ? Math.round((earned / studentMax) * 100) : null;

    return {
      gradePercent,
      quizzes: quizGrades,
      manual: manualGrades,
      homework: homeworkGrades,
      homeworkColumns,
    };
  }

  async getGradebook(studentId: string, groupId: string) {
    return this.myGrades(studentId, groupId);
  }
}
