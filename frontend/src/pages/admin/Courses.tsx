import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, ErrorBox, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type CourseRow = {
  id: string;
  title: string;
  courseType: 'ACADEMIC' | 'GENERAL';
  isPublished: boolean;
  deletedAt: string | null;
  teacherName: string;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

type GroupRow = {
  id: string;
  name: string;
  joinCode: string;
  courseId: string;
  courseTitle: string;
};

export default function AdminCourses() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const courses = useQuery({
    queryKey: ['admin-courses', limit, showDeleted],
    queryFn: () => api<CourseRow[]>(`/api/admin/courses?limit=${limit}&deleted=${showDeleted}`),
  });
  const deletedGroups = useQuery({
    queryKey: ['admin-groups', 'deleted'],
    queryFn: () => api<GroupRow[]>('/api/admin/groups?deleted=true'),
    enabled: showDeleted,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-courses'] });
    void qc.invalidateQueries({ queryKey: ['admin-groups'] });
    void qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const restoreCourse = useMutation({
    mutationFn: (id: string) => api(`/api/admin/courses/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });
  const restoreGroup = useMutation({
    mutationFn: (id: string) => api(`/api/admin/groups/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });

  return (
    <Page title={t('courses')}>
      <button
        onClick={() => setShowDeleted((v) => !v)}
        className={`mb-4 min-h-12 rounded-xl px-4 text-sm font-semibold ${showDeleted ? 'bg-primary text-white' : 'border border-line text-ink-soft'}`}
      >
        {t('showDeleted')}
      </button>
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
                {c.deletedAt && (
                  <button
                    onClick={() => restoreCourse.mutate(c.id)}
                    className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                  >
                    {t('restore')}
                  </button>
                )}
              </li>
            ))}
            {courses.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
          </ul>
        )}
        {(courses.data?.length ?? 0) >= limit && limit < 200 && (
          <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
        )}
      </Card>

      {showDeleted && (
        <Card className="mt-4">
          <h2 className="font-bold">{t('deletedGroups')}</h2>
          {deletedGroups.isLoading ? <Loading /> : deletedGroups.error ? <ErrorBox error={deletedGroups.error} /> : (
            deletedGroups.data?.length ? (
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {deletedGroups.data.map((group) => (
                  <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-sm text-ink-soft">{group.courseTitle} · <span dir="ltr">{group.joinCode}</span></p>
                    </div>
                    <button
                      onClick={() => restoreGroup.mutate(group.id)}
                      className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                    >
                      {t('restore')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-soft">{t('deleted')}</p>
          )}
        </Card>
      )}
      {restoreCourse.error && <ErrorBox error={restoreCourse.error} />}
      {restoreGroup.error && <ErrorBox error={restoreGroup.error} />}
    </Page>
  );
}

export const adminCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/courses',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminCourses,
});
