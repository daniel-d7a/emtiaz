import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, type Key } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page } from '../../components/ui';

type Overview = Record<string, number>;
type TeacherRow = {
  id: string; name: string; email: string; phoneNumber: string | null; isActive: boolean; createdAt: string;
};

export default function AdminDashboard() {
  const { t } = useLang();
  const [tab, setTab] = useState<'teachers' | 'taxonomy'>('teachers');
  const [search, setSearch] = useState('');

  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Overview>('/api/admin/overview') });
  const teachers = useQuery({
    queryKey: ['admin-teachers', search],
    queryFn: () => api<TeacherRow[]>(`/api/admin/teachers?search=${encodeURIComponent(search)}`),
  });
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-teachers'] }),
  });

  return (
    <Page title={t('dashboard')}>
      {overview.error ? <ErrorBox error={overview.error} /> : overview.data ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['totalTeachers', overview.data.totalTeachers],
            ['totalStudents', overview.data.totalStudents],
            ['totalCourses', overview.data.totalCourses],
            ['totalGroups', overview.data.totalGroups],
            ['academicCourses', overview.data.academicCourses],
            ['generalCourses', overview.data.generalCourses],
            ['activeGroups', overview.data.activeGroups],
          ].map(([key, value]) => (
            <Card key={key as string}>
              <p className="text-3xl font-extrabold text-primary">{value}</p>
              <p className="text-sm text-ink-soft">{t(key as Key)}</p>
            </Card>
          ))}
        </div>
      ) : <Loading />}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['teachers', 'taxonomy'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm ${tab === k ? 'bg-primary text-white' : 'border border-line'}`}>
            {k === 'teachers' ? t('teachers') : t('taxonomy')}
          </button>
        ))}
      </div>

      {tab === 'teachers' && (
        <Card>
          <div className="mb-3">
            <Input label={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} />
          </div>
          {teachers.isLoading ? <Loading /> : teachers.error ? <ErrorBox error={teachers.error} /> : (
            <ul className="flex flex-col divide-y divide-line">
              {teachers.data?.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-ink-soft" dir="ltr">{u.email}{u.phoneNumber ? ` · ${u.phoneNumber}` : ''}</p>
                  </div>
                  <button
                    onClick={() => setStatus.mutate({ id: u.id, isActive: !u.isActive })}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${u.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                  >
                    {u.isActive ? t('activate') : t('suspend')}
                  </button>
                </li>
              ))}
              {teachers.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
            </ul>
          )}
          {setStatus.error && <ErrorBox error={setStatus.error} />}
        </Card>
      )}

      {tab === 'taxonomy' && <Taxonomy kind="grades" />}
    </Page>
  );
}

function Taxonomy({ kind }: { kind: 'grades' | 'categories' }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const list = useQuery({
    queryKey: [kind],
    queryFn: () => api<Array<{ id: string; name: string }>>(`/api/admin/taxonomy/${kind}`),
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: [kind] });
  const add = useMutation({
    mutationFn: () => api(`/api/admin/taxonomy/${kind}`, { body: { name } }),
    onSuccess: () => { setName(''); invalidate(); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/admin/taxonomy/${kind}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <Input label={kind} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} />
        </div>
        <Button onClick={() => add.mutate()} disabled={!name.trim()}>
          <Plus className="inline" size={16} /> {t('add')}
        </Button>
      </div>
      {add.error && <ErrorBox error={add.error} />}
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {list.data?.map((g) => (
          <li key={g.id} className="flex items-center justify-between py-2">
            <span className="font-semibold">{g.name}</span>
            <button onClick={() => del.mutate(g.id)} className="text-ink-soft hover:text-secondary">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
      </ul>
    </Card>
  );
}
