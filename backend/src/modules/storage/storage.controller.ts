import { Body, Controller, Get, Injectable, Module, Param, Post, Req } from '@nestjs/common';
import { ZodBodyPipe, PresignedUploadDto, AttachDto, AvatarUploadDto } from '../../lib/schemas';
import { z } from 'zod';
import type { Request } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
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
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@Controller()
@Injectable()
export class StorageController {
  constructor(private storage: StorageService) {}

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
    const objectKey = StorageService.buildObjectKey(dto.courseId, dto.lessonId, dto.fileName);
    const uploadUrl = await this.storage.presignedPut(objectKey);
    return {
      objectKey,
      uploadUrl,
      key: objectKey,
      method: 'PUT',
      maxBytes: 100 * 1024 * 1024,
    };
  }

  @Roles('TEACHER', 'STUDENT', 'ADMIN')
  @Post('api/storage/avatar')
  async avatarUpload(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AvatarUploadDto))
    dto: z.infer<typeof AvatarUploadDto>,
  ) {
    const objectKey = StorageService.buildAvatarKey(req.user!.id, dto.fileName);
    return { objectKey, uploadUrl: await this.storage.presignedPut(objectKey) };
  }

  @Roles('TEACHER')
  @Post('api/storage/attachments')
  async attach(
    @Req() req: Request,
    @Body(new ZodBodyPipe(AttachDto))
    dto: z.infer<typeof AttachDto>,
  ) {
    const course = await this.teacherCourse(req.user!, dto.lessonId);
    const prefix = `courses/${course.id}/lessons/${dto.lessonId}/`;
    if (!dto.objectKey.startsWith(prefix)) {
      throw new ForbiddenException('Object does not belong to this lesson');
    }
    if (dto.groupId) {
      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, dto.groupId), eq(groups.courseId, course.id)));
      if (!group) throw new ForbiddenException('Group not in this course');
    }
    const downloadUrl = await this.storage.presignedGet(dto.objectKey);
    const [row] = await db
      .insert(lessonAttachments)
      .values({
        lessonId: dto.lessonId,
        groupId: dto.groupId,
        title: dto.title,
        r2ObjectKey: dto.objectKey,
        publicOrSignedUrl: downloadUrl,
        fileType: StorageService.fileTypeFor(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes,
        mimeType: dto.mimeType,
      })
      .returning();
    return row;
  }

  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('api/storage/attachments/:id/download')
  async download(@Req() req: Request, @Param('id') id: string) {
    const [row] = await db
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.id, id));
    if (!row) throw new NotFoundException('Attachment not found');
    const course = await this.courseForLesson(row.lessonId);

    if (req.user!.role === 'TEACHER' && course.teacherId !== req.user!.id) {
      throw new ForbiddenException('Not your course');
    }
    if (req.user!.role === 'STUDENT') {
      await this.assertStudentCanRead(req.user!.id, row.lessonId, row.groupId, course.id);
    }
    return { id: row.id, url: await this.storage.presignedGet(row.r2ObjectKey) };
  }

  private async courseForLesson(lessonId: string) {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) throw new NotFoundException('Lesson not found');
    const [mod] = await db.select().from(modules).where(eq(modules.id, lesson.moduleId));
    if (!mod) throw new NotFoundException('Module not found');
    const [course] = await db.select().from(courses).where(eq(courses.id, mod.courseId));
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
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          eq(groups.courseId, courseId),
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
    const unlocked = relevant.some(
      (e) =>
        overrides.find((o) => o.groupId === e.group.id)?.isUnlocked ??
        e.group.unlockAllByDefault,
    );
    if (!unlocked) throw new ForbiddenException('Lesson is locked for your group');
  }
}
