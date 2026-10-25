import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { Public } from '../../auth/public.decorator';
import { db } from '../../db';
import { categories, courses, users } from '../../db/schema';

@Controller()
export class PublicController {
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
