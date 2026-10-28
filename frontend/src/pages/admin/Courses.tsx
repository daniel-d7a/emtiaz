import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, ErrorBox, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type CourseRow = {
  id: string;
  title: string;
  courseType: 'ACADEMIC' | 'GENERAL';
  isPublished: boolean;
  teacherName: string;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

export default function AdminCourses() {
  const { t } = useLang();
  const [limit, setLimit] = useState(20);
  const courses = useQuery({
    queryKey: ['admin-courses', limit],
    queryFn: () => api<CourseRow[]>(`/api/admin/courses?limit=${limit}`),
  });

  return (
    <Page title={t('courses')}>
      <Card>
        {courses.isLoading ? <Loading /> : courses.error ? <ErrorBox error={courses.error} /> : (
          <ul className="flex flex-col divide-y divide-line">
            {courses.data?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">
                    {c.title}{' '}
                    <Badge tone={c.courseType === 'ACADEMIC' ? 'primary' : 'secondary'} className="ms-1">
                      {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                    </Badge>
                  </p>
                  <p className="text-sm text-ink-soft">{c.teacherName}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.groups.map((g) => (
                      <span key={g.id} className="rounded bg-background px-2 py-0.5 text-xs font-semibold">
                        {g.name} <span dir="ltr" className="font-bold">{g.joinCode}</span> ({g.studentCount})
                      </span>
                    ))}
                    {c.groups.length === 0 && <span className="text-xs text-ink-soft">—</span>}
                  </div>
                </div>
              </li>
            ))}
            {courses.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
          </ul>
        )}
        {(courses.data?.length ?? 0) >= limit && limit < 200 && (
          <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
        )}
      </Card>
    </Page>
  );
}

export const adminCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/courses',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminCourses,
});
