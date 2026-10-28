import { createRoute } from '@tanstack/react-router';
import { queryClient } from '../../lib/queryClient';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, Users, UsersRound } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Card, ErrorBox, Loading, Page, StatCard } from '../../components/ui';

type Overview = {
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  academicCourses: number;
  generalCourses: number;
  totalGroups: number;
  activeGroups: number;
};
type NotificationRow = {
  id: string;
  channel: string;
  type: string;
  recipient: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const overview = useQuery(adminOverviewQuery);
  const notifications = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api<NotificationRow[]>('/api/admin/notifications'),
  });

  return (
    <Page title={t('overview')}>
      {overview.error ? <ErrorBox error={overview.error} /> : overview.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={GraduationCap} label={t('teachers')} value={overview.data.totalTeachers} />
          <StatCard icon={Users} label={t('students')} value={overview.data.totalStudents} />
          <StatCard icon={BookOpen} label={t('courses')} value={overview.data.totalCourses} />
          <StatCard icon={UsersRound} label={t('groups')} value={overview.data.totalGroups} />
        </div>
      ) : <Loading />}

      {overview.data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <OverviewChart
            title={t('courses')}
            bars={[
              { label: t('academicCourses'), value: overview.data.academicCourses, tone: 'bg-primary' },
              { label: t('generalCourses'), value: overview.data.generalCourses, tone: 'bg-secondary' },
            ]}
          />
          <OverviewChart
            title={t('groups')}
            bars={[
              { label: t('activeGroups'), value: overview.data.activeGroups, tone: 'bg-primary' },
              {
                label: t('inactiveGroups'),
                value: overview.data.totalGroups - overview.data.activeGroups,
                tone: 'bg-ink-soft',
              },
            ]}
          />
        </div>
      )}

      <Card className="mt-4">
        <h2 className="font-bold">{t('recentNotifications')}</h2>
        {notifications.isLoading ? <Loading /> : notifications.error ? <ErrorBox error={notifications.error} /> : (
          notifications.data?.length ? (
            <ul className="mt-3 flex flex-col divide-y divide-line text-sm">
              {notifications.data.map((n) => (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold">
                      {n.type === 'SYSTEM' ? t('system') : t(n.type.toLowerCase() as 'admin' | 'parent' | 'teacher')} · {n.channel}
                    </p>
                    <p className="text-ink-soft" dir="ltr">{n.recipient}</p>
                    <p className="text-xs text-ink-soft">{n.message}</p>
                  </div>
                  <span className="text-xs text-ink-soft">{formatDateTime(n.createdAt, lang)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-ink-soft">{t('noNotifications')}</p>
        )}
      </Card>
    </Page>
  );
}

function OverviewChart({
  title, bars,
}: {
  title: string;
  bars: Array<{ label: string; value: number; tone: string }>;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <Card>
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{bar.label}</span>
              <span className="font-bold tabular-nums">{bar.value}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full ${bar.tone}`}
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export const adminOverviewQuery = {
  queryKey: ['admin-overview'] as const,
  queryFn: () => api<Overview>('/api/admin/overview'),
};

export const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/dashboard',
  beforeLoad: () => requireRole('ADMIN'),
  loader: () => queryClient.ensureQueryData(adminOverviewQuery),
  component: AdminDashboard,
});
