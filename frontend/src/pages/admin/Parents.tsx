import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
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
  children: Array<{ id: string; name: string; email: string }>;
};

export default function AdminParents() {
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const parents = useQuery({
    queryKey: ['admin-parents', search, limit],
    queryFn: () => api<ParentRow[]>(`/api/admin/parents?limit=${limit}&search=${encodeURIComponent(search)}`),
  });

  return (
    <Page title={t('parents')}>
      <Card>
        <div className="mb-3">
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
    </Page>
  );
}

export const adminParentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/parents',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminParents,
});
