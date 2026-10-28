import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type NotificationSettings = {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  adminEnabled: boolean;
  parentEnabled: boolean;
  teacherEnabled: boolean;
  supportEmail: string | null;
  supportPhone: string | null;
  supportWhatsapp: string | null;
};

export default function AdminSettings() {
  const { t } = useLang();
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api<NotificationSettings>('/api/admin/notification-settings'),
  });

  return (
    <Page title={t('settings')}>
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-3 text-lg font-bold">{t('notifications')}</h2>
          {settings.isLoading ? <Loading /> : settings.error ? <ErrorBox error={settings.error} /> : settings.data && (
            <NotificationSettingsForm settings={settings.data} />
          )}
        </Card>
        <TaxonomyTabs />
      </div>
    </Page>
  );
}

function NotificationSettingsForm({ settings }: { settings: NotificationSettings }) {
  const { t } = useLang();
  const qc = useQueryClient();
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

  return (
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
            checked={settings[key]}
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
            checked={settings[key]}
            onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
          />
          {t(label)}
        </label>
      ))}
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('platformSupport')}</p>
      <Input
        label={t('email')}
        type="email"
        defaultValue={settings.supportEmail ?? ''}
        onBlur={(e) => updateSettings.mutate({ supportEmail: e.target.value })}
      />
      <Input
        label={t('phone')}
        defaultValue={settings.supportPhone ?? ''}
        dir="ltr"
        onBlur={(e) => updateSettings.mutate({ supportPhone: e.target.value })}
      />
      <Input
        label={t('whatsapp')}
        defaultValue={settings.supportWhatsapp ?? ''}
        dir="ltr"
        onBlur={(e) => updateSettings.mutate({ supportWhatsapp: e.target.value })}
      />
      {updateSettings.error && <ErrorBox error={updateSettings.error} />}
      <div className="mt-3 flex items-center gap-3">
        <Button variant="ghost" onClick={() => monthlySummary.mutate()} disabled={monthlySummary.isPending}>
          {t('sendMonthlySummary')}
        </Button>
        {monthlySummary.data && <span className="text-sm text-ink-soft">{monthlySummary.data.parents}</span>}
      </div>
      {monthlySummary.error && <ErrorBox error={monthlySummary.error} />}
    </div>
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

export const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/settings',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminSettings,
});
