import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { api, type SessionUser } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page, Progress } from '../../components/ui';

type Enrolled = {
  group: { id: string; name: string; joinCode: string };
  course: { id: string; title: string; description: string | null };
  teacher: { name: string; specialization: string | null };
  progress: number;
};

export default function StudentDashboard() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [user] = useState(() => ({} as SessionUser)); void user;
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-groups'],
    queryFn: () => api<Enrolled[]>('/api/student/groups'),
  });
  const [code, setCode] = useState('');
  const join = useMutation({
    mutationFn: () => api('/api/student/groups/join', { body: { joinCode: code.trim() } }),
    onSuccess: () => {
      setCode('');
      void qc.invalidateQueries({ queryKey: ['student-groups'] });
    },
  });

  return (
    <Page title={t('myCourses')}>
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <Input
              label={t('enterCode')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OM123456"
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

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((e) => (
            <Link key={e.group.id} to={`/student/groups/${e.group.id}`}>
              <Card className="transition hover:shadow-md">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <BookOpen size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {e.group.name}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{e.course.title}</h3>
                <p className="mb-3 text-sm text-ink-soft">
                  {e.teacher.name}{e.teacher.specialization ? ` · ${e.teacher.specialization}` : ''}
                </p>
                <Progress value={e.progress} />
                <p className="mt-1 text-xs text-ink-soft">
                  {t('progress')}: {e.progress}%
                </p>
              </Card>
            </Link>
          ))}
          {data?.length === 0 && (
            <p className="text-ink-soft">
              {lang === 'ar' ? 'لم تنضم إلى أي مجموعة بعد — استخدم الرمز أعلاه.' : 'No groups yet — use the code above.'}
            </p>
          )}
        </div>
      )}
    </Page>
  );
}
