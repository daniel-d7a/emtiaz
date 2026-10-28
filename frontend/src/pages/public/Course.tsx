import { useEffect } from 'react';
import { createRoute, Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, ExternalLink, PlayCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { rootRoute } from '../../routes/__root';
import { useLang } from '../../lib/i18n';
import { applyPageMeta } from '../../lib/meta';
import { Card, ErrorBox, Loading } from '../../components/ui';
import { ThemeHero, ThemeSurface } from '../../components/TeacherTheme';
import { PublicFooter } from '../../components/PublicFooter';
import type { PublicCoursePage } from '../../../../shared/api';
import { embedUrl } from '../../lib/embed';

export default function PublicCourse() {
  const { slug, courseId } = useParams({ from: '/t/$slug/courses/$courseId' });
  const { t, lang } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-course', slug, courseId],
    queryFn: () => api<PublicCoursePage>(`/api/public/teachers/${slug}/courses/${courseId}`),
  });

  useEffect(() => {
    if (!data) return;
    return applyPageMeta({
      title: `${data.course.title} — ${data.teacher.name}`,
      description: data.course.description ?? `${data.course.title} — ${data.teacher.name}`,
      image: data.course.imageUrl,
      type: 'article',
      locale: lang,
    });
  }, [data, lang]);

  if (isLoading) return <Loading />;
  if (error) return <div className="mx-auto max-w-3xl p-4"><ErrorBox error={error} /></div>;
  if (!data) return null;

  const embed = data.course.previewUrl ? embedUrl(data.course.previewUrl) : null;

  return (
    <ThemeSurface theme={data.teacher.theme} className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <Link to="/t/$slug" params={{ slug }} className="flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft size={16} className="rtl:rotate-180" /> {t('backToTeacher')}
      </Link>

      <ThemeHero
        theme={data.teacher.theme}
        bannerUrl={data.teacher.bannerUrl}
        name={data.course.title}
        subject={data.teacher.name}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-primary">
          <BookOpen size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {data.course.courseType === 'ACADEMIC' ? t('academic') : t('general')}
          </span>
          {data.course.semester && <span className="text-xs text-ink-soft">{data.course.semester}</span>}
        </div>
        {data.course.imageUrl && (
          <img
            src={data.course.imageUrl}
            alt=""
            className="mb-4 aspect-video w-full rounded-xl border border-line object-cover"
          />
        )}
        {data.course.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{data.course.description}</p>
        ) : (
          <p className="text-sm text-ink-soft">—</p>
        )}
      </Card>

      {data.course.previewUrl && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-primary-dark">
            <PlayCircle size={18} /> {t('preview')}
          </h2>
          <Card>
            {embed ? (
              <iframe
                src={embed}
                title={data.course.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-xl border border-line"
              />
            ) : (
              <a
                href={data.course.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-primary underline"
              >
                <ExternalLink size={16} /> {t('openPreview')}
              </a>
            )}
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-primary-dark">{t('curriculumPreview')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.modules.map((m) => (
            <Card key={m.id}>
              <h3 className="font-bold">{m.title}</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
                {m.lessons.map((title) => <li key={title}>• {title}</li>)}
                {m.lessons.length === 0 && <li>—</li>}
              </ul>
            </Card>
          ))}
          {data.modules.length === 0 && <p className="text-sm text-ink-soft">—</p>}
        </div>
      </section>

      <PublicFooter teacher={data.teacher} support={data.support} />
    </ThemeSurface>
  );
}

export const publicCourseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$slug/courses/$courseId',
  component: PublicCourse,
});
