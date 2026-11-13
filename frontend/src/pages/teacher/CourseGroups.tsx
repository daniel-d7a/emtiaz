import { Link, createRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatDays, useLang } from '../../lib/i18n';
import { Badge, Button, Card, EmptyState, ErrorBox, IconButton, InfoHint, Loading, Page, Progress } from '../../components/ui';
import { teacherCoursesQuery } from './Dashboard';

export default function TeacherCourseGroups() {
  const { courseId } = useParams({ from: '/teacher/courses/$courseId/groups' });
  const { t, lang } = useLang();
  const { data, isLoading, error } = useQuery(teacherCoursesQuery);
  const course = data?.find((item) => item.id === courseId);

  if (isLoading) return <Page title={t('groups')}><Loading /></Page>;
  if (error) return <Page title={t('groups')}><ErrorBox error={error} /></Page>;
  if (!course) return <Page title={t('groups')}><EmptyState title={t('noResults')} /></Page>;

  return (
    <Page
      title={course.title}
      wide
      right={<Link to="/teacher/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft size={16} className="rtl:rotate-180" /> {t('backToCourses')}</Link>}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={course.courseType === 'ACADEMIC' ? 'primary' : 'secondary'}>
            {course.courseType === 'ACADEMIC' ? t('academic') : t('general')}
          </Badge>
          <Badge>{course.isPublished ? t('active') : t('suspended')}</Badge>
          <InfoHint
            title={t('hintCoursesVsGroupsTitle')}
            steps={[
              { title: t('hintCoursesVsGroupsStep1Title'), body: t('hintCoursesVsGroupsStep1Body') },
              { title: t('hintCoursesVsGroupsStep2Title'), body: t('hintCoursesVsGroupsStep2Body') },
              { title: t('hintCoursesVsGroupsStep3Title'), body: t('hintCoursesVsGroupsStep3Body') },
            ]}
          />
        </div>
        <Link to="/teacher/courses/$courseId/groups/new" params={{ courseId }}>
          <Button>
            <Plus className="inline" size={18} /> {t('newGroup')}
          </Button>
        </Link>
      </div>

      {course.groups.length === 0 ? (
        <EmptyState title={t('noGroupsCourse')} icon={Plus} />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
              <thead className="bg-surface">
                <tr className="text-start text-xs font-bold text-ink-soft">
                  <th className="border-b border-line px-3 py-2 text-start">{t('groups')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('joinCode')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('created')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('students')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('progress')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('days')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('status')}</th>
                  <th className="border-b border-line px-3 py-2 text-start">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {course.groups.map((group) => (
                  <tr key={group.id}>
                    <td className="border-b border-line px-3 py-3 font-semibold">{group.name}</td>
                    <td className="border-b border-line px-3 py-3" dir="ltr">{group.joinCode}</td>
                    <td className="border-b border-line px-3 py-3 text-ink-soft">{formatDateTime(group.createdAt, lang)}</td>
                    <td className="border-b border-line px-3 py-3 tabular-nums">{group.studentCount}</td>
                    <td className="border-b border-line px-3 py-3">
                      <div className="flex w-28 items-center gap-2">
                        <Progress value={group.progress} />
                        <span className="text-xs font-bold tabular-nums">{group.progress}%</span>
                      </div>
                    </td>
                    <td className="border-b border-line px-3 py-3 text-ink-soft">{formatDays(group.days, lang) || '—'}</td>
                    <td className="border-b border-line px-3 py-3">
                      <Badge tone={group.isActive ? 'primary' : 'neutral'}>{group.isActive ? t('active') : t('suspended')}</Badge>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to="/teacher/groups/$groupId"
                          params={{ groupId: group.id }}
                          aria-label={t('open')}
                          title={t('open')}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-soft hover:bg-line/60 hover:text-ink"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <IconButton
                          label={t('copyJoinLink')}
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/join/${group.joinCode}`).then(
                              () => toast.success(t('copied')),
                              () => toast.error(t('errorOccurred')),
                            );
                          }}
                        >
                          <Copy size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const teacherCourseGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/courses/$courseId/groups',
  beforeLoad: () => requireRole('TEACHER'),
  loader: () => queryClient.ensureQueryData(teacherCoursesQuery),
  component: TeacherCourseGroups,
});
