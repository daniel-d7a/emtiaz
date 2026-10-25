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
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const teachers = await db
      .select({ slug: users.landingSlug })
      .from(users)
      .where(
        and(
          eq(users.role, 'TEACHER'),
          eq(users.landingPublished, true),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      );
    const base = (process.env.FRONTEND_URL ?? 'http://localhost:8088').replace(/\/$/, '');
    const urls = [
      `${base}/`,
      ...teachers
        .filter((t): t is { slug: string } => !!t.slug)
        .map((t) => `${base}/t/${encodeURIComponent(t.slug)}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${url.replace(/&/g, '&amp;')}</loc></url>`)
      .join('\n')}\n</urlset>\n`;
    res.type('application/xml').send(xml);
  }

  @Public()
  @Get('robots.txt')
  robots(@Res() res: Response) {
    const base = (process.env.FRONTEND_URL ?? 'http://localhost:8088').replace(/\/$/, '');
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
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
