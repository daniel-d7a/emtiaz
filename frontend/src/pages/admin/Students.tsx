import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  enrollments: Array<{ groupName: string; courseTitle: string; courseId: string }>;
};

export default function AdminStudents() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const students = useQuery({
    queryKey: ['admin-students', search, limit, showDeleted],
    queryFn: () => api<StudentRow[]>(`/api/admin/students?limit=${limit}&search=${encodeURIComponent(search)}&deleted=${showDeleted}`),
  });
  const groups = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/groups'),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-students'] });
    void qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
  });
  const enroll = useMutation({
    mutationFn: ({ studentId, groupId }: { studentId: string; groupId: string }) =>
      api(`/api/admin/students/${studentId}/enroll`, { body: { groupId } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
  });
  const restoreUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });

  return (
    <Page title={t('students')}>
      <Card>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className={`min-h-12 rounded-xl px-4 text-sm font-semibold ${showDeleted ? 'bg-primary text-white' : 'border border-line text-ink-soft'}`}
          >
            {t('showDeleted')}
          </button>
          <div className="grow">
          <Input
            label={t('search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(20);
            }}
            placeholder={t('search')}
          />
          </div>
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
                  {u.deletedAt ? (
                    <button
                      onClick={() => restoreUser.mutate(u.id)}
                      className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                    >
                      {t('restore')}
                    </button>
                  ) : (
                    <>
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
                        onClick={() => setDeleteTarget(u)}
                        className="text-ink-soft hover:text-secondary"
                        title={t('delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
            {students.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
          </ul>
        )}
        {(students.data?.length ?? 0) >= limit && limit < 200 && (
          <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
        )}
        {setStatus.error && <ErrorBox error={setStatus.error} />}
        {restoreUser.error && <ErrorBox error={restoreUser.error} />}
      </Card>
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

export const adminStudentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/students',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminStudents,
});
