import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Card, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
};

export default function AdminAudit() {
  const { t, lang } = useLang();
  const [action, setAction] = useState('');
  const audit = useQuery({
    queryKey: ['admin-audit', action],
    queryFn: () => api<AuditRow[]>(`/api/admin/audit?limit=100&action=${encodeURIComponent(action)}`),
  });

  return (
    <Page title={t('auditLog')}>
      <Card>
        <div className="mb-3">
          <Input label={t('filterAction')} value={action} onChange={(e) => setAction(e.target.value)} placeholder="user.status" />
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
    </Page>
  );
}

export const adminAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/audit',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminAudit,
});
