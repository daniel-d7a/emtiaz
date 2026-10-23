import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, ListTree, FileUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page, Select } from '../../components/ui';

type Course = {
  id: string;
  title: string;
  description: string | null;
  courseType: 'ACADEMIC' | 'GENERAL';
  semester: string | null;
  groups: Array<{ id: string; name: string; joinCode: string }>;
};

export default function TeacherDashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<Course[]>('/api/teacher/courses'),
  });
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
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link to={`/teacher/courses/${c.id}/curriculum`} className="flex items-center gap-2 font-semibold text-primary">
                  <ListTree size={16} /> {t('curriculum')}
                </Link>
                {c.groups.map((g) => (
                  <Link key={g.id} to={`/teacher/groups/${g.id}`} className="flex items-center gap-2 text-primary">
                    <Users size={16} /> {g.name}
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs font-bold" dir="ltr">{g.joinCode}</span>
                  </Link>
                ))}
                <button
                  className="flex items-center gap-2 text-ink-soft"
                  onClick={() => navigate(`/teacher/courses/${c.id}/curriculum?upload=1`)}
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
