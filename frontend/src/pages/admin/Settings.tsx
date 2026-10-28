import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang, type Key } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole, sessionQuery, useAdminPermissions } from '../../lib/session';
import type { AdminPermission, AdminRole, AdminUser } from '../../../../shared/api';

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

type SettingsTab = 'notifications' | 'taxonomy' | 'branding' | 'support' | 'roles';

const TAB_LABEL: Record<SettingsTab, Key> = {
  notifications: 'notifications',
  taxonomy: 'taxonomy',
  branding: 'branding',
  support: 'platformSupport',
  roles: 'rolesPermissions',
};

const TAB_PERMISSION: Record<SettingsTab, AdminPermission> = {
  notifications: 'notifications',
  taxonomy: 'taxonomy',
  branding: 'settings',
  support: 'settings',
  roles: 'roles',
};

export default function AdminSettings() {
  const { t } = useLang();
  const can = useAdminPermissions();
  const tabs = (Object.keys(TAB_LABEL) as SettingsTab[]).filter((item) => can(TAB_PERMISSION[item]));
  const [tab, setTab] = useState<SettingsTab>('notifications');
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const needsSettings = activeTab === 'notifications' || activeTab === 'branding' || activeTab === 'support';
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api<NotificationSettings>('/api/admin/notification-settings'),
    enabled: needsSettings,
  });

  return (
    <Page title={t('settings')}>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === item ? 'bg-primary text-white' : 'border border-line'}`}
          >
            {t(TAB_LABEL[item])}
          </button>
        ))}
      </div>
      {activeTab === 'taxonomy' && <TaxonomyTabs />}
      {activeTab === 'roles' && <RolesTab />}
      {needsSettings && (settings.isLoading ? <Loading /> : settings.error ? <ErrorBox error={settings.error} /> : settings.data && (
        <>
          {activeTab === 'notifications' && <NotificationsTab settings={settings.data} />}
          {activeTab === 'branding' && <BrandingTab settings={settings.data} />}
          {activeTab === 'support' && <SupportTab settings={settings.data} />}
        </>
      ))}
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


const PERMISSION_LABEL: Record<AdminPermission, Key> = {
  overview: 'overview',
  teachers: 'teachers',
  students: 'students',
  parents: 'parents',
  courses: 'courses',
  taxonomy: 'taxonomy',
  notifications: 'notifications',
  audit: 'auditLog',
  settings: 'settings',
  roles: 'rolesPermissions',
  users: 'manageUsers',
};

const PERMISSION_ORDER = Object.keys(PERMISSION_LABEL) as AdminPermission[];

function RolesTab() {
  const { t } = useLang();
  const qc = useQueryClient();
  const roles = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api<AdminRole[]>('/api/admin/roles'),
  });
  const admins = useQuery({
    queryKey: ['admin-admins'],
    queryFn: () => api<AdminUser[]>('/api/admin/admins'),
  });
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);

  const reset = () => {
    setEditing(null);
    setName('');
    setPermissions([]);
  };
  const save = useMutation({
    mutationFn: () => editing
      ? api(`/api/admin/roles/${editing.id}`, { method: 'PATCH', body: { name, permissions } })
      : api('/api/admin/roles', { body: { name, permissions } }),
    onSuccess: () => {
      toast.success(t('saved'));
      reset();
      void qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });
  const assign = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string | null }) =>
      api(`/api/admin/admins/${userId}/role`, { method: 'PATCH', body: { roleId } }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['admin-admins'] });
      void qc.invalidateQueries({ queryKey: sessionQuery.queryKey });
    },
  });

  const toggle = (permission: AdminPermission) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('rolesPermissions')}</h2>
        <ul className="mb-4 flex flex-col divide-y divide-line">
          {roles.data?.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-semibold">{role.name}</p>
                <p className="text-xs text-ink-soft">
                  {role.permissions.map((permission) => t(PERMISSION_LABEL[permission])).join(' · ')}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(role);
                  setName(role.name);
                  setPermissions(role.permissions);
                }}
              >
                {t('edit')}
              </Button>
            </li>
          ))}
          {roles.data?.length === 0 && <li className="py-2 text-ink-soft">—</li>}
        </ul>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-soft">{t('permissions')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSION_ORDER.map((permission) => (
                <label key={permission} className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={permissions.includes(permission)}
                    onChange={() => toggle(permission)}
                  />
                  {t(PERMISSION_LABEL[permission])}
                </label>
              ))}
            </div>
          </div>
          {(save.error ?? roles.error) && <ErrorBox error={save.error ?? roles.error} />}
          <div className="flex gap-2">
            <Button
              onClick={() => save.mutate()}
              disabled={!name.trim() || permissions.length === 0 || save.isPending}
            >
              {editing ? t('save') : t('add')}
            </Button>
            {editing && <Button variant="ghost" onClick={reset}>{t('cancel')}</Button>}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('administrator')}</h2>
        <ul className="flex flex-col divide-y divide-line">
          {admins.data?.map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div>
                <p className="font-semibold">{admin.name}</p>
                <p className="text-xs text-ink-soft" dir="ltr">{admin.email}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">{t('assignRole')}</span>
                <select
                  value={admin.adminRoleId ?? ''}
                  onChange={(e) => assign.mutate({ userId: admin.id, roleId: e.target.value || null })}
                  className="min-h-10 rounded-lg border border-line bg-white px-3"
                >
                  <option value="">{t('fullAccess')}</option>
                  {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
        {(assign.error ?? admins.error) && <ErrorBox error={assign.error ?? admins.error} />}
      </Card>
    </div>
  );
}

export const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/settings',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminSettings,
});
