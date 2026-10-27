import { useEffect, useState } from 'react';
import { createRoute, Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { api } from '../../lib/api';
import { rootRoute } from '../../routes/__root';
import { localizeName, useLang } from '../../lib/i18n';
import { Card, ErrorBox, Loading } from '../../components/ui';
import { ThemeHero, ThemeSurface } from '../../components/TeacherTheme';
import { PublicFooter } from '../../components/PublicFooter';
import type { CourseType, PublicTeacherPage } from '../../../../shared/api';

export default function TeacherLanding() {
  const { slug } = useParams({ from: '/t/$slug' });
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<'ALL' | CourseType>('ALL');
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-teacher', slug],
    queryFn: () => api<PublicTeacherPage>(`/api/public/teachers/${slug}`),
  });

  useEffect(() => {
    if (!data) return;
    const previous = document.title;
    const title = `${data.teacher.name} — ${t('appName')}`;
    const description =
      data.teacher.bio ??
      `${data.teacher.name} — ${t('coursesBy')} ${data.teacher.name}`;
    document.title = title;
    const addMeta = (attr: string, key: string, content: string) => {
      const tag = document.createElement('meta');
      tag.setAttribute(attr, key);
      tag.content = content;
      document.head.appendChild(tag);
      return tag;
    };
    const metas = [
      addMeta('name', 'description', description),
      addMeta('property', 'og:title', title),
      addMeta('property', 'og:description', description),
      addMeta('property', 'og:type', 'profile'),
      addMeta('name', 'twitter:card', 'summary'),
    ];
    if (data.teacher.avatarUrl) {
      metas.push(
        addMeta(
          'property',
          'og:image',
          `${window.location.origin}/api/public/teachers/${slug}/avatar`,
        ),
      );
    }
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = window.location.href;
    document.head.appendChild(canonical);
    return () => {
      document.title = previous;
      for (const tag of metas) tag.remove();
      canonical.remove();
    };
  }, [data, slug, t]);

  if (isLoading) return <Loading />;
  if (error) return <div className="mx-auto max-w-3xl p-4"><ErrorBox error={error} /></div>;
  if (!data) return null;

  const academic = data.courses.filter((c) => c.courseType === 'ACADEMIC');
  const general = data.courses.filter((c) => c.courseType === 'GENERAL');
  const visible = data.courses.filter((c) => filter === 'ALL' || c.courseType === filter);

  return (
    <ThemeSurface theme={data.teacher.theme} className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <ThemeHero
        theme={data.teacher.theme}
        bannerUrl={data.teacher.bannerUrl}
        name={data.teacher.name}
        subject={data.teacher.subject ? localizeName(data.teacher.subject, lang) : null}
        bio={data.teacher.bio}
        avatarUrl={data.teacher.avatarUrl}
      >
        <Link
          to="/register/$role"
          params={{ role: 'student' }}
          search={{}}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <GraduationCap size={18} /> {t('registerInterest')}
        </Link>
      </ThemeHero>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'ACADEMIC', 'GENERAL'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              filter === value ? 'bg-primary text-white' : 'border border-line bg-surface'
            }`}
          >
            {value === 'ALL' ? t('all') : value === 'ACADEMIC' ? t('academic') : t('general')}
          </button>
        ))}
      </div>

      {filter !== 'GENERAL' && academic.length > 0 && (
        <CourseSection
          title={t('academic')}
          slug={slug}
          courses={filter === 'ALL' ? academic : visible}
        />
      )}
      {filter !== 'ACADEMIC' && general.length > 0 && (
        <CourseSection
          title={t('general')}
          slug={slug}
          courses={filter === 'ALL' ? general : visible}
        />
      )}
      {visible.length === 0 && <p className="text-sm text-ink-soft">{t('noCoursesFilter')}</p>}

      <PublicFooter teacher={data.teacher} support={data.support} />
    </ThemeSurface>
  );
}

function CourseSection({
  title,
  slug,
  courses,
}: {
  title: string;
  slug: string;
  courses: PublicTeacherPage['courses'];
}) {
  const { t } = useLang();
  if (courses.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-secondary">{title}</h2>
      <div className="flex flex-col gap-3">
        {courses.map((c) => (
          <Link key={c.id} to="/t/$slug/courses/$courseId" params={{ slug, courseId: c.id }}>
            <Card className="flex flex-col gap-4 transition hover:border-primary sm:flex-row sm:items-center">
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt=""
                  className="h-32 w-full rounded-xl object-cover sm:w-48"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-xl bg-primary-light text-primary sm:w-48">
                  <BookOpen size={28} />
                </div>
              )}
              <div className="min-w-0 grow">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                </span>
                <h3 className="text-lg font-bold">{c.title}</h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{c.description}</p>
                )}
              </div>
              <ArrowRight size={18} className="shrink-0 text-ink-soft ltr:rotate-180 rtl:rotate-0" />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export const teacherLandingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$slug',
  component: TeacherLanding,
});
