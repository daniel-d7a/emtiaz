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

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

export default function AdminTeachers() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const teachers = useQuery({
    queryKey: ['admin-teachers', search, limit, showDeleted],
    queryFn: () => api<TeacherRow[]>(`/api/admin/teachers?limit=${limit}&search=${encodeURIComponent(search)}&deleted=${showDeleted}`),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-teachers'] });
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
    <Page title={t('teachers')}>
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
        {teachers.isLoading ? <Loading /> : teachers.error ? <ErrorBox error={teachers.error} /> : (
          <ul className="flex flex-col divide-y divide-line">
            {teachers.data?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-ink-soft" dir="ltr">{u.email}{u.phoneNumber ? ` · ${u.phoneNumber}` : ''}</p>
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
            {teachers.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
          </ul>
        )}
        {(teachers.data?.length ?? 0) >= limit && limit < 200 && (
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

export const adminTeachersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/teachers',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminTeachers,
});
