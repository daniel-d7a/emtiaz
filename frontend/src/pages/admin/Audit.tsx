import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { Card, ErrorBox, FilterLayout, Input, Loading, Page, Select } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  endpoint: string | null;
  responseType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
  actorPhone: string | null;
  actorRole: string;
};

type ErrorTail = {
  file: string;
  lines: string[];
};

export default function AdminAudit() {
  const { t, lang } = useLang();
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [target, setTarget] = useState('');
  const [actorRole, setActorRole] = useState('');
  const debouncedAction = useDebouncedValue(action);
  const debouncedActor = useDebouncedValue(actor);
  const debouncedTarget = useDebouncedValue(target);

  const audit = useQuery({
    queryKey: ['admin-audit', debouncedAction, debouncedActor, debouncedTarget, actorRole],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200' });
      if (debouncedAction.trim()) params.set('action', debouncedAction.trim());
      if (debouncedActor.trim()) params.set('actor', debouncedActor.trim());
      if (debouncedTarget.trim()) params.set('target', debouncedTarget.trim());
      if (actorRole) params.set('actorRole', actorRole);
      return api<AuditRow[]>(`/api/admin/audit?${params}`);
    },
    refetchInterval: 10_000,
  });
  const errors = useQuery({
    queryKey: ['admin-error-tail'],
    queryFn: () => api<ErrorTail>('/api/admin/errors/tail'),
    refetchInterval: 3_000,
  });

  const hasFilters = !!(action.trim() || actor.trim() || target.trim() || actorRole);
  const clearFilters = () => {
    setAction('');
    setActor('');
    setTarget('');
    setActorRole('');
  };

  return (
    <Page title={t('auditLog')} wide>
      <FilterLayout
        search={
          <>
            <div className="min-w-40 grow"><Input label={t('filterAction')} value={action} onChange={(e) => setAction(e.target.value)} placeholder="user.status" /></div>
            <div className="min-w-40 grow"><Input label={t('actor')} value={actor} onChange={(e) => setActor(e.target.value)} placeholder="+968…" /></div>
            <div className="min-w-40 grow"><Input label={t('modelOrEndpoint')} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="user" /></div>
          </>
        }
        filters={
          <>
            <Select label={t('userType')} value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
              <option value="">{t('allUserTypes')}</option>
              <option value="ADMIN">{t('admin')}</option>
              <option value="TEACHER">{t('teacher')}</option>
              <option value="STUDENT">{t('student')}</option>
              <option value="PARENT">{t('parent')}</option>
            </Select>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-start text-sm font-semibold text-primary underline">
                {t('clearFilters')}
              </button>
            )}
          </>
        }
      >
        <Card>
          {audit.isLoading ? <Loading /> : audit.error ? <ErrorBox error={audit.error} /> : (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {audit.data?.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 grow">
                    <p className="font-semibold">{row.action}</p>
                    <p className="text-ink-soft">
                      {row.actorName} · {row.actorRole}{row.actorPhone ? ` · ${row.actorPhone}` : ''}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {t('modelOrEndpoint')}: {row.targetType}
                      {row.targetId ? ` · ${row.targetId}` : ''}
                      {row.endpoint ? ` · ${row.endpoint}` : ''}
                    </p>
                    {row.metadata && (
                      <details className="mt-1 text-xs text-ink-soft">
                        <summary className="cursor-pointer font-semibold">{t('requestData')}</summary>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-background p-2 text-[11px]" dir="ltr">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="text-end">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.responseType === 'error' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary-dark'}`}>
                      {row.responseType ?? t('logged')}
                    </span>
                    <p className="mt-1 text-xs text-ink-soft">{formatDateTime(row.createdAt, lang)}</p>
                  </div>
                </li>
              ))}
              {audit.data?.length === 0 && <li className="py-2 text-ink-soft">{t('noResults')}</li>}
            </ul>
          )}
        </Card>
      </FilterLayout>

      <Card className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t('errorTail')}</h2>
          <p className="text-xs text-ink-soft">{errors.data?.file} · {t('last500Lines')}</p>
        </div>
        {errors.isLoading ? <Loading /> : errors.error ? <ErrorBox error={errors.error} /> : (
          errors.data?.lines.length ? (
            <pre className="max-h-[70vh] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-xl bg-background p-3 text-[11px] leading-5" dir="ltr">
              {errors.data.lines.join('\n')}
            </pre>
          ) : <p className="text-sm text-ink-soft">{t('noErrorLines')}</p>
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
