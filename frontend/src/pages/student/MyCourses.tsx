import { Link, createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { localizeName, useLang } from '../../lib/i18n';
import { Card, EmptyState, ErrorBox, Loading, Page, Progress } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import type { StudentGroup } from '../../../../shared/api';

export default function StudentMyCourses() {
  const { t, lang } = useLang();
  const groups = useQuery({
    queryKey: ['student-groups'],
    queryFn: () => api<StudentGroup[]>('/api/student/groups'),
  });

  return (
    <Page title={t('myCourses')}>
      {groups.isLoading ? <Loading /> : groups.error ? <ErrorBox error={groups.error} /> : groups.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.data.map((e) => (
            <Link key={e.group.id} to="/student/groups/$groupId" params={{ groupId: e.group.id }}>
              <Card className="h-full transition hover:border-primary">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <BookOpen size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">{e.group.name}</span>
                </div>
                <h2 className="text-lg font-bold">{e.course.title}</h2>
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
                  <span>{e.teacher.name}{e.teacher.subject ? ` · ${localizeName(e.teacher.subject, lang)}` : ''}</span>
                  {e.teacher.isTopTeacher && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 border border-amber-500/20"
                      title={t('topTeacher')}
                    >
                      <Sparkles size={11} className="text-amber-500" />
                      {t('topTeacher')}
                    </span>
                  )}
                </div>
                <Progress value={e.progress} />
                <p className="mt-1 text-xs text-ink-soft">
                  {t('progress')}: <span className="tabular-nums">{e.progress}% · {e.completedLessons}/{e.totalLessons}</span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={t('noGroupsTitle')} description={t('myCoursesHint')} icon={BookOpen} />
      )}
    </Page>
  );
}

export const studentMyCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/my-courses',
  beforeLoad: () => requireRole('STUDENT'),
  component: StudentMyCourses,
});
