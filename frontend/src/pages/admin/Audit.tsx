import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import {
  Button,
  Card,
  Dialog,
  ErrorBox,
  FilterLayout,
  Input,
  Loading,
  Page,
  Select,
} from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import {
  AUDIT_CATEGORIES,
  type AuditCategory,
  getAuditActionDefinition,
} from '../../../../shared/audit-events';

export type AuditRow = {
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

export function getActionBadgeStyle(action: string): string {
  if (
    action.endsWith('.create') ||
    action.endsWith('.enroll') ||
    action.endsWith('.assign') ||
    action.endsWith('.grant') ||
    action.endsWith('.restore')
  ) {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
  }
  if (
    action.endsWith('.update') ||
    action.endsWith('.move') ||
    action.endsWith('.mark')
  ) {
    return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30';
  }
  if (action.endsWith('.delete') || action.endsWith('.remove')) {
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30';
  }
  if (
    action.includes('.reset') ||
    action.includes('revision') ||
    action.endsWith('.status')
  ) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30';
  }
  return 'bg-primary-light text-primary-dark border border-primary/20';
}

export default function AdminAudit() {
  const { t, lang } = useLang();
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [category, setCategory] = useState('');
  const [actor, setActor] = useState('');
  const [target, setTarget] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditRow | null>(null);

  const debouncedAction = useDebouncedValue(action);
  const debouncedUserId = useDebouncedValue(userId);
  const debouncedActor = useDebouncedValue(actor);
  const debouncedTarget = useDebouncedValue(target);

  const audit = useQuery({
    queryKey: [
      'admin-audit',
      debouncedAction,
      debouncedUserId,
      category,
      debouncedActor,
      debouncedTarget,
      actorRole,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200' });
      if (debouncedAction.trim()) params.set('action', debouncedAction.trim());
      if (debouncedUserId.trim()) params.set('userId', debouncedUserId.trim());
      if (category) params.set('category', category);
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

  const hasFilters = !!(
    action.trim() ||
    userId.trim() ||
    category ||
    actor.trim() ||
    target.trim() ||
    actorRole
  );

  const clearFilters = () => {
    setAction('');
    setUserId('');
    setCategory('');
    setActor('');
    setTarget('');
    setActorRole('');
  };

  return (
    <Page title={t('auditLog')} wide>
      <FilterLayout
        search={
          <>
            <div className="min-w-40 grow">
              <Input
                label={t('searchByUserId')}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="usr_..."
              />
            </div>
            <div className="min-w-40 grow">
              <Input
                label={t('filterAction')}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="quiz.submit"
              />
            </div>
            <div className="min-w-40 grow">
              <Input
                label={t('actor')}
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="+968…"
              />
            </div>
            <div className="min-w-40 grow">
              <Input
                label={t('modelOrEndpoint')}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="user"
              />
            </div>
          </>
        }
        filters={
          <>
            <Select
              label={t('filterCategory')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('allCategories')}</option>
              {Object.entries(AUDIT_CATEGORIES).map(([catKey, catDef]) => (
                <option key={catKey} value={catKey}>
                  {lang === 'ar' ? catDef.nameAr : catDef.nameEn}
                </option>
              ))}
            </Select>
            <Select
              label={t('userType')}
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
            >
              <option value="">{t('allUserTypes')}</option>
              <option value="ADMIN">{t('admin')}</option>
              <option value="TEACHER">{t('teacher')}</option>
              <option value="STUDENT">{t('student')}</option>
              <option value="PARENT">{t('parent')}</option>
            </Select>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-start text-sm font-semibold text-primary underline"
              >
                {t('clearFilters')}
              </button>
            )}
          </>
        }
      >
        <Card>
          {audit.isLoading ? (
            <Loading />
          ) : audit.error ? (
            <ErrorBox error={audit.error} />
          ) : (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {audit.data?.map((row) => {
                const actionDef = getAuditActionDefinition(row.action);
                const badgeStyle = getActionBadgeStyle(row.action);
                return (
                  <li
                    key={row.id}
                    onClick={() => setSelectedEntry(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedEntry(row);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${row.action} - ${row.actorName}`}
                    className="flex flex-wrap items-start justify-between gap-3 p-3 rounded-lg hover:bg-surface-soft/60 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <div className="min-w-0 grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
                        >
                          {actionDef
                            ? lang === 'ar'
                              ? actionDef.nameAr
                              : actionDef.nameEn
                            : row.action}
                        </span>
                        <span className="font-mono text-xs text-ink-soft">({row.action})</span>
                        {actionDef && (
                          <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-ink-soft">
                            {lang === 'ar'
                              ? AUDIT_CATEGORIES[actionDef.category].nameAr
                              : AUDIT_CATEGORIES[actionDef.category].nameEn}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-ink-soft">
                        {row.actorName} · {row.actorRole}
                        {row.actorPhone ? ` · ${row.actorPhone}` : ''}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {t('modelOrEndpoint')}: {row.targetType}
                        {row.targetId ? ` · ${row.targetId}` : ''}
                        {row.endpoint ? ` · ${row.endpoint}` : ''}
                      </p>
                      {row.metadata && (
                        <details
                          className="mt-1 text-xs text-ink-soft"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <summary className="cursor-pointer font-semibold">
                            {t('requestData')}
                          </summary>
                          <pre
                            className="mt-1 max-h-40 overflow-auto rounded-lg bg-background p-2 text-[11px]"
                            dir="ltr"
                          >
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-end">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          row.responseType === 'error'
                            ? 'bg-secondary-light text-secondary'
                            : 'bg-primary-light text-primary-dark'
                        }`}
                      >
                        {row.responseType ?? t('logged')}
                      </span>
                      <p className="mt-1 text-xs text-ink-soft">
                        {formatDateTime(row.createdAt, lang)}
                      </p>
                    </div>
                  </li>
                );
              })}
              {audit.data?.length === 0 && (
                <li className="py-2 text-ink-soft">{t('noResults')}</li>
              )}
            </ul>
          )}
        </Card>
      </FilterLayout>

      <Dialog
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        title={t('eventDetails')}
        className="w-full max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
              {t('close')}
            </Button>
          </div>
        }
      >
        {selectedEntry && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getActionBadgeStyle(selectedEntry.action)}`}
                  >
                    {getAuditActionDefinition(selectedEntry.action)
                      ? lang === 'ar'
                        ? getAuditActionDefinition(selectedEntry.action)!.nameAr
                        : getAuditActionDefinition(selectedEntry.action)!.nameEn
                      : selectedEntry.action}
                  </span>
                  {getAuditActionDefinition(selectedEntry.action) && (
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs text-ink-soft">
                      {lang === 'ar'
                        ? AUDIT_CATEGORIES[
                            getAuditActionDefinition(selectedEntry.action)!.category
                          ].nameAr
                        : AUDIT_CATEGORIES[
                            getAuditActionDefinition(selectedEntry.action)!.category
                          ].nameEn}
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-ink-soft">{selectedEntry.action}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  selectedEntry.responseType === 'error'
                    ? 'bg-secondary-light text-secondary'
                    : 'bg-primary-light text-primary-dark'
                }`}
              >
                {selectedEntry.responseType ?? t('logged')}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-soft p-2.5">
                <span className="text-xs text-ink-soft">{t('actor')}</span>
                <p className="font-semibold">{selectedEntry.actorName}</p>
                <p className="text-xs text-ink-soft">
                  {selectedEntry.actorRole}
                  {selectedEntry.actorPhone ? ` · ${selectedEntry.actorPhone}` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-surface-soft p-2.5">
                <span className="text-xs text-ink-soft">{t('timestamp')}</span>
                <p className="font-semibold">
                  {formatDateTime(selectedEntry.createdAt, lang)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-soft p-2.5">
                <span className="text-xs text-ink-soft">{t('modelOrEndpoint')}</span>
                <p className="font-semibold">{selectedEntry.targetType}</p>
                {selectedEntry.endpoint && (
                  <p className="font-mono text-xs text-ink-soft">{selectedEntry.endpoint}</p>
                )}
              </div>
              <div className="rounded-lg bg-surface-soft p-2.5">
                <span className="text-xs text-ink-soft">{t('targetIdLabel')}</span>
                <p className="font-mono text-xs font-semibold break-all">
                  {selectedEntry.targetId ?? '—'}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  {t('metadataPayload')}
                </span>
              </div>
              <pre
                className="max-h-64 overflow-auto rounded-lg bg-background p-3 text-xs font-mono leading-relaxed"
                dir="ltr"
              >
                {selectedEntry.metadata
                  ? JSON.stringify(selectedEntry.metadata, null, 2)
                  : '{}'}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      <Card className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{t('errorTail')}</h2>
          <p className="text-xs text-ink-soft">
            {errors.data?.file} · {t('last500Lines')}
          </p>
        </div>
        {errors.isLoading ? (
          <Loading />
        ) : errors.error ? (
          <ErrorBox error={errors.error} />
        ) : errors.data?.lines.length ? (
          <pre
            className="max-h-[70vh] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-xl bg-background p-3 text-[11px] leading-5"
            dir="ltr"
          >
            {errors.data.lines.join('\n')}
          </pre>
        ) : (
          <p className="text-sm text-ink-soft">{t('noErrorLines')}</p>
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
