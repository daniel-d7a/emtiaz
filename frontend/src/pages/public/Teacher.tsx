import { useEffect } from 'react';
import { createRoute, Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Card, ErrorBox, Loading } from '../../components/ui';

type PublicTeacher = {
  teacher: { name: string; bio: string | null; subject: string | null; avatar: string | null };
  courses: Array<{ id: string; title: string; description: string | null; courseType: string }>;
};

export default function TeacherLanding() {
  const { slug } = useParams({ from: '/t/$slug' });
  const { t } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-teacher', slug],
    queryFn: () => api<PublicTeacher>(`/api/public/teachers/${slug}`),
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
    if (data.teacher.avatar) {
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <Card>
        <div className="flex items-center gap-4">
          {data.teacher.avatar ? (
            <img src={`/api/public/teachers/${slug}/avatar`} alt="" className="h-20 w-20 rounded-full border border-line object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {data.teacher.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold">{data.teacher.name}</h1>
            {data.teacher.subject && <p className="text-sm font-semibold text-primary">{data.teacher.subject}</p>}
          </div>
        </div>
        {data.teacher.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{data.teacher.bio}</p>}
        <Link
          to="/register/$role"
          params={{ role: 'student' }}
          search={{}}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <GraduationCap size={18} /> {t('registerInterest')}
        </Link>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-secondary">{t('coursesBy')} {data.teacher.name}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.courses.map((c) => (
            <Card key={c.id}>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <BookOpen size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">{c.courseType}</span>
              </div>
              <h3 className="font-bold">{c.title}</h3>
              {c.description && <p className="mt-1 text-sm text-ink-soft">{c.description}</p>}
            </Card>
          ))}
          {data.courses.length === 0 && <p className="text-sm text-ink-soft">{t('landingUnavailable')}</p>}
        </div>
      </section>
    </div>
  );
}

import { rootRoute } from '../../routes/__root';

export const teacherLandingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$slug',
  component: TeacherLanding,
});
