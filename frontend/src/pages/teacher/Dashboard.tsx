import { useState } from 'react';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, FileUp, ListTree, Plus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page, Select } from '../../components/ui';
import type { TeacherCourse as Course } from '../../../../shared/api';

export default function TeacherDashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(teacherCoursesQuery);
  const { data: grades } = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/taxonomy/grades'),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/taxonomy/categories'),
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'ACADEMIC' | 'GENERAL'>('ACADEMIC');
  const [gradeId, setGradeId] = useState('');
  const [semester, setSemester] = useState('Semester 1');
  const [categoryId, setCategoryId] = useState('');
  const [formError, setFormError] = useState<Error | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api('/api/teacher/courses', {
        body: {
          title,
          courseType: type,
          gradeId: type === 'ACADEMIC' ? gradeId : undefined,
          semester: type === 'ACADEMIC' ? semester : undefined,
          categoryId: type === 'GENERAL' ? categoryId : undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
      setShowForm(false);
      setTitle('');
    },
    onError: (e) => setFormError(e),
  });

  return (
    <Page title={t('myWorkspace')}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('courses')}</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="inline" size={18} /> {t('newCourse')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="flex flex-col gap-3">
            <Input label={t('newCourse')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Physics — Grade 10" />
            <Select label={`${t('academic')} / ${t('general')}`} value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="ACADEMIC">{t('academic')}</option>
              <option value="GENERAL">{t('general')}</option>
            </Select>
            {type === 'ACADEMIC' ? (
              <>
                <Select label={t('grade')} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">— {t('grade')} —</option>
                  {grades?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
                <Input label={t('semester')} value={semester} onChange={(e) => setSemester(e.target.value)} />
              </>
            ) : (
              <Select label={t('general')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— {t('general')} —</option>
                {categories?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            )}
            {formError && <ErrorBox error={formError} />}
            <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>{t('save')}</Button>
          </div>
        </Card>
      )}

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((c) => (
            <Card key={c.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.courseType === 'ACADEMIC' ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}>
                  {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                </span>
              </div>
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-soft">
                {c.analytics.students} {t('students')} · {c.analytics.groups} {t('groups')} · {c.analytics.lessons} {t('lessons')} · {t('progress')} {c.analytics.avgProgress}%
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <AddGroup courseId={c.id} />
                  <button
                    onClick={() => api(`/api/teacher/courses/${c.id}`, { method: 'PATCH', body: { isPublished: !c.isPublished } }).then(() => qc.invalidateQueries({ queryKey: ['teacher-courses'] }))}
                    className="flex items-center gap-2 text-ink-soft hover:text-primary"
                  >
                    {c.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                    {c.isPublished ? t('active') : t('suspended')}
                  </button>
                </div>
                <Link to="/teacher/courses/$courseId/curriculum" params={{ courseId: c.id }} className="flex items-center gap-2 font-semibold text-primary">
                  <ListTree size={16} /> {t('curriculum')}
                </Link>
                {c.groups.map((g) => (
                  <Link key={g.id} to="/teacher/groups/$groupId" params={{ groupId: g.id }} className="flex items-center gap-2 text-primary">
                    <Users size={16} /> {g.name}
                    <span className="text-xs text-ink-soft">({g.studentCount})</span>
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs font-bold" dir="ltr">{g.joinCode}</span>
                  </Link>
                ))}
                <button
                  className="flex items-center gap-2 text-ink-soft"
                  onClick={() => navigate({ to: '/teacher/courses/$courseId/curriculum', params: { courseId: c.id } })}
                >
                  <FileUp size={16} /> {t('pacing')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

function AddGroup({ courseId }: { courseId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const add = useMutation({
    mutationFn: () => api(`/api/teacher/courses/${courseId}/groups`, { body: { name } }),
    onSuccess: () => {
      setName('');
      setOpen(false);
      return qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 font-semibold text-primary">
        <Plus size={16} /> {t('newGroup')}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <input
        className="w-36 rounded-lg border border-line px-2 py-1 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('newGroup')}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && add.mutate()}
      />
      <button onClick={() => add.mutate()} disabled={!name.trim()} className="font-semibold text-primary">
        {t('add')}
      </button>
      {add.error && <ErrorBox error={add.error} />}
    </span>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const teacherCoursesQuery = {
  queryKey: ['teacher-courses'] as const,
  queryFn: () => api<Course[]>('/api/teacher/courses'),
};

export const teacherDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/dashboard',
  beforeLoad: () => requireRole('TEACHER'),
  loader: () => queryClient.ensureQueryData(teacherCoursesQuery),
  component: TeacherDashboard,
});
