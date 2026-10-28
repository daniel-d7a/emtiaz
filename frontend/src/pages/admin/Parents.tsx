import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type ParentRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  children: Array<{ id: string; name: string; email: string }>;
};

type ParentLink = {
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
};


export default function AdminParents() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const parents = useQuery({
    queryKey: ['admin-parents', search, limit, showDeleted],
    queryFn: () => api<ParentRow[]>(`/api/admin/parents?limit=${limit}&search=${encodeURIComponent(search)}&deleted=${showDeleted}`),
  });
  const deletedLinks = useQuery({
    queryKey: ['admin-parent-links', 'deleted'],
    queryFn: () => api<ParentLink[]>('/api/admin/parent-links?deleted=true'),
    enabled: showDeleted,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-parents'] });
    void qc.invalidateQueries({ queryKey: ['admin-parent-links'] });
    void qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const restoreUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });
  const restoreLink = useMutation({
    mutationFn: (link: ParentLink) =>
      api(`/api/admin/parent-links/${link.parentId}/${link.studentId}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });

  return (
    <Page title={t('parents')}>
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
        {parents.isLoading ? <Loading /> : parents.error ? <ErrorBox error={parents.error} /> : (
          <ul className="flex flex-col divide-y divide-line">
            {parents.data?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-ink-soft" dir="ltr">{u.email}{u.phoneNumber ? ` · ${u.phoneNumber}` : ''}</p>
                  <p className="mt-1 text-sm">
                    {u.children.length ? u.children.map((c) => c.name).join(' · ') : '—'}
                  </p>
                </div>
                {u.deletedAt && (
                  <button
                    onClick={() => restoreUser.mutate(u.id)}
                    className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                  >
                    {t('restore')}
                  </button>
                )}
              </li>
            ))}
            {parents.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
          </ul>
        )}
        {(parents.data?.length ?? 0) >= limit && limit < 200 && (
          <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
        )}
      </Card>

      {showDeleted && (
        <Card className="mt-4">
          <h2 className="font-bold">{t('deletedParentLinks')}</h2>
          {deletedLinks.isLoading ? <Loading /> : deletedLinks.error ? <ErrorBox error={deletedLinks.error} /> : (
            deletedLinks.data?.length ? (
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {deletedLinks.data.map((link) => (
                  <li key={`${link.parentId}-${link.studentId}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <p className="text-sm font-semibold">{link.parentName} · {link.studentName}</p>
                    <button
                      onClick={() => restoreLink.mutate(link)}
                      className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                    >
                      {t('restore')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-soft">{t('deleted')}</p>
          )}
        </Card>
      )}
      {restoreUser.error && <ErrorBox error={restoreUser.error} />}
      {restoreLink.error && <ErrorBox error={restoreLink.error} />}
    </Page>
  );
}

export const adminParentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/parents',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminParents,
});
