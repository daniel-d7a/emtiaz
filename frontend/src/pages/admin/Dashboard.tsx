import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, type Key } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page } from '../../components/ui';

type Overview = Record<string, number>;
type TeacherRow = {
  id: string; name: string; email: string; phoneNumber: string | null; isActive: boolean; createdAt: string;
};
type StudentRow = {
  id: string; name: string; email: string; phoneNumber: string | null; gradeId: string | null;
  isActive: boolean; createdAt: string;
  enrollments: Array<{ groupName: string; courseTitle: string; courseId: string }>;
};
type CourseRow = {
  id: string; title: string; courseType: 'ACADEMIC' | 'GENERAL'; isPublished: boolean;
  teacherName: string;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

export default function AdminDashboard() {
  const { t } = useLang();
  const [tab, setTab] = useState<'teachers' | 'students' | 'courses' | 'taxonomy'>('teachers');
  const [search, setSearch] = useState('');

  const overview = useQuery(adminOverviewQuery);
  const teachers = useQuery({
    queryKey: ['admin-teachers', search],
    queryFn: () => api<TeacherRow[]>(`/api/admin/teachers?search=${encodeURIComponent(search)}`),
  });
  const students = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => api<StudentRow[]>(`/api/admin/students?search=${encodeURIComponent(search)}`),
  });
  const courses = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () =>
      api<CourseRow[]>('/api/admin/courses'),
  });
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin-teachers'] });
    void qc.invalidateQueries({ queryKey: ['admin-students'] });
    void qc.invalidateQueries({ queryKey: ['admin-courses'] });
    return void qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
    onSuccess: invalidateAll,
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateAll,
  });
  const confirmDelete = (u: { id: string; name: string }) => {
    if (window.confirm(`${t('delete')} ${u.name}?`)) deleteUser.mutate(u.id);
  };

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
        {(['teachers', 'students', 'courses', 'taxonomy'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm ${tab === k ? 'bg-primary text-white' : 'border border-line'}`}>
            {k === 'teachers' ? t('teachers') : k === 'students' ? t('students') : k === 'courses' ? t('courses') : t('taxonomy')}
          </button>
        ))}
      </div>

      {deleteUser.error && <ErrorBox error={deleteUser.error} />}

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStatus.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${u.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                    >
                      {u.isActive ? t('suspend') : t('activate')}
                    </button>
                    <button
                      aria-label={`${t('delete')} ${u.name}`}
                      onClick={() => confirmDelete(u)}
                      className="text-ink-soft hover:text-secondary"
                      title={t('delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
              {teachers.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
            </ul>
          )}
          {setStatus.error && <ErrorBox error={setStatus.error} />}
        </Card>
      )}

      {tab === 'taxonomy' && <TaxonomyTabs />}

      {tab === 'students' && (
        <StudentsTab
          students={students}
          invalidate={invalidateAll}
          setStatus={setStatus}
          onDelete={confirmDelete}
          search={search}
          setSearch={setSearch}
        />
      )}

      {tab === 'courses' && (
        <Card>
          {courses.isLoading ? <Loading /> : courses.error ? <ErrorBox error={courses.error} /> : (
            <ul className="flex flex-col divide-y divide-line">
              {courses.data?.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-semibold">
                      {c.title}{' '}
                      <span className={`ms-1 rounded-full px-2 text-xs ${c.courseType === 'ACADEMIC' ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}>
                        {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                      </span>
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
                </li>
              ))}
              {courses.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
            </ul>
          )}
        </Card>
      )}
    </Page>
  );
}

function TaxonomyTabs() {
  const { t } = useLang();
  const [kind, setKind] = useState<'grades' | 'categories'>('grades');
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['grades', 'categories'] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-2 text-sm ${kind === k ? 'bg-primary text-white' : 'border border-line'}`}>
            {k}
          </button>
        ))}
      </div>
      <Taxonomy key={kind} kind={kind} />
    </div>
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

type StudentQuery = ReturnType<typeof useQuery<StudentRow[], Error>>;

function StudentsTab({
  students,
  invalidate,
  setStatus,
  onDelete,
  search,
  setSearch,
}: {
  students: StudentQuery;
  invalidate: () => void;
  setStatus: { mutate: (v: { id: string; isActive: boolean }) => void; error: unknown };
  onDelete: (u: { id: string; name: string }) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const { t } = useLang();
  const groups = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/groups'),
  });
  const enroll = useMutation({
    mutationFn: ({ studentId, groupId }: { studentId: string; groupId: string }) =>
      api(`/api/admin/students/${studentId}/enroll`, { body: { groupId } }),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <div className="mb-3">
        <Input label={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} />
      </div>
      {students.isLoading ? <Loading /> : students.error ? <ErrorBox error={students.error} /> : (
        <ul className="flex flex-col divide-y divide-line">
          {students.data?.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-ink-soft" dir="ltr">{u.phoneNumber ?? u.email}</p>
                <p className="text-xs text-ink-soft">
                  {u.enrollments.map((e) => e.courseTitle).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded border border-line px-2 py-1 text-xs"
                  defaultValue=""
                  onChange={(e) => e.target.value && enroll.mutate({ studentId: u.id, groupId: e.target.value })}
                >
                  <option value="">{t('moveTo')}</option>
                  {groups.data?.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setStatus.mutate({ id: u.id, isActive: !u.isActive })}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${u.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                >
                  {u.isActive ? t('suspend') : t('activate')}
                </button>
                <button
                  aria-label={`${t('delete')} ${u.name}`}
                  onClick={() => onDelete(u)}
                  className="text-ink-soft hover:text-secondary"
                  title={t('delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {students.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
        </ul>
      )}
      {((enroll.error ?? setStatus.error) as Error | null) && <ErrorBox error={enroll.error ?? setStatus.error} />}
    </Card>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

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
