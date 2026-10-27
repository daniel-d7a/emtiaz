import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { Public } from '../../auth/public.decorator';
import { db } from '../../db';
import { StorageService } from '../storage/storage.service';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import { categories, courses, lessons, modules, users } from '../../db/schema';

@Controller()
export class PublicController {
  constructor(
    private readonly storage: StorageService,
    private readonly settings: NotificationSettingsService,
  ) {}

  private async publishedTeacher(slug: string) {
    const [teacher] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        bio: users.landingBio,
        subject: categories.name,
        image: users.image,
        theme: users.landingTheme,
        banner: users.landingBanner,
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
    return teacher;
  }

  private async signed(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.presignedGet(key);
    } catch {
      return null;
    }
  }

  private async publicTeacher(slug: string) {
    const teacher = await this.publishedTeacher(slug);
    const { id: _id, image, banner, ...rest } = teacher;
    return {
      ...rest,
      avatarUrl: image ? `/api/public/teachers/${slug}/avatar` : null,
      bannerUrl: await this.signed(banner),
    };
  }

  private async support() {
    const settings = await this.settings.get();
    return {
      email: settings.supportEmail,
      phone: settings.supportPhone,
      whatsapp: settings.supportWhatsapp,
    };
  }

  @Public()
  @Get('api/public/teachers/:slug/avatar')
  async avatar(@Param('slug') slug: string, @Res() res: Response) {
    const teacher = await this.publishedTeacher(slug);
    if (!teacher.image) throw new NotFoundException('No avatar');
    try {
      res.redirect(302, await this.storage.presignedGet(teacher.image));
    } catch {
      throw new NotFoundException('No avatar');
    }
  }

  @Public()
  @Get('api/public/teachers/:slug/banner')
  async banner(@Param('slug') slug: string, @Res() res: Response) {
    const teacher = await this.publishedTeacher(slug);
    if (!teacher.banner) throw new NotFoundException('No banner');
    try {
      res.redirect(302, await this.storage.presignedGet(teacher.banner));
    } catch {
      throw new NotFoundException('No banner');
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
    const teacher = await this.publishedTeacher(slug);
    const list = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        courseType: courses.courseType,
        image: courses.image,
      })
      .from(courses)
      .where(and(eq(courses.teacherId, teacher.id), eq(courses.isPublished, true)))
      .orderBy(asc(courses.title));

    const publicCourses = await Promise.all(
      list.map(async ({ image, ...course }) => ({
        ...course,
        imageUrl: await this.signed(image),
      })),
    );
    return {
      teacher: await this.publicTeacher(slug),
      courses: publicCourses,
      support: await this.support(),
    };
  }

  @Public()
  @Get('api/public/teachers/:slug/courses/:courseId')
  async course(@Param('slug') slug: string, @Param('courseId') courseId: string) {
    const teacher = await this.publishedTeacher(slug);
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.teacherId, teacher.id),
          eq(courses.isPublished, true),
        ),
      )
      .limit(1);
    if (!course) throw new NotFoundException('Course not found');

    const mods = await db
      .select({ id: modules.id, title: modules.title })
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(asc(modules.displayOrder));
    const allLessons = mods.length
      ? await db
          .select({ moduleId: lessons.moduleId, title: lessons.title })
          .from(lessons)
          .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
          .orderBy(asc(lessons.displayOrder))
      : [];

    const { image, ...publicCourse } = course;
    return {
      teacher: {
        name: teacher.name,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber,
        theme: teacher.theme,
        bannerUrl: await this.signed(teacher.banner),
      },
      course: { ...publicCourse, imageUrl: await this.signed(image) },
      modules: mods.map((m) => ({
        ...m,
        lessons: allLessons.filter((l) => l.moduleId === m.id).map((l) => l.title),
      })),
      support: await this.support(),
    };
  }
}
