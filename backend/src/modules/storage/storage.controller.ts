import { Body, Controller, Get, Injectable, Module, Param, Post, Req } from '@nestjs/common';
import { ZodBodyPipe, PresignedUploadDto, AttachDto, AvatarUploadDto } from '../../lib/schemas';
import { z } from 'zod';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { lessonAttachments, lessons, modules, courses } from '../../db/schema';
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
    // Verify teacher owns the course the lesson belongs to.
    const lesson = (await db.select().from(lessons).where(eq(lessons.id, dto.lessonId)))[0];
    if (!lesson) throw new NotFoundException('Lesson not found');
    const mod = (await db.select().from(modules).where(eq(modules.id, lesson.moduleId)))[0];
    if (!mod || mod.courseId !== dto.courseId) {
      throw new ForbiddenException('Lesson/course mismatch');
    }
    const course = (await db.select().from(courses).where(eq(courses.id, mod.courseId)))[0];
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ForbiddenException('Not your course');
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
  async download(@Param('id') id: string) {
    const [row] = await db
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.id, id));
    if (!row) throw new NotFoundException('Attachment not found');
    return { id: row.id, url: await this.storage.presignedGet(row.r2ObjectKey) };
  }
}
