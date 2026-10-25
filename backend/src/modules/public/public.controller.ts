import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { Public } from '../../auth/public.decorator';
import { db } from '../../db';
import { StorageService } from '../storage/storage.service';
import { categories, courses, users } from '../../db/schema';

@Controller()
export class PublicController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('api/public/teachers/:slug/avatar')
  async avatar(@Param('slug') slug: string, @Res() res: Response) {
    const [teacher] = await db
      .select({ image: users.image })
      .from(users)
      .where(
        and(
          eq(users.landingSlug, slug.trim().toLowerCase()),
          eq(users.landingPublished, true),
          eq(users.role, 'TEACHER'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!teacher?.image) throw new NotFoundException('No avatar');
    try {
      res.redirect(302, await this.storage.presignedGet(teacher.image));
    } catch {
      throw new NotFoundException('No avatar');
    }
  }

  @Public()
  @Get('api/public/teachers/:slug')
  async teacher(@Param('slug') slug: string) {
    const [teacher] = await db
      .select({
        id: users.id,
        name: users.name,
        bio: users.landingBio,
        subject: categories.name,
        avatar: users.image,
      })
      .from(users)
      .leftJoin(categories, eq(users.subjectCategoryId, categories.id))
      .where(
        and(
          eq(users.landingSlug, slug.trim().toLowerCase()),
          eq(users.landingPublished, true),
          eq(users.role, 'TEACHER'),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!teacher) throw new NotFoundException('Teacher page not found');

    const list = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        courseType: courses.courseType,
      })
      .from(courses)
      .where(and(eq(courses.teacherId, teacher.id), eq(courses.isPublished, true)))
      .orderBy(asc(courses.title));

    const { id: _id, ...publicTeacher } = teacher;
    return { teacher: publicTeacher, courses: list };
  }
}
