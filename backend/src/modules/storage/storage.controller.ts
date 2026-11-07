import { Body, Controller, Delete, Get, Injectable, Module, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ZodBodyPipe, PresignedUploadDto, AttachDto, AvatarUploadDto, BannerUploadDto, CourseImageUploadDto, QuizImageUploadDto, DeleteUploadDto } from '../../lib/schemas';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../db';
import {
  courses,
  groupLessonAccess,
  groupStudents,
  groups,
  lessonAttachments,
  lessons,
  modules,
} from '../../db/schema';
import { Roles } from '../../auth/roles.decorator';
import { StorageService } from './storage.service';
import { TeacherEntitlementsService } from '../teacher/teacher-entitlements.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { serializeAttachment } from '../../lib/serializers';

@Controller()
@Injectable()
export class StorageController {
  constructor(
    private storage: StorageService,
    private entitlementsService: TeacherEntitlementsService,
  ) {}

  @Roles('TEACHER')
  @Post('api/storage/presigned-upload')
  async presignedUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(PresignedUploadDto))
    dto: z.infer<typeof PresignedUploadDto>,
  ) {
    const course = await this.teacherCourse(req.user!, dto.lessonId);
    if (course.id !== dto.courseId) {
      throw new ForbiddenException('Lesson/course mismatch');
    }
    if (dto.fileSizeBytes && dto.fileSizeBytes > 0) {
      await this.entitlementsService.assertCanUploadStorage(req.user!.id, dto.fileSizeBytes);
    }
    const objectKey = StorageService.buildObjectKey(dto.courseId, dto.lessonId, dto.fileName);
    const uploadUrl = await this.storage.presignedPut(objectKey);
    return { objectKey, uploadUrl };
  }

  @Roles('TEACHER')
  @Post('api/storage/course-image')
  async courseImageUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(CourseImageUploadDto))
    dto: z.infer<typeof CourseImageUploadDto>,
  ) {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, dto.courseId), isNull(courses.deletedAt)));
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== req.user!.id) throw new ForbiddenException('Not your course');
    const objectKey = StorageService.buildCourseImageKey(dto.courseId, dto.fileName);
    return { objectKey, uploadUrl: await this.storage.presignedPut(objectKey) };
  }

  @Roles('TEACHER')
  @Post('api/storage/quiz-image')
  async quizImageUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(QuizImageUploadDto))
    dto: z.infer<typeof QuizImageUploadDto>,
  ) {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, dto.courseId), isNull(courses.deletedAt)));
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== req.user!.id) throw new ForbiddenException('Not your course');
    const objectKey = StorageService.buildQuizImageKey(dto.courseId, dto.fileName);
    return { objectKey, uploadUrl: await this.storage.presignedPut(objectKey) };
  }

  @Roles('TEACHER')
  @Post('api/storage/banner')
  async bannerUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(BannerUploadDto))
    dto: z.infer<typeof BannerUploadDto>,
  ) {
    const objectKey = StorageService.buildBannerKey(req.user!.id, dto.fileName);
    return { objectKey, uploadUrl: await this.storage.presignedPut(objectKey) };
  }

  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
  @Post('api/storage/avatar')
  async avatarUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AvatarUploadDto))
    dto: z.infer<typeof AvatarUploadDto>,
  ) {
    const objectKey = StorageService.buildAvatarKey(req.user!.id, dto.fileName);
    return { objectKey, uploadUrl: await this.storage.presignedPut(objectKey) };
  }

  @Roles('TEACHER', 'STUDENT', 'ADMIN', 'PARENT')
  @Delete('api/storage/uploaded')
  async deleteUploaded(
    @Req() req: Request,
    @Body(new ZodBodyPipe(DeleteUploadDto)) dto: z.infer<typeof DeleteUploadDto>,
  ) {
    const key = dto.objectKey;
    const user = req.user!;
    const ownPrefixes = [`avatars/${user.id}/`, `banners/${user.id}/`];
    if (!ownPrefixes.some((prefix) => key.startsWith(prefix))) {
      if (!key.startsWith('courses/')) {
        throw new ForbiddenException('Cannot delete this object');
      }
      const courseId = key.split('/')[1];
      const [course] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
      if (!course) throw new NotFoundException('Course not found');
      if (course.teacherId !== user.id) throw new ForbiddenException('Not your course');
    }
    await this.storage.deleteObject(key);
    return { ok: true };
  }

  @Roles('TEACHER')
  @Post('api/storage/attachments')
  async attach(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AttachDto))
    dto: z.infer<typeof AttachDto>,
  ) {
    const course = await this.teacherCourse(req.user!, dto.lessonId);
    if (dto.fileSizeBytes && dto.fileSizeBytes > 0) {
      await this.entitlementsService.assertCanUploadStorage(req.user!.id, dto.fileSizeBytes);
    }
    if (dto.objectKey) {
      const prefix = `courses/${course.id}/lessons/${dto.lessonId}/`;
      if (!dto.objectKey.startsWith(prefix)) {
        throw new ForbiddenException('Object does not belong to this lesson');
      }
    }
    if (dto.groupId) {
      const [group] = await db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, dto.groupId),
            eq(groups.courseId, course.id),
            isNull(groups.deletedAt),
          ),
        );
      if (!group) throw new ForbiddenException('Group not in this course');
    }
    const [row] = await db
      .insert(lessonAttachments)
      .values({
        lessonId: dto.lessonId,
        groupId: dto.groupId,
        title: dto.title,
        r2ObjectKey: dto.objectKey ?? null,
        url: dto.url ?? null,
        fileType: dto.url
          ? StorageService.isVideoLink(dto.url) ? 'VIDEO' : 'LINK'
          : StorageService.fileTypeFor(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes,
        mimeType: dto.mimeType,
      })
      .returning();
    return serializeAttachment(row);
  }

  @Roles('TEACHER')
  @Delete('api/storage/attachments/:id')
  async removeAttachment(@Req() req: Request, @Param('id') id: string) {
    const row = await this.readableAttachment(req.user!, id);
    await db.delete(lessonAttachments).where(eq(lessonAttachments.id, id));
    if (row.r2ObjectKey) await this.storage.deleteObject(row.r2ObjectKey);
    return { ok: true };
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('api/storage/attachments/:id/download')
  async download(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('download') download?: string,
  ) {
    const row = await this.readableAttachment(req.user!, id);
    if (!row.r2ObjectKey) throw new NotFoundException('Attachment has no file');
    return { url: await this.storage.presignedGet(row.r2ObjectKey, download ? row.title : undefined) };
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('api/storage/attachments/:id/file')
  async file(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const row = await this.readableAttachment(req.user!, id);
    if (!row.r2ObjectKey) throw new NotFoundException('Attachment has no file');
    res.redirect(302, await this.storage.presignedGet(row.r2ObjectKey, download ? row.title : undefined));
  }

  private async readableAttachment(user: { id: string; role: string }, id: string) {
    const [row] = await db
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.id, id));
    if (!row) throw new NotFoundException('Attachment not found');
    const course = await this.courseForLesson(row.lessonId);

    if (user.role === 'TEACHER' && course.teacherId !== user.id) {
      throw new ForbiddenException('Not your course');
    }
    if (user.role === 'STUDENT') {
      await this.assertStudentCanRead(user.id, row.lessonId, row.groupId, course.id);
    }
    return row;
  }

  private async courseForLesson(lessonId: string) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, mod.courseId), isNull(courses.deletedAt)));
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async teacherCourse(user: { id: string; role: string }, lessonId: string) {
    const course = await this.courseForLesson(lessonId);
    if (course.teacherId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not your course');
    }
    return course;
  }

  private async assertStudentCanRead(
    studentId: string,
    lessonId: string,
    groupId: string | null,
    courseId: string,
  ) {
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
    const relevant = groupId
      ? enrollments.filter((e) => e.group.id === groupId)
      : enrollments;
    if (!relevant.length) throw new ForbiddenException('Attachment not for your group');
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
    const unlocked = visible.some(
      (e) =>
        overrides.find((o) => o.groupId === e.group.id)?.isUnlocked ??
        e.group.unlockAllByDefault,
    );
    if (!unlocked) throw new ForbiddenException('Lesson is locked for your group');
  }
}
