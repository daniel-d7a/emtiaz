import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang, type Key } from '../../lib/i18n';
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
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

type SettingsTab = 'notifications' | 'taxonomy' | 'branding' | 'support';

const TAB_LABEL: Record<SettingsTab, Key> = {
  notifications: 'notifications',
  taxonomy: 'taxonomy',
  branding: 'branding',
  support: 'platformSupport',
};

export default function AdminSettings() {
  const { t } = useLang();
  const [tab, setTab] = useState<SettingsTab>('notifications');
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api<NotificationSettings>('/api/admin/notification-settings'),
  });

  return (
    <Page title={t('settings')}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as SettingsTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === item ? 'bg-primary text-white' : 'border border-line'}`}
          >
            {t(TAB_LABEL[item])}
          </button>
        ))}
      </div>
      {settings.isLoading ? <Loading /> : settings.error ? <ErrorBox error={settings.error} /> : settings.data && (
        <>
          {tab === 'notifications' && <NotificationsTab settings={settings.data} />}
          {tab === 'branding' && <BrandingTab settings={settings.data} />}
          {tab === 'support' && <SupportTab settings={settings.data} />}
          {tab === 'taxonomy' && <TaxonomyTabs />}
        </>
      )}
    </Page>
  );
}

function useSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) =>
      api('/api/admin/notification-settings', { method: 'PATCH', body: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notification-settings'] });
      void qc.invalidateQueries({ queryKey: ['public-site'] });
    },
  });
}

function NotificationsTab({ settings }: { settings: NotificationSettings }) {
  const { t } = useLang();
  const updateSettings = useSettingsMutation();
  const monthlySummary = useMutation({
    mutationFn: () => api<{ parents: number }>('/api/admin/notifications/monthly-summary', { method: 'POST' }),
    onSuccess: () => toast.success(t('sent')),
  });

  return (
    <Card>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('channels')}</p>
      {([
        ['whatsappEnabled', 'whatsapp'],
        ['emailEnabled', 'email'],
        ['inAppEnabled', 'inApp'],
      ] as const).map(([key, label]) => (
        <label key={key} className="flex items-center gap-3 py-1 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={settings[key]}
            onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
          />
          {t(label)}
        </label>
      ))}
      <p className="mb-3 mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('types')}</p>
      {([
        ['adminEnabled', 'admin'],
        ['parentEnabled', 'parent'],
        ['teacherEnabled', 'teacher'],
      ] as const).map(([key, label]) => (
        <label key={key} className="flex items-center gap-3 py-1 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={settings[key]}
            onChange={(e) => updateSettings.mutate({ [key]: e.target.checked })}
          />
          {t(label)}
        </label>
      ))}
      {updateSettings.error && <ErrorBox error={updateSettings.error} />}
      <div className="mt-5 flex items-center gap-3">
        <Button variant="ghost" onClick={() => monthlySummary.mutate()} disabled={monthlySummary.isPending}>
          {t('sendMonthlySummary')}
        </Button>
        {monthlySummary.data && <span className="text-sm text-ink-soft">{monthlySummary.data.parents}</span>}
      </div>
      {monthlySummary.error && <ErrorBox error={monthlySummary.error} />}
    </Card>
  );
}

function BrandingTab({ settings }: { settings: NotificationSettings }) {
  const { t } = useLang();
  const updateSettings = useSettingsMutation();
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl ?? '');

  const save = () => updateSettings.mutate({
    primaryColor,
    secondaryColor,
    logoUrl: logoUrl.trim() || null,
  }, { onSuccess: () => toast.success(t('saved')) });

  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('primaryColor')}</span>
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="size-12 rounded-lg border border-line" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} dir="ltr" aria-label={t('primaryColor')} />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('secondaryColor')}</span>
          <div className="flex items-center gap-3">
            <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="size-12 rounded-lg border border-line" />
            <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} dir="ltr" aria-label={t('secondaryColor')} />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Input
          label={t('logoUrl')}
          placeholder={t('logoUrlPlaceholder')}
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          dir="ltr"
        />
      </div>
      {logoUrl && <img src={logoUrl} alt="" className="mt-3 h-12 max-w-48 object-contain" />}
      {updateSettings.error && <ErrorBox error={updateSettings.error} />}
      <Button className="mt-4" onClick={save} disabled={updateSettings.isPending}>{t('save')}</Button>
    </Card>
  );
}

function SupportTab({ settings }: { settings: NotificationSettings }) {
  const { t } = useLang();
  const updateSettings = useSettingsMutation();
  const [support, setSupport] = useState({
    supportEmail: settings.supportEmail ?? '',
    supportPhone: settings.supportPhone ?? '',
    supportWhatsapp: settings.supportWhatsapp ?? '',
  });
  const field = (key: keyof typeof support) => ({
    value: support[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setSupport((current) => ({ ...current, [key]: e.target.value })),
  });

  return (
    <Card>
      <div className="flex max-w-lg flex-col gap-4">
        <Input label={t('email')} type="email" dir="ltr" {...field('supportEmail')} />
        <Input label={t('phone')} type="tel" dir="ltr" {...field('supportPhone')} />
        <Input label={t('whatsapp')} type="tel" dir="ltr" {...field('supportWhatsapp')} />
      </div>
      {updateSettings.error && <ErrorBox error={updateSettings.error} />}
      <Button
        className="mt-4"
        onClick={() => updateSettings.mutate(support, { onSuccess: () => toast.success(t('saved')) })}
        disabled={updateSettings.isPending}
      >
        {t('save')}
      </Button>
    </Card>
  );
}

type TaxonomyKind = 'grades' | 'semesters' | 'categories';

const TAXONOMY_LABEL: Record<TaxonomyKind, Key> = {
  grades: 'grades',
  semesters: 'semesters',
  categories: 'skills',
};

const TAXONOMY_PATH: Record<TaxonomyKind, string> = {
  grades: 'grades',
  semesters: 'semesters',
  categories: 'categories',
};

const TAXONOMY_KEY: Record<TaxonomyKind, string> = {
  grades: 'grades-list',
  semesters: 'semesters-list',
  categories: 'categories-list',
};

function TaxonomyTabs() {
  const { t } = useLang();
  const [kind, setKind] = useState<TaxonomyKind>('grades');
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TAXONOMY_LABEL) as TaxonomyKind[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setKind(item)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === item ? 'bg-primary text-white' : 'border border-line'}`}
          >
            {t(TAXONOMY_LABEL[item])}
          </button>
        ))}
      </div>
      <Taxonomy key={kind} kind={kind} />
    </div>
  );
}

function Taxonomy({ kind }: { kind: TaxonomyKind }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const list = useQuery({
    queryKey: [TAXONOMY_KEY[kind]],
    queryFn: () => api<Array<{ id: string; name: string }>>(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [TAXONOMY_KEY[kind]] });
    void qc.invalidateQueries({ queryKey: [kind] });
  };
  const add = useMutation({
    mutationFn: () => api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`, { body: { name } }),
    onSuccess: () => {
      setName('');
      toast.success(t('saved'));
      invalidate();
    },
  });
  const rename = useMutation({
    mutationFn: (item: { id: string; name: string }) =>
      api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}/${item.id}`, { method: 'PUT', body: { name: item.name } }),
    onSuccess: () => {
      setEditing(null);
      toast.success(t('saved'));
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <Input label={t(TAXONOMY_LABEL[kind])} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} />
        </div>
        <Button onClick={() => add.mutate()} disabled={!name.trim()}>
          <Plus className="inline" size={16} /> {t('add')}
        </Button>
      </div>
      {add.error && <ErrorBox error={add.error} />}
      {rename.error && <ErrorBox error={rename.error} />}
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {list.data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2">
            {editing?.id === item.id ? (
              <div className="flex grow items-center gap-2">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  aria-label={t('edit')}
                />
                <Button onClick={() => rename.mutate({ id: item.id, name: editing.name })} disabled={!editing.name.trim() || rename.isPending}>
                  {t('save')}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
              </div>
            ) : (
              <>
                <span className="font-semibold">{localizeName(item.name, lang)}</span>
                <div className="flex items-center gap-3 text-ink-soft">
                  <button onClick={() => setEditing({ id: item.id, name: item.name })} aria-label={`${t('edit')} ${localizeName(item.name, lang)}`} title={t('edit')} className="hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: item.id, name: item.name })} aria-label={`${t('delete')} ${localizeName(item.name, lang)}`} title={t('delete')} className="hover:text-secondary">
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
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
