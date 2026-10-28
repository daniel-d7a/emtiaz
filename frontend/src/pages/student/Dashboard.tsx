import { useState } from 'react';
import { Link, createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { formatDateTime, localizeName, useLang } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { Button, Card, EmptyState, ErrorBox, Input, Loading, Page, Progress, StatCard } from '../../components/ui';
import type { InboxItem, StudentHome } from '../../../../shared/api';

export default function StudentDashboard() {
  const { t, lang } = useLang();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const home = useQuery(studentHomeQuery);
  const announcements = useQuery({
    queryKey: ['student-announcements'],
    queryFn: () => api<InboxItem[]>('/api/notifications?limit=5'),
  });
  const [code, setCode] = useState('');
  const join = useMutation({
    mutationFn: () => api('/api/student/groups/join', { body: { joinCode: code.trim() } }),
    onSuccess: () => {
      setCode('');
      toast.success(t('joinedOk'));
      void qc.invalidateQueries({ queryKey: ['student-home'] });
      void qc.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  const stats = home.data?.stats;

  return (
    <Page title={`${t('welcome')} ${session?.user.name ?? ''}`}>
      {home.isLoading ? <Loading /> : home.error ? <ErrorBox error={home.error} /> : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label={t('activeGroups')} value={stats?.activeGroups ?? 0} />
            <StatCard label={t('lessonsDone')} value={stats?.lessonsDone ?? 0} />
            <StatCard label={t('averageGrade')} value={`${stats?.averageGrade ?? 0}%`} />
          </div>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{t('latestCourses')}</h2>
              <Link to="/student/my-courses" className="text-sm font-semibold text-primary underline">
                {t('myCourses')}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {home.data?.latestCourses.map((e) => (
                <Link key={e.group.id} to="/student/groups/$groupId" params={{ groupId: e.group.id }}>
                  <Card className="transition hover:border-primary">
                    <div className="mb-2 flex items-center gap-2 text-primary">
                      <BookOpen size={18} />
                      <span className="text-xs font-semibold uppercase tracking-wide">{e.group.name}</span>
                    </div>
                    <h3 className="text-lg font-bold">{e.course.title}</h3>
                    <p className="mb-3 text-sm text-ink-soft">
                      {e.teacher.name}{e.teacher.subject ? ` · ${localizeName(e.teacher.subject, lang)}` : ''}
                    </p>
                    <Progress value={e.progress} />
                    <p className="mt-1 text-xs text-ink-soft">{t('progress')}: <span className="tabular-nums">{e.progress}%</span></p>
                  </Card>
                </Link>
              ))}
              {home.data?.latestCourses.length === 0 && (
                <div className="sm:col-span-2">
                  <EmptyState title={t('noGroupsTitle')} description={t('noGroupsHint')} icon={BookOpen} />
                </div>
              )}
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Bell size={18} /> {t('announcements')}
            </h2>
            <Card>
              {announcements.isLoading ? <Loading /> : announcements.error ? <ErrorBox error={announcements.error} /> : (
                announcements.data?.length ? (
                  <ul className="flex flex-col divide-y divide-line">
                    {announcements.data.map((n) => (
                      <li key={n.id} className="py-3">
                        <p className={n.readAt ? 'text-sm text-ink-soft' : 'text-sm font-semibold'}>{n.message}</p>
                        <p className="mt-1 text-xs text-ink-soft">{formatDateTime(n.createdAt, lang)}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-ink-soft">{t('noAnnouncements')}</p>
              )}
            </Card>
          </section>
        </>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('joinClass')}</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <Input
              label={t('enterCode')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('enterCodePlaceholder')}
              maxLength={8}
              dir="ltr"
            />
          </div>
          <Button onClick={() => join.mutate()} disabled={code.trim().length < 6}>
            <Plus className="inline" size={18} /> {t('join')}
          </Button>
        </div>
        {join.error && <div className="mt-2"><ErrorBox error={join.error} /></div>}
      </Card>
    </Page>
  );
}

export const studentHomeQuery = {
  queryKey: ['student-home'] as const,
  queryFn: () => api<StudentHome>('/api/student/home'),
};

export const studentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/dashboard',
  beforeLoad: () => requireRole('STUDENT'),
  loader: () => queryClient.ensureQueryData(studentHomeQuery),
  component: StudentDashboard,
});

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';
