import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import {
  Button, Card, ConfirmDialog, Dialog, ErrorBox, FilterLayout, Input, Loading, Page, Select,
} from '../../components/ui';
import { rootRoute } from '../../routes/__root';
import { requireRole, useAdminPermissions } from '../../lib/session';

type Child = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeName: string | null;
};

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

type ParentProfile = Omit<ParentRow, 'children'> & {
  children: Child[];
  feedback: Array<{ id: string; studentId: string; studentName: string; message: string; createdAt: string }>;
  deliveredReports: Array<{
    id: string;
    channel: string;
    type: string;
    recipient: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
};

type ParentLink = {
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
};

const phoneRule = z.string().trim().min(8).regex(/^[+\d\s()-]+$/);

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phoneNumber: phoneRule,
  monitoringCode: z.string().trim().refine((v) => !v || v.length === 8).optional(),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: phoneRule,
});
type EditValues = z.infer<typeof editSchema>;

export default function AdminParents() {
  const { t } = useLang();
  const qc = useQueryClient();
  const canManageUsers = useAdminPermissions()('users');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const debouncedName = useDebouncedValue(name);
  const debouncedPhone = useDebouncedValue(phone);
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ParentRow | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ParentLink | null>(null);

  const parents = useQuery({
    queryKey: ['admin-parents', debouncedName, debouncedPhone, showDeleted, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        deleted: String(showDeleted),
      });
      if (debouncedName.trim()) params.set('name', debouncedName.trim());
      if (debouncedPhone.trim()) params.set('phone', debouncedPhone.trim());
      return api<ParentRow[]>(`/api/admin/parents?${params}`);
    },
  });
  const deletedLinks = useQuery({
    queryKey: ['admin-parent-links', 'deleted'],
    queryFn: () => api<ParentLink[]>('/api/admin/parent-links?deleted=true'),
    enabled: showDeleted,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-parents'] });
    void qc.invalidateQueries({ queryKey: ['admin-parent-profile'] });
    void qc.invalidateQueries({ queryKey: ['admin-parent-links'] });
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
  const restoreLink = useMutation({
    mutationFn: (link: ParentLink) =>
      api(`/api/admin/parent-links/${link.parentId}/${link.studentId}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      setRestoreTarget(null);
      invalidate();
    },
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      setDeleteTarget(null);
      invalidate();
    },
  });

  const hasFilters = !!(name.trim() || phone.trim() || showDeleted);
  const clearFilters = () => {
    setName('');
    setPhone('');
    setShowDeleted(false);
  };

  return (
    <Page title={t('parents')} wide>
      <FilterLayout
        search={
          <>
            <div className="min-w-44 grow"><Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="min-w-44 grow"><Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
          </>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="inline" size={16} /> {t('createParent')}
          </Button>
        }
        filters={
          <>
            <button
              onClick={() => setShowDeleted((v) => !v)}
              className={`min-h-10 w-full rounded-xl px-3 text-sm font-semibold ${showDeleted ? 'bg-primary text-white' : 'border border-line text-ink-soft'}`}
            >
              {t('showDeleted')}
            </button>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-start text-sm font-semibold text-primary underline">
                {t('clearFilters')}
              </button>
            )}
          </>
        }
      >
        <Card>
          {(setStatus.error ?? restoreUser.error ?? deleteUser.error) && (
            <ErrorBox error={setStatus.error ?? restoreUser.error ?? deleteUser.error} />
          )}
          {parents.isLoading ? <Loading /> : parents.error ? <ErrorBox error={parents.error} /> : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-surface text-xs font-bold text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('name')}</th>
                    <th className="px-3 py-2 text-start">{t('email')}</th>
                    <th className="px-3 py-2 text-start">{t('phone')}</th>
                    <th className="px-3 py-2 text-start">{t('children')}</th>
                    <th className="px-3 py-2 text-start">{t('settings')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.data?.map((parent) => (
                    <tr key={parent.id} className="border-t border-line/60">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setProfileId(parent.id)}
                          className="font-semibold text-primary hover:underline"
                        >
                          {parent.name}
                        </button>
                        {parent.deletedAt && <span className="ms-2 text-xs font-bold text-secondary">{t('deleted')}</span>}
                      </td>
                      <td className="px-3 py-2" dir="ltr">{parent.email}</td>
                      <td className="px-3 py-2" dir="ltr">{parent.phoneNumber ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-ink-soft">
                        {parent.children.map((child) => child.name).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setProfileId(parent.id)}
                            className="rounded-full border border-line px-3 py-1 text-xs font-bold"
                            title={t('profile')}
                          >
                            <UserRound className="inline" size={12} /> {t('profile')}
                          </button>
                          {parent.deletedAt ? canManageUsers && (
                            <button
                              onClick={() => restoreUser.mutate(parent.id)}
                              className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                            >
                              {t('restore')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditing(parent)}
                                className="rounded-full border border-line px-3 py-1 text-xs font-bold"
                                title={t('edit')}
                              >
                                <Pencil className="inline" size={12} /> {t('edit')}
                              </button>
                              {canManageUsers && (
                                <>
                                  <button
                                    onClick={() => setStatus.mutate({ id: parent.id, isActive: !parent.isActive })}
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${parent.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                                  >
                                    {parent.isActive ? t('suspend') : t('activate')}
                                  </button>
                                  <button
                                    aria-label={`${t('delete')} ${parent.name}`}
                                    onClick={() => setDeleteTarget(parent)}
                                    className="text-ink-soft hover:text-danger"
                                    title={t('delete')}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!parents.data?.length && (
                    <tr><td colSpan={5} className="px-3 py-4 text-ink-soft">{t('noResults')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {(parents.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
      </FilterLayout>

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
                      onClick={() => setRestoreTarget(link)}
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

      {createOpen && (
        <CreateParentDialog onClose={() => setCreateOpen(false)} onCreated={invalidate} />
      )}
      {editing && (
        <EditParentDialog
          key={editing.id}
          parent={editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
      {profileId && (
        <ParentProfileDialog
          key={profileId}
          parentId={profileId}
          onClose={() => setProfileId(null)}
          onChanged={invalidate}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={`${t('delete')} ${deleteTarget?.name ?? ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
      />
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(next) => !next && setRestoreTarget(null)}
        title={t('restore')}
        confirmLabel={t('restore')}
        cancelLabel={t('cancel')}
        onConfirm={() => restoreTarget && restoreLink.mutate(restoreTarget)}
      />
      {restoreLink.error && <ErrorBox error={restoreLink.error} />}
    </Page>
  );
}

function formatDate(value: string, lang: 'ar' | 'en') {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB');
}

function CreateParentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', phoneNumber: '', monitoringCode: '' },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) => api('/api/admin/parents', {
      body: {
        ...values,
        monitoringCode: values.monitoringCode?.trim().toUpperCase() || undefined,
      },
    }),
    onSuccess: () => {
      toast.success(t('saved'));
      onCreated();
      onClose();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t('createParent')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="create-parent-form" disabled={create.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="create-parent-form" onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('email')} type="email" dir="ltr" error={errors.email && t('emailInvalid')} {...register('email')} />
          <Input label={t('password')} type="password" error={errors.password && t('passwordMin')} {...register('password')} />
          <Input label={t('phone')} dir="ltr" error={errors.phoneNumber && t('phoneInvalid')} {...register('phoneNumber')} />
          <Input
            label={t('studentMonitoringCodeOptional')}
            dir="ltr"
            maxLength={8}
            placeholder={t('monitoringCodePlaceholder')}
            error={errors.monitoringCode && t('monitoringCodeInvalid')}
            {...register('monitoringCode')}
          />
          {create.error && <ErrorBox error={create.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function EditParentDialog({
  parent, onClose, onSaved,
}: {
  parent: ParentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: parent.name, phoneNumber: parent.phoneNumber ?? '' },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => api(`/api/admin/parents/${parent.id}`, {
      method: 'PATCH',
      body: values,
    }),
    onSuccess: () => {
      toast.success(t('saved'));
      onSaved();
      onClose();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t('editParent')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="edit-parent-form" disabled={save.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="edit-parent-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('phone')} dir="ltr" error={errors.phoneNumber && t('phoneInvalid')} {...register('phoneNumber')} />
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function ParentProfileDialog({
  parentId, onClose, onChanged,
}: {
  parentId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const canManageUsers = useAdminPermissions()('users');
  const [childId, setChildId] = useState('');
  const profile = useQuery({
    queryKey: ['admin-parent-profile', parentId],
    queryFn: () => api<ParentProfile>(`/api/admin/parents/${parentId}`),
  });
  const students = useQuery({
    queryKey: ['admin-students', 'profile-picker'],
    queryFn: () => api<ParentRow[]>('/api/admin/students?limit=200'),
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-parent-profile', parentId] });
    onChanged();
  };
  const link = useMutation({
    mutationFn: (studentId: string) =>
      api('/api/admin/parent-links', { body: { parentId, studentId } }),
    onSuccess: () => {
      toast.success(t('linked'));
      setChildId('');
      refresh();
    },
  });
  const unlink = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/admin/parent-links/${parentId}/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('unlinked'));
      refresh();
    },
  });
  const actionError = link.error ?? unlink.error;
  const linkedIds = new Set(profile.data?.children.map((child) => child.id));

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={profile.data?.name ?? t('parentProfile')}
      className="max-w-2xl"
      footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}
    >
      {profile.isLoading ? <Loading /> : profile.error ? <ErrorBox error={profile.error} /> : profile.data && (
        <div className="max-h-[65vh] overflow-y-auto pe-1">
          <p className="text-sm text-ink-soft" dir="ltr">{profile.data.email} · {profile.data.phoneNumber ?? '—'}</p>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('linkedChildren')}</h3>
            {profile.data.children.length ? (
              <ul className="flex flex-col gap-2">
                {profile.data.children.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm">
                    <div>
                      <Link
                        to="/admin/students"
                        search={{ studentId: child.id }}
                        className="font-semibold text-primary hover:underline"
                      >
                        {child.name}
                      </Link>
                      <p className="text-xs text-ink-soft" dir="ltr">{child.email} · {child.phoneNumber ?? '—'}</p>
                      <p className="text-xs text-ink-soft">{child.gradeName ?? '—'}</p>
                    </div>
                    <button
                      onClick={() => unlink.mutate(child.id)}
                      className="text-xs font-bold text-danger hover:underline"
                    >
                      {t('unlinkChild')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">{t('noChildren')}</p>}
            <div className="mt-3 flex items-end gap-2">
              <div className="grow">
                <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                  <option value="">{t('choose')}</option>
                  {students.data?.filter((student) => !linkedIds.has(student.id)).map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </Select>
              </div>
              <Button disabled={!childId || link.isPending} onClick={() => link.mutate(childId)}>
                {t('addChild')}
              </Button>
            </div>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('feedback')}</h3>
            {profile.data.feedback.length ? (
              <ul className="flex flex-col gap-2">
                {profile.data.feedback.map((report) => (
                  <li key={report.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="whitespace-pre-wrap">{report.message}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {report.studentName} · {formatDate(report.createdAt, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">{t('noFeedback')}</p>}
          </section>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('deliveredReports')}</h3>
            {profile.data.deliveredReports.length ? (
              <ul className="flex flex-col gap-2">
                {profile.data.deliveredReports.map((report) => (
                  <li key={report.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="whitespace-pre-wrap">{report.message}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {report.channel} · {report.status} · {formatDate(report.createdAt, lang)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">{t('noReports')}</p>}
          </section>
          {actionError && <div className="mt-3"><ErrorBox error={actionError} /></div>}
        </div>
      )}
    </Dialog>
  );
}

export const adminParentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/parents',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminParents,
});
