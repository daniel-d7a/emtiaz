import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, api, type AdminPromoCode, type Plan } from '../../lib/api';
import { formatDateTime, localizeName, useLang, type Key } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, Dialog, ErrorBox, Input, Loading, Page, Select } from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole, sessionQuery, useAdminPermissions } from '../../lib/session';
import type { AdminPermission, AdminRole, AdminUser, Country } from '../../../../shared/api';

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
  yearlyPlanDiscountEnabled?: boolean;
  referralPlanSlug?: string;
  referralGiftDays?: number;
};

type SettingsTab =
  | 'notifications'
  | 'taxonomy'
  | 'branding'
  | 'support'
  | 'roles'
  | 'billing'
  | 'promoCodes';

const TAB_LABEL: Record<SettingsTab, Key> = {
  notifications: 'notifications',
  taxonomy: 'taxonomy',
  branding: 'branding',
  support: 'platformSupport',
  roles: 'rolesPermissions',
  billing: 'plansAndBilling',
  promoCodes: 'promoCodes',
};

const TAB_PERMISSION: Record<SettingsTab, AdminPermission> = {
  notifications: 'notifications',
  taxonomy: 'taxonomy',
  branding: 'settings',
  support: 'settings',
  roles: 'roles',
  billing: 'settings',
  promoCodes: 'settings',
};

export default function AdminSettings() {
  const { t } = useLang();
  const can = useAdminPermissions();
  const tabs = (Object.keys(TAB_LABEL) as SettingsTab[]).filter((item) => can(TAB_PERMISSION[item]));
  const [tab, setTab] = useState<SettingsTab>('notifications');
  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const needsSettings =
    activeTab === 'notifications' ||
    activeTab === 'branding' ||
    activeTab === 'support' ||
    activeTab === 'billing';
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
      {activeTab === 'promoCodes' && <PromoCodesTab />}
      {needsSettings && (settings.isLoading ? <Loading /> : settings.error ? <ErrorBox error={settings.error} /> : settings.data && (
        <>
          {activeTab === 'notifications' && <NotificationsTab settings={settings.data} />}
          {activeTab === 'branding' && <BrandingTab settings={settings.data} />}
          {activeTab === 'support' && <SupportTab settings={settings.data} />}
          {activeTab === 'billing' && <PlansAndBillingTab settings={settings.data} />}
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

type TaxonomyRow = {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  country?: Country;
  displayOrder?: number;
};

function Taxonomy({ kind }: { kind: TaxonomyKind }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const isBilingual = kind === 'grades' || kind === 'categories';
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [country, setCountry] = useState<Country>('OM');
  const [countryFilter, setCountryFilter] = useState<'ALL' | Country>('ALL');
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyRow | null>(null);
  const list = useQuery({
    queryKey: [TAXONOMY_KEY[kind], kind === 'grades' ? countryFilter : 'ALL'],
    queryFn: () =>
      api<TaxonomyRow[]>(
        kind === 'grades' && countryFilter !== 'ALL'
          ? `/api/admin/taxonomy/${TAXONOMY_PATH[kind]}?country=${countryFilter}`
          : `/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`,
      ),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [TAXONOMY_KEY[kind]] });
    void qc.invalidateQueries({ queryKey: [kind] });
  };
  const canAdd = isBilingual ? Boolean(nameAr.trim() || nameEn.trim() || name.trim()) : Boolean(name.trim());
  const add = useMutation({
    mutationFn: () => {
      if (kind === 'grades') {
        const resolvedAr = nameAr.trim() || name.trim() || nameEn.trim();
        const resolvedEn = nameEn.trim() || name.trim() || nameAr.trim();
        return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`, {
          body: {
            name: resolvedEn,
            nameAr: resolvedAr,
            nameEn: resolvedEn,
            country,
          },
        });
      }
      if (kind === 'categories') {
        const resolvedAr = nameAr.trim() || name.trim() || nameEn.trim();
        const resolvedEn = nameEn.trim() || name.trim() || nameAr.trim();
        return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`, {
          body: {
            name: resolvedEn,
            nameAr: resolvedAr,
            nameEn: resolvedEn,
          },
        });
      }
      return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}`, { body: { name } });
    },
    onSuccess: () => {
      setName('');
      setNameAr('');
      setNameEn('');
      toast.success(t('saved'));
      invalidate();
    },
  });
  const rename = useMutation({
    mutationFn: (item: TaxonomyRow) => {
      if (kind === 'grades') {
        const resolvedAr = item.nameAr?.trim() || item.name.trim() || item.nameEn?.trim() || '';
        const resolvedEn = item.nameEn?.trim() || item.name.trim() || item.nameAr?.trim() || '';
        return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}/${item.id}`, {
          method: 'PUT',
          body: {
            name: resolvedEn,
            nameAr: resolvedAr,
            nameEn: resolvedEn,
            country: item.country ?? 'OM',
          },
        });
      }
      if (kind === 'categories') {
        const resolvedAr = item.nameAr?.trim() || item.name.trim() || item.nameEn?.trim() || '';
        const resolvedEn = item.nameEn?.trim() || item.name.trim() || item.nameAr?.trim() || '';
        return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}/${item.id}`, {
          method: 'PUT',
          body: {
            name: resolvedEn,
            nameAr: resolvedAr,
            nameEn: resolvedEn,
          },
        });
      }
      return api(`/api/admin/taxonomy/${TAXONOMY_PATH[kind]}/${item.id}`, {
        method: 'PUT',
        body: { name: item.name },
      });
    },
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
      {kind === 'grades' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-soft">{t('country')}:</span>
          {(['ALL', 'OM', 'EG'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountryFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                countryFilter === c ? 'bg-primary text-white' : 'border border-line bg-white'
              }`}
            >
              {c === 'ALL' ? t('allCountries') : c === 'OM' ? t('oman') : t('egypt')}
            </button>
          ))}
        </div>
      )}
      {isBilingual ? (
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className={kind === 'grades' ? '' : 'sm:col-span-2'}>
            <Input
              label={t('nameAr')}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={t('nameAr')}
            />
          </div>
          <div className={kind === 'grades' ? '' : 'sm:col-span-1'}>
            <Input
              label={t('nameEn')}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t('nameEn')}
              dir="ltr"
            />
          </div>
          {kind === 'grades' && (
            <Select label={t('country')} value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              <option value="OM">{t('oman')} (OM)</option>
              <option value="EG">{t('egypt')} (EG)</option>
            </Select>
          )}
          <Button onClick={() => add.mutate()} disabled={!canAdd}>
            <Plus className="inline" size={16} /> {t('add')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <Input label={t(TAXONOMY_LABEL[kind])} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} />
          </div>
          <Button onClick={() => add.mutate()} disabled={!name.trim()}>
            <Plus className="inline" size={16} /> {t('add')}
          </Button>
        </div>
      )}
      {add.error && <ErrorBox error={add.error} />}
      {rename.error && <ErrorBox error={rename.error} />}
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {list.data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2">
            {editing?.id === item.id ? (
              isBilingual ? (
                <div className="flex grow flex-wrap items-center gap-2">
                  <Input
                    value={editing.nameAr ?? ''}
                    onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })}
                    placeholder={t('nameAr')}
                    aria-label={t('nameAr')}
                  />
                  <Input
                    value={editing.nameEn ?? ''}
                    onChange={(e) => setEditing({ ...editing, nameEn: e.target.value, name: e.target.value })}
                    placeholder={t('nameEn')}
                    aria-label={t('nameEn')}
                    dir="ltr"
                  />
                  {kind === 'grades' && (
                    <Select
                      value={editing.country ?? 'OM'}
                      onChange={(e) => setEditing({ ...editing, country: e.target.value as Country })}
                      aria-label={t('country')}
                    >
                      <option value="OM">{t('oman')} (OM)</option>
                      <option value="EG">{t('egypt')} (EG)</option>
                    </Select>
                  )}
                  <Button
                    onClick={() => rename.mutate(editing)}
                    disabled={(!editing.nameAr?.trim() && !editing.nameEn?.trim() && !editing.name.trim()) || rename.isPending}
                  >
                    {t('save')}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
                </div>
              ) : (
                <div className="flex grow items-center gap-2">
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    aria-label={t('edit')}
                  />
                  <Button onClick={() => rename.mutate(editing)} disabled={!editing.name.trim() || rename.isPending}>
                    {t('save')}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
                </div>
              )
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {kind === 'grades' && item.country && (
                    <Badge tone={item.country === 'EG' ? 'secondary' : 'primary'}>{item.country}</Badge>
                  )}
                  <span className="font-semibold">{localizeName(item, lang)}</span>
                  {isBilingual && item.nameAr && item.nameEn && (
                    <span className="text-xs text-ink-soft" dir="ltr">
                      ({lang === 'ar' ? item.nameEn : item.nameAr})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-ink-soft">
                  <button
                    onClick={() =>
                      setEditing({
                        id: item.id,
                        name: item.name,
                        nameAr: item.nameAr ?? item.name,
                        nameEn: item.nameEn ?? item.name,
                        country: item.country ?? 'OM',
                      })
                    }
                    aria-label={`${t('edit')} ${localizeName(item, lang)}`}
                    title={t('edit')}
                    className="hover:text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`${t('delete')} ${localizeName(item, lang)}`}
                    title={t('delete')}
                    className="hover:text-danger"
                  >
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
        title={`${t('delete')} ${deleteTarget ? localizeName(deleteTarget, lang) : ''}?`}
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

function PlansAndBillingTab({ settings }: { settings: NotificationSettings }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const mutateSettings = useSettingsMutation();

  const [yearlyDiscount, setYearlyDiscount] = useState(
    settings.yearlyPlanDiscountEnabled ?? false,
  );
  const [referralPlan, setReferralPlan] = useState(
    settings.referralPlanSlug ?? 'early-bird',
  );
  const [referralDays, setReferralDays] = useState(
    settings.referralGiftDays ?? 7,
  );

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.getPlans(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const handleSaveBillingSettings = () => {
    mutateSettings.mutate({
      yearlyPlanDiscountEnabled: yearlyDiscount,
      referralPlanSlug: referralPlan,
      referralGiftDays: Number(referralDays),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('billingSettings')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              checked={yearlyDiscount}
              onChange={(e) => setYearlyDiscount(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-ink">
              {t('yearlyPlanDiscountEnabled')}
            </span>
          </label>
          <Select
            label={t('referralPlanSlug')}
            value={referralPlan}
            onChange={(e) => setReferralPlan(e.target.value)}
          >
            {plansQuery.data?.map((p) => (
              <option key={p.slug} value={p.slug}>
                {lang === 'ar' ? p.nameAr : p.nameEn} ({p.slug})
              </option>
            ))}
          </Select>
          <Input
            label={t('referralGiftDays')}
            type="number"
            min={1}
            max={365}
            value={referralDays}
            onChange={(e) => setReferralDays(Number(e.target.value))}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSaveBillingSettings}
            disabled={mutateSettings.isPending}
            variant="primary"
          >
            {t('saveSettings')}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t('teacherPlans')}</h2>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> {t('createPlan')}
          </Button>
        </div>
        {plansQuery.isLoading ? (
          <Loading />
        ) : plansQuery.error ? (
          <ErrorBox error={plansQuery.error} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="p-3 text-start">{t('activePlan')}</th>
                  <th className="p-3 text-start">{t('planSlug')}</th>
                  <th className="p-3 text-start">{t('tierRank')}</th>
                  <th className="p-3 text-start">
                    {t('monthlyPriceOmr')} / {t('monthlyPriceEgp')}
                  </th>
                  <th className="p-3 text-start">{t('maxStudents')}</th>
                  <th className="p-3 text-start">{t('maxStorageBytes')}</th>
                  <th className="p-3 text-start">{t('trialDays')}</th>
                  <th className="p-3 text-start">{t('isPublic')}</th>
                  <th className="p-3 text-end">{t('settings')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {plansQuery.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-tint">
                    <td className="p-3 font-semibold">
                      <div>{lang === 'ar' ? p.nameAr : p.nameEn}</div>
                      <div className="text-xs text-ink-soft">
                        {lang === 'ar' ? p.nameEn : p.nameAr}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge tone="neutral">{p.slug}</Badge>
                    </td>
                    <td className="p-3 tabular-nums">{p.tierRank}</td>
                    <td className="p-3 tabular-nums">
                      <div>
                        {p.monthlyPriceOmr} OMR ({p.yearlyMonthlyPriceOmr} /yr)
                      </div>
                      <div className="text-xs text-ink-soft">
                        {p.monthlyPriceEgp} EGP ({p.yearlyMonthlyPriceEgp} /yr)
                      </div>
                    </td>
                    <td className="p-3 tabular-nums">
                      {p.maxStudents ?? t('unlimited')}
                    </td>
                    <td className="p-3 tabular-nums">
                      {p.maxStorageBytes
                        ? `${(p.maxStorageBytes / 1073741824).toFixed(0)} GB`
                        : t('unlimited')}
                    </td>
                    <td className="p-3 tabular-nums">
                      {p.trialDays > 0 ? `${p.trialDays}d` : '—'}
                    </td>
                    <td className="p-3">
                      <Badge tone={p.isPublic ? 'primary' : 'neutral'}>
                        {p.isPublic
                          ? lang === 'ar'
                            ? 'مرئية'
                            : 'Public'
                          : lang === 'ar'
                            ? 'مخفية'
                            : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3 text-end">
                      <Button variant="ghost" onClick={() => setEditingPlan(p)}>
                        <Pencil size={14} /> {t('edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {createOpen && (
        <CreatePlanDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingPlan && (
        <EditPlanDialog
          open={!!editingPlan}
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}

function CreatePlanDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();

  const [slug, setSlug] = useState('');
  const [tierRank, setTierRank] = useState(15);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [monthlyPriceOmr, setMonthlyPriceOmr] = useState(15);
  const [yearlyMonthlyPriceOmr, setYearlyMonthlyPriceOmr] = useState(12);
  const [monthlyPriceEgp, setMonthlyPriceEgp] = useState(800);
  const [yearlyMonthlyPriceEgp, setYearlyMonthlyPriceEgp] = useState(600);
  const [maxStudents, setMaxStudents] = useState<string>('100');
  const [storageGb, setStorageGb] = useState<string>('25');
  const [maxGroups, setMaxGroups] = useState<string>('');
  const [trialDays, setTrialDays] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createPlan({
        slug: slug.trim().toLowerCase(),
        tierRank: Number(tierRank),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr.trim() || null,
        descriptionEn: descriptionEn.trim() || null,
        monthlyPriceOmr: Number(monthlyPriceOmr),
        yearlyMonthlyPriceOmr: Number(yearlyMonthlyPriceOmr),
        monthlyPriceEgp: Number(monthlyPriceEgp),
        yearlyMonthlyPriceEgp: Number(yearlyMonthlyPriceEgp),
        maxStudents: maxStudents.trim() ? Number(maxStudents) : null,
        maxStorageBytes: storageGb.trim()
          ? Math.round(Number(storageGb) * 1073741824)
          : null,
        maxGroups: maxGroups.trim() ? Number(maxGroups) : null,
        trialDays: Number(trialDays),
        isPublic,
        displayOrder: Number(displayOrder),
      }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={t('createPlan')}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('planSlug')}
            placeholder="custom-vip"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
          <Input
            label={t('tierRank')}
            type="number"
            value={tierRank}
            onChange={(e) => setTierRank(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('planNameAr')}
            placeholder="خطة مخصصة"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required
          />
          <Input
            label={t('planNameEn')}
            placeholder="Custom Plan"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('planDescriptionAr')}
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
          />
          <Input
            label={t('planDescriptionEn')}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            label={t('monthlyPriceOmr')}
            type="number"
            value={monthlyPriceOmr}
            onChange={(e) => setMonthlyPriceOmr(Number(e.target.value))}
          />
          <Input
            label={t('yearlyMonthlyPriceOmr')}
            type="number"
            value={yearlyMonthlyPriceOmr}
            onChange={(e) => setYearlyMonthlyPriceOmr(Number(e.target.value))}
          />
          <Input
            label={t('monthlyPriceEgp')}
            type="number"
            value={monthlyPriceEgp}
            onChange={(e) => setMonthlyPriceEgp(Number(e.target.value))}
          />
          <Input
            label={t('yearlyMonthlyPriceEgp')}
            type="number"
            value={yearlyMonthlyPriceEgp}
            onChange={(e) => setYearlyMonthlyPriceEgp(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('maxStudents')}
            type="number"
            placeholder={t('unlimited')}
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
          />
          <Input
            label={t('maxStorageBytes')}
            type="number"
            placeholder={t('unlimited')}
            value={storageGb}
            onChange={(e) => setStorageGb(e.target.value)}
          />
          <Input
            label={t('maxGroups')}
            type="number"
            placeholder={t('unlimited')}
            value={maxGroups}
            onChange={(e) => setMaxGroups(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('trialDays')}
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value))}
          />
          <Input
            label={t('displayOrder')}
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-ink">
              {t('isPublic')}
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('createPlan')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditPlanDialog({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan: Plan;
  onClose: () => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();

  const [tierRank, setTierRank] = useState(plan.tierRank);
  const [nameAr, setNameAr] = useState(plan.nameAr);
  const [nameEn, setNameEn] = useState(plan.nameEn);
  const [descriptionAr, setDescriptionAr] = useState(plan.descriptionAr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(plan.descriptionEn ?? '');
  const [monthlyPriceOmr, setMonthlyPriceOmr] = useState(plan.monthlyPriceOmr);
  const [yearlyMonthlyPriceOmr, setYearlyMonthlyPriceOmr] = useState(
    plan.yearlyMonthlyPriceOmr,
  );
  const [monthlyPriceEgp, setMonthlyPriceEgp] = useState(plan.monthlyPriceEgp);
  const [yearlyMonthlyPriceEgp, setYearlyMonthlyPriceEgp] = useState(
    plan.yearlyMonthlyPriceEgp,
  );
  const [maxStudents, setMaxStudents] = useState<string>(
    plan.maxStudents != null ? String(plan.maxStudents) : '',
  );
  const [storageGb, setStorageGb] = useState<string>(
    plan.maxStorageBytes != null
      ? String(Math.round(plan.maxStorageBytes / 1073741824))
      : '',
  );
  const [maxGroups, setMaxGroups] = useState<string>(
    plan.maxGroups != null ? String(plan.maxGroups) : '',
  );
  const [trialDays, setTrialDays] = useState(plan.trialDays);
  const [isPublic, setIsPublic] = useState(plan.isPublic);
  const [displayOrder, setDisplayOrder] = useState(plan.displayOrder);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updatePlan(plan.id, {
        tierRank: Number(tierRank),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr.trim() || null,
        descriptionEn: descriptionEn.trim() || null,
        monthlyPriceOmr: Number(monthlyPriceOmr),
        yearlyMonthlyPriceOmr: Number(yearlyMonthlyPriceOmr),
        monthlyPriceEgp: Number(monthlyPriceEgp),
        yearlyMonthlyPriceEgp: Number(yearlyMonthlyPriceEgp),
        maxStudents: maxStudents.trim() ? Number(maxStudents) : null,
        maxStorageBytes: storageGb.trim()
          ? Math.round(Number(storageGb) * 1073741824)
          : null,
        maxGroups: maxGroups.trim() ? Number(maxGroups) : null,
        trialDays: Number(trialDays),
        isPublic,
        displayOrder: Number(displayOrder),
      }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`${t('editPlan')}: ${plan.slug}`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('planNameAr')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required
          />
          <Input
            label={t('planNameEn')}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            required
          />
          <Input
            label={t('tierRank')}
            type="number"
            value={tierRank}
            onChange={(e) => setTierRank(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('planDescriptionAr')}
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
          />
          <Input
            label={t('planDescriptionEn')}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            label={t('monthlyPriceOmr')}
            type="number"
            value={monthlyPriceOmr}
            onChange={(e) => setMonthlyPriceOmr(Number(e.target.value))}
          />
          <Input
            label={t('yearlyMonthlyPriceOmr')}
            type="number"
            value={yearlyMonthlyPriceOmr}
            onChange={(e) => setYearlyMonthlyPriceOmr(Number(e.target.value))}
          />
          <Input
            label={t('monthlyPriceEgp')}
            type="number"
            value={monthlyPriceEgp}
            onChange={(e) => setMonthlyPriceEgp(Number(e.target.value))}
          />
          <Input
            label={t('yearlyMonthlyPriceEgp')}
            type="number"
            value={yearlyMonthlyPriceEgp}
            onChange={(e) => setYearlyMonthlyPriceEgp(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('maxStudents')}
            type="number"
            placeholder={t('unlimited')}
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
          />
          <Input
            label={t('maxStorageBytes')}
            type="number"
            placeholder={t('unlimited')}
            value={storageGb}
            onChange={(e) => setStorageGb(e.target.value)}
          />
          <Input
            label={t('maxGroups')}
            type="number"
            placeholder={t('unlimited')}
            value={maxGroups}
            onChange={(e) => setMaxGroups(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('trialDays')}
            type="number"
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value))}
          />
          <Input
            label={t('displayOrder')}
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-sm font-semibold text-ink">
              {t('isPublic')}
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {t('saveSettings')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PromoCodesTab() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const promoCodesQuery = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: () => adminApi.getPromoCodes(),
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.getPlans(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updatePromoCode(id, { isActive }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t('promoCodes')}</h2>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> {t('createPromoCode')}
          </Button>
        </div>
        {promoCodesQuery.isLoading ? (
          <Loading />
        ) : promoCodesQuery.error ? (
          <ErrorBox error={promoCodesQuery.error} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="p-3 text-start">{t('code')}</th>
                  <th className="p-3 text-start">{t('activePlan')}</th>
                  <th className="p-3 text-start">{t('durationDays')}</th>
                  <th className="p-3 text-start">
                    {t('usedCount')} / {t('maxUses')}
                  </th>
                  <th className="p-3 text-start">{t('expiresAt')}</th>
                  <th className="p-3 text-start">{t('status')}</th>
                  <th className="p-3 text-end">{t('settings')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {promoCodesQuery.data?.map((pc) => (
                  <tr key={pc.id} className="hover:bg-surface-tint">
                    <td className="p-3 font-mono font-bold text-primary">
                      {pc.code}
                    </td>
                    <td className="p-3">
                      <div>
                        {lang === 'ar' ? pc.planNameAr : pc.planNameEn}
                      </div>
                      <div className="text-xs text-ink-soft">{pc.planSlug}</div>
                    </td>
                    <td className="p-3 tabular-nums">
                      {pc.durationDays} {lang === 'ar' ? 'يوم' : 'days'}
                    </td>
                    <td className="p-3 tabular-nums">
                      {pc.usedCount} / {pc.maxUses ?? '∞'}
                    </td>
                    <td className="p-3 text-xs text-ink-soft tabular-nums">
                      {pc.expiresAt ? formatDateTime(pc.expiresAt, lang) : '—'}
                    </td>
                    <td className="p-3">
                      <Badge tone={pc.isActive ? 'primary' : 'neutral'}>
                        {pc.isActive
                          ? t('planStatusActive')
                          : t('planStatusExpired')}
                      </Badge>
                    </td>
                    <td className="p-3 text-end">
                      <Button
                        variant={pc.isActive ? 'ghost' : 'secondary'}
                        onClick={() =>
                          toggleMutation.mutate({
                            id: pc.id,
                            isActive: !pc.isActive,
                          })
                        }
                        disabled={toggleMutation.isPending}
                      >
                        {pc.isActive ? t('suspend') : t('activate')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {createOpen && plansQuery.data && (
        <CreatePromoCodeDialog
          open={createOpen}
          plans={plansQuery.data}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function CreatePromoCodeDialog({
  open,
  plans,
  onClose,
}: {
  open: boolean;
  plans: Plan[];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();

  const [code, setCode] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createPromoCode({
        code: code.trim().toUpperCase(),
        planId,
        durationDays: Number(durationDays),
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        expiresAt: expiresAt.trim()
          ? new Date(expiresAt).toISOString()
          : null,
      }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={t('createPromoCode')}
    >
      <div className="space-y-4">
        <Input
          label={t('code')}
          placeholder="PROMO2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <Select
          label={t('activePlan')}
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {lang === 'ar' ? p.nameAr : p.nameEn} ({p.slug})
            </option>
          ))}
        </Select>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t('durationDays')}
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            required
          />
          <Input
            label={t('maxUses')}
            type="number"
            placeholder={t('unlimited')}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <Input
          label={t('expiresAt')}
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('createPromoCode')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/settings',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminSettings,
});
