import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { formatDateTime, localizeName, useLang, type Key } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, ErrorBox, Input, Loading, Page, StatCard } from '../../components/ui';

type Overview = Record<string, number>;
type TeacherRow = {
  id: string; name: string; email: string; phoneNumber: string | null; isActive: boolean; createdAt: string;
};
type StudentRow = {
  id: string; name: string; email: string; phoneNumber: string | null; gradeId: string | null;
  isActive: boolean; createdAt: string;
  enrollments: Array<{ groupName: string; courseTitle: string; courseId: string }>;
};
type AuditRow = {
  id: string; action: string; targetType: string; targetId: string | null;
  metadata: Record<string, unknown> | null; createdAt: string; actorName: string;
};
type ParentRow = {
  id: string; name: string; email: string; phoneNumber: string | null; isActive: boolean;
  createdAt: string;
  children: Array<{ id: string; name: string; email: string }>;
};
type NotificationSettings = {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  adminEnabled: boolean;
  parentEnabled: boolean;
  teacherEnabled: boolean;
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
type CourseRow = {
  id: string; title: string; courseType: 'ACADEMIC' | 'GENERAL'; isPublished: boolean;
  teacherName: string;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<'teachers' | 'students' | 'parents' | 'courses' | 'notifications' | 'taxonomy' | 'audit'>('teachers');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [auditAction, setAuditAction] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const changeSearch = (v: string) => { setSearch(v); setLimit(20); };

  const overview = useQuery(adminOverviewQuery);
  const teachers = useQuery({
    queryKey: ['admin-teachers', search, limit],
    queryFn: () => api<TeacherRow[]>(`/api/admin/teachers?limit=${limit}&search=${encodeURIComponent(search)}`),
  });
  const parents = useQuery({
    queryKey: ['admin-parents', search, limit],
    queryFn: () => api<ParentRow[]>(`/api/admin/parents?limit=${limit}&search=${encodeURIComponent(search)}`),
    enabled: tab === 'parents',
  });
  const students = useQuery({
    queryKey: ['admin-students', search, limit],
    queryFn: () => api<StudentRow[]>(`/api/admin/students?limit=${limit}&search=${encodeURIComponent(search)}`),
  });
  const courses = useQuery({
    queryKey: ['admin-courses', limit],
    queryFn: () =>
      api<CourseRow[]>(`/api/admin/courses?limit=${limit}`),
  });
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api<NotificationSettings>('/api/admin/notification-settings'),
  });
  const audit = useQuery({
    queryKey: ['admin-audit', auditAction],
    queryFn: () =>
      api<AuditRow[]>(`/api/admin/audit?limit=100&action=${encodeURIComponent(auditAction)}`),
    enabled: tab === 'audit',
  });
  const notifications = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api<NotificationRow[]>('/api/admin/notifications'),
    enabled: tab === 'notifications',
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
    onSuccess: () => {
      toast.success(t('saved'));
      invalidateAll();
    },
  });
  const updateSettings = useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) =>
      api('/api/admin/notification-settings', { method: 'PATCH', body: patch }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
  const monthlySummary = useMutation({
    mutationFn: () => api<{ parents: number }>('/api/admin/notifications/monthly-summary', { method: 'POST' }),
    onSuccess: () => toast.success(t('sent')),
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidateAll();
    },
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
            <StatCard key={key as string} label={t(key as Key)} value={value} />
          ))}
        </div>
      ) : <Loading />}

      <div className="mb-4 flex flex-wrap gap-2">
        {(['teachers', 'students', 'parents', 'courses', 'notifications', 'taxonomy', 'audit'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm ${tab === k ? 'bg-primary text-white' : 'border border-line'}`}>
            {k === 'teachers' ? t('teachers') : k === 'students' ? t('students') : k === 'parents' ? t('parents') : k === 'courses' ? t('courses') : k === 'notifications' ? t('notifications') : k === 'taxonomy' ? t('taxonomy') : t('auditLog')}
          </button>
        ))}
      </div>

      {deleteUser.error && <ErrorBox error={deleteUser.error} />}

      {tab === 'teachers' && (
        <Card>
          <div className="mb-3">
            <Input label={t('search')} value={search} onChange={(e) => changeSearch(e.target.value)} placeholder={t('search')} />
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
                      onClick={() => setDeleteTarget(u)}
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
          {(teachers.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
          {setStatus.error && <ErrorBox error={setStatus.error} />}
        </Card>
      )}

      {tab === 'notifications' && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">{t('notifications')}</h2>
          {settings.isLoading ? <Loading /> : settings.error ? <ErrorBox error={settings.error} /> : settings.data && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('channels')}</p>
              {([
                ['whatsappEnabled', 'whatsapp'],
                ['emailEnabled', 'email'],
                ['inAppEnabled', 'inApp'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={settings.data[key]}
                    onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
                  />
                  {t(label)}
                </label>
              ))}
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('types')}</p>
              {([
                ['adminEnabled', 'admin'],
                ['parentEnabled', 'parent'],
                ['teacherEnabled', 'teacher'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={settings.data[key]}
                    onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
                  />
                  {t(label)}
                </label>
              ))}
              {updateSettings.error && <ErrorBox error={updateSettings.error} />}
              <div className="mt-3 flex items-center gap-3">
                <Button variant="ghost" onClick={() => monthlySummary.mutate()} disabled={monthlySummary.isPending}>
                  {t('sendMonthlySummary')}
                </Button>
                {monthlySummary.data && <span className="text-sm text-ink-soft">{monthlySummary.data.parents}</span>}
              </div>
              {monthlySummary.error && <ErrorBox error={monthlySummary.error} />}
            </div>
          )}

          <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-ink-soft">{t('recentNotifications')}</h3>
          {notifications.isLoading ? <Loading /> : notifications.error ? <ErrorBox error={notifications.error} /> : (
            notifications.data?.length ? (
              <ul className="flex flex-col divide-y divide-line text-sm">
                {notifications.data.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                    <div>
                      <p className="font-semibold">
                        {n.type === 'SYSTEM' ? t('system') : t(n.type.toLowerCase() as 'admin' | 'parent' | 'teacher')} · {n.channel}
                      </p>
                      <p className="text-ink-soft" dir="ltr">{n.recipient}</p>
                      <p className="line-clamp-2 text-xs text-ink-soft">{n.message}</p>
                    </div>
                    <span className="text-xs text-ink-soft">{formatDateTime(n.createdAt, lang)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">{t('noNotifications')}</p>
          )}
        </Card>
      )}

      {tab === 'taxonomy' && <TaxonomyTabs />}

      {tab === 'audit' && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">{t('auditLog')}</h2>
          <div className="mb-3">
            <Input label={t('filterAction')} value={auditAction} onChange={(e) => setAuditAction(e.target.value)} placeholder="user.status" />
          </div>
          {audit.isLoading ? <Loading /> : audit.error ? <ErrorBox error={audit.error} /> : (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {audit.data?.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <div>
                    <p className="font-semibold">{r.action}</p>
                    <p className="text-ink-soft">{r.actorName} · {r.targetType}{r.targetId ? ` · ${r.targetId}` : ''}</p>
                  </div>
                  <span className="text-xs text-ink-soft">{formatDateTime(r.createdAt, lang)}</span>
                </li>
              ))}
              {audit.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
            </ul>
          )}
        </Card>
      )}

      {tab === 'students' && (
        <StudentsTab
          students={students}
          invalidate={invalidateAll}
          setStatus={setStatus}
          onDelete={setDeleteTarget}
          search={search}
          setSearch={changeSearch}
          limit={limit}
          onLoadMore={() => setLimit((l) => l + 20)}
        />
      )}

      {tab === 'parents' && (
        <Card>
          <div className="mb-3">
            <Input label={t('search')} value={search} onChange={(e) => changeSearch(e.target.value)} placeholder={t('search')} />
          </div>
          {parents.isLoading ? <Loading /> : parents.error ? <ErrorBox error={parents.error} /> : (
            <ul className="flex flex-col divide-y divide-line">
              {parents.data?.map((u) => (
                <li key={u.id} className="py-2">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-ink-soft" dir="ltr">{u.email}{u.phoneNumber ? ` · ${u.phoneNumber}` : ''}</p>
                  <p className="mt-1 text-sm">
                    {u.children.length ? u.children.map((c) => c.name).join(' · ') : '—'}
                  </p>
                </li>
              ))}
              {parents.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
            </ul>
          )}
          {(parents.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
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
                      <Badge tone={c.courseType === 'ACADEMIC' ? 'primary' : 'secondary'} className="ms-1">
                        {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                      </Badge>
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
          {(courses.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={`${t('delete')} ${deleteTarget?.name ?? ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
      />
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
            {k === 'grades' ? t('grades') : t('categories')}
          </button>
        ))}
      </div>
      <Taxonomy key={kind} kind={kind} />
    </div>
  );
}

function Taxonomy({ kind }: { kind: 'grades' | 'categories' }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const list = useQuery({
    queryKey: [kind],
    queryFn: () => api<Array<{ id: string; name: string }>>(`/api/admin/taxonomy/${kind}`),
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: [kind] });
  const add = useMutation({
    mutationFn: () => api(`/api/admin/taxonomy/${kind}`, { body: { name } }),
    onSuccess: () => {
      setName('');
      toast.success(t('saved'));
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/admin/taxonomy/${kind}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <Input label={kind === 'grades' ? t('grades') : t('categories')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} />
        </div>
        <Button onClick={() => add.mutate()} disabled={!name.trim()}>
          <Plus className="inline" size={16} /> {t('add')}
        </Button>
      </div>
      {add.error && <ErrorBox error={add.error} />}
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {list.data?.map((g) => (
          <li key={g.id} className="flex items-center justify-between py-2">
            <span className="font-semibold">{localizeName(g.name, lang)}</span>
            <button onClick={() => setDeleteTarget({ id: g.id, name: g.name })} aria-label={`${t('delete')} ${localizeName(g.name, lang)}`} title={t('delete')} className="text-ink-soft hover:text-secondary">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
      </ul>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={`${t('delete')} ${deleteTarget ? localizeName(deleteTarget.name, lang) : ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)}
      />
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
  limit,
  onLoadMore,
}: {
  students: StudentQuery;
  invalidate: () => void;
  setStatus: { mutate: (v: { id: string; isActive: boolean }) => void; error: unknown };
  onDelete: (u: { id: string; name: string }) => void;
  search: string;
  setSearch: (v: string) => void;
  limit: number;
  onLoadMore: () => void;
}) {
  const { t } = useLang();
  const groups = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/groups'),
  });
  const enroll = useMutation({
    mutationFn: ({ studentId, groupId }: { studentId: string; groupId: string }) =>
      api(`/api/admin/students/${studentId}/enroll`, { body: { groupId } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
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
      {(students.data?.length ?? 0) >= limit && limit < 200 && (
        <div className="mt-3"><Button variant="ghost" onClick={onLoadMore}>{t('loadMore')}</Button></div>
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
