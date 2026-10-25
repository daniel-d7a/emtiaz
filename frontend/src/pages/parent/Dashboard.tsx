import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Link2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page, Progress } from '../../components/ui';

type Group = {
  group: { id: string; name: string };
  course: { title: string };
  teacher: { name: string };
  progress: number;
};
type Child = { id: string; name: string; email: string; phoneNumber: string | null; groups: Group[] };
type Grades = {
  quizzes: Array<{ quizId: string; title: string; lessonTitle: string; score: number; maxScore: number }>;
  manual: Array<{ columnId: string; title: string; maxScore: number; score: number | null; note: string | null }>;
};

export default function ParentDashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const children = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api<Child[]>('/api/parent/students'),
  });
  const link = useMutation({
    mutationFn: () => api('/api/parent/link', { body: { code: code.trim() } }),
    onSuccess: () => {
      setCode('');
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });

  return (
    <Page title={t('myChildren')}>
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <Input label={t('childCode')} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" maxLength={16} />
          </div>
          <Button onClick={() => link.mutate()} disabled={code.trim().length < 4}>
            <Link2 className="inline" size={18} /> {t('linkChild')}
          </Button>
        </div>
        {link.error && <div className="mt-2"><ErrorBox error={link.error} /></div>}
      </Card>

      {children.isLoading ? <Loading /> : children.error ? <ErrorBox error={children.error} /> : (
        <div className="flex flex-col gap-4">
          {children.data?.map((child) => (
            <Card key={child.id}>
              <div className="mb-3 flex items-center gap-2 text-primary">
                <GraduationCap size={18} />
                <h2 className="text-lg font-bold">{child.name}</h2>
              </div>
              <p className="mb-4 text-sm text-ink-soft" dir="ltr">{child.email}{child.phoneNumber ? ` · ${child.phoneNumber}` : ''}</p>
              <div className="flex flex-col gap-3">
                {child.groups.map((g) => {
                  const key = `${child.id}:${g.group.id}`;
                  return (
                    <div key={key} className="rounded-xl border border-line p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{g.course.title}</p>
                          <p className="text-xs text-ink-soft">{g.group.name} · {g.teacher.name}</p>
                        </div>
                        <Button variant="ghost" onClick={() => setOpen(open === key ? null : key)}>
                          {t('viewGrades')}
                        </Button>
                      </div>
                      <Progress value={g.progress} />
                      <p className="mt-1 text-xs text-ink-soft">{t('progress')}: {g.progress}%</p>
                      {open === key && <ChildGrades studentId={child.id} groupId={g.group.id} />}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {children.data?.length === 0 && <p className="text-ink-soft">{t('noChildren')}</p>}
        </div>
      )}
    </Page>
  );
}

function ChildGrades({ studentId, groupId }: { studentId: string; groupId: string }) {
  const { t } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-grades', studentId, groupId],
    queryFn: () => api<Grades>(`/api/parent/students/${studentId}/groups/${groupId}/grades`),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-sm">
      <div>
        <p className="mb-1 font-semibold">{t('quiz')}</p>
        {data.quizzes.length === 0 ? <p className="text-ink-soft">—</p> : (
          <ul className="flex flex-col gap-1">
            {data.quizzes.map((q) => (
              <li key={q.quizId} className="flex justify-between gap-2">
                <span>{q.title}</span>
                <span className="font-semibold">{q.score}/{q.maxScore}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 font-semibold">{t('gradebook')}</p>
        {data.manual.length === 0 ? <p className="text-ink-soft">—</p> : (
          <ul className="flex flex-col gap-1">
            {data.manual.map((m) => (
              <li key={m.columnId} className="flex justify-between gap-2">
                <span>{m.title}</span>
                <span className="font-semibold">{m.score ?? '—'}/{m.maxScore}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

export const parentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parent/dashboard',
  beforeLoad: () => requireRole('PARENT'),
  component: ParentDashboard,
});
