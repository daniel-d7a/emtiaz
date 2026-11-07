import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, CreditCard, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, api, type AdminTeacherEntitlementsResponse, type Plan } from '../../lib/api';
import { formatDateTime, localizeName, useLang } from '../../lib/i18n';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { Badge, Button, Card, ConfirmDialog, Dialog, ErrorBox, FilterLayout, Input, Loading, Page, Progress, Select, Sheet } from '../../components/ui';
import type { TaxonomyItem } from '../../../../shared/api';
import { rootRoute } from '../../routes/__root';
import { requireRole, useAdminPermissions } from '../../lib/session';

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  landingSlug: string | null;
  landingPublished: boolean;
  isTopTeacher: boolean;
  subjectCategoryId: string | null;
  subject: { id: string | null; name: string | null } | null;
  courseCount: number;
  groupCount: number;
  uniqueStudentCount: number;
};

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phoneNumber: z.string().trim().min(8).regex(/^[+\d\s()-]+$/),
  subject: z.string().trim().min(1),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: z.string().trim(),
  subjectId: z.string(),
  isTopTeacher: z.boolean().default(false),
});
type EditValues = z.infer<typeof editSchema>;

export default function AdminTeachers() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const canManageUsers = useAdminPermissions()('users');
  const { name: linkedName } = adminTeachersRoute.useSearch();
  const [name, setName] = useState(linkedName ?? '');
  const [phone, setPhone] = useState('');
  const debouncedName = useDebouncedValue(name);
  const debouncedPhone = useDebouncedValue(phone);
  const [subjectId, setSubjectId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRow | null>(null);
  const [entitlementsTeacher, setEntitlementsTeacher] = useState<TeacherRow | null>(null);

  const teachers = useQuery({
    queryKey: ['admin-teachers', debouncedName, debouncedPhone, subjectId, showDeleted, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        deleted: String(showDeleted),
      });
      if (debouncedName.trim()) params.set('name', debouncedName.trim());
      if (debouncedPhone.trim()) params.set('phone', debouncedPhone.trim());
      if (subjectId) params.set('subjectId', subjectId);
      return api<TeacherRow[]>(`/api/admin/teachers?${params}`);
    },
  });
  const categories = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/categories'),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-teachers'] });
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
  const toggleTopTeacher = useMutation({
    mutationFn: ({ id, isTopTeacher }: { id: string; isTopTeacher: boolean }) =>
      api(`/api/admin/teachers/${id}`, { method: 'PATCH', body: { isTopTeacher } }),
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
  const deleteUser = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      setDeleteTarget(null);
      invalidate();
    },
  });

  const columns: ColumnDef<TeacherRow>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortHeader label={t('name')} onClick={column.getToggleSortingHandler()} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-semibold">
          <span>{row.original.name}</span>
          {row.original.isTopTeacher && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20 shadow-sm"
              title={t('topTeacher')}
            >
              <Sparkles size={12} className="text-amber-500" />
              {t('topTeacher')}
            </span>
          )}
          {row.original.deletedAt && <span className="ms-2 text-xs font-bold text-secondary">{t('deleted')}</span>}
        </div>
      ),
    },
    {
      id: 'contact',
      header: t('phone'),
      cell: ({ row }) => (
        <div className="text-sm" dir="ltr">
          <p>{row.original.email}</p>
          <p className="text-ink-soft">{row.original.phoneNumber ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'specialization',
      header: t('specialization'),
      cell: ({ row }) => row.original.subject?.name
        ? localizeName(row.original.subject.name, lang)
        : '—',
    },
    {
      id: 'publicPage',
      header: t('publicPage'),
      cell: ({ row }) => row.original.landingPublished && row.original.landingSlug ? (
        <Link
          to="/t/$slug"
          params={{ slug: row.original.landingSlug }}
          className="font-semibold text-primary hover:underline"
        >
          {t('publicPage')}
        </Link>
      ) : '—',
    },
    {
      accessorKey: 'courseCount',
      header: ({ column }) => <SortHeader label={t('courses')} onClick={column.getToggleSortingHandler()} />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.courseCount}</span>,
    },
    {
      accessorKey: 'groupCount',
      header: ({ column }) => <SortHeader label={t('groups')} onClick={column.getToggleSortingHandler()} />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.groupCount}</span>,
    },
    {
      accessorKey: 'uniqueStudentCount',
      header: ({ column }) => <SortHeader label={t('uniqueStudents')} onClick={column.getToggleSortingHandler()} />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.uniqueStudentCount}</span>,
    },
    {
      id: 'actions',
      header: t('settings'),
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex flex-wrap items-center gap-2">
            {teacher.deletedAt ? canManageUsers && (
              <button
                onClick={() => restoreUser.mutate(teacher.id)}
                className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
              >
                {t('restore')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleTopTeacher.mutate({ id: teacher.id, isTopTeacher: !teacher.isTopTeacher })}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition inline-flex items-center gap-1 ${
                    teacher.isTopTeacher
                      ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-line text-ink-soft hover:border-amber-400 hover:text-amber-600'
                  }`}
                  title={t('topTeacherToggle')}
                >
                  <Sparkles size={12} className={teacher.isTopTeacher ? 'text-amber-500' : 'text-ink-soft'} />
                  {teacher.isTopTeacher ? t('topTeacher') : t('topTeacherToggle')}
                </button>
                <button
                  onClick={() => setEditing(teacher)}
                  className="rounded-full border border-line px-3 py-1 text-xs font-bold"
                  title={t('edit')}
                >
                  <Pencil className="inline" size={12} /> {t('edit')}
                </button>
                <button
                  onClick={() => setEntitlementsTeacher(teacher)}
                  className="rounded-full border border-primary/40 bg-primary-light/40 px-3 py-1 text-xs font-bold text-primary-dark hover:bg-primary-light"
                  title={t('subscriptionAndEntitlements')}
                >
                  <CreditCard className="inline me-1" size={12} /> {t('subscriptionAndEntitlements')}
                </button>
                {canManageUsers && (
                  <>
                    <button
                      onClick={() => setStatus.mutate({ id: teacher.id, isActive: !teacher.isActive })}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${teacher.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                    >
                      {teacher.isActive ? t('suspend') : t('activate')}
                    </button>
                    <button
                      aria-label={`${t('delete')} ${teacher.name}`}
                      onClick={() => setDeleteTarget(teacher)}
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
        );
      },
    },
  ];

  const table = useReactTable({
    data: teachers.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const hasFilters = !!(name.trim() || phone.trim() || subjectId || showDeleted);
  const clearFilters = () => {
    setName('');
    setPhone('');
    setSubjectId('');
    setShowDeleted(false);
  };

  return (
    <Page title={t('teachers')} wide>
      <FilterLayout
        search={
          <>
            <div className="min-w-40 grow"><Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="min-w-40 grow"><Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
          </>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="inline" size={16} /> {t('createTeacher')}
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
            <Select label={t('specialization')} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">{t('allSpecializations')}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>{localizeName(category.name, lang)}</option>
              ))}
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
          {(setStatus.error ?? restoreUser.error ?? deleteUser.error) && (
            <ErrorBox error={setStatus.error ?? restoreUser.error ?? deleteUser.error} />
          )}
          {teachers.isLoading ? <Loading /> : teachers.error ? <ErrorBox error={teachers.error} /> : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-surface">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="text-xs font-bold text-ink-soft">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="sticky top-0 whitespace-nowrap bg-surface px-3 py-2 text-start">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-line/60">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!table.getRowModel().rows.length && (
                    <tr><td colSpan={columns.length} className="px-3 py-4 text-ink-soft">{t('noResults')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {(teachers.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
      </FilterLayout>

      {createOpen && (
        <CreateTeacherDialog
          categories={categories.data ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={invalidate}
        />
      )}
      {editing && (
        <EditTeacherDialog
          key={editing.id}
          teacher={editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
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
      {entitlementsTeacher && (
        <TeacherEntitlementsDrawer
          teacher={entitlementsTeacher}
          onClose={() => setEntitlementsTeacher(null)}
        />
      )}
    </Page>
  );
}

function SortHeader({ label, onClick }: { label: string; onClick?: (event: unknown) => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
      {label} <ArrowUpDown size={12} />
    </button>
  );
}

function CreateTeacherDialog({
  categories, onClose, onCreated,
}: {
  categories: TaxonomyItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, lang } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', phoneNumber: '', subject: '' },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) => api('/api/admin/teachers', {
      body: values,
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
      title={t('createTeacher')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="create-teacher-form" disabled={create.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="create-teacher-form" onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('email')} type="email" dir="ltr" error={errors.email && t('emailInvalid')} {...register('email')} />
          <Input label={t('password')} type="password" error={errors.password && t('passwordMin')} {...register('password')} />
          <Input label={t('phone')} dir="ltr" error={errors.phoneNumber && t('phoneInvalid')} {...register('phoneNumber')} />
          <Select label={t('specialization')} {...register('subject')}>
            <option value="">{t('choose')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>{localizeName(category.name, lang)}</option>
            ))}
          </Select>
          {create.error && <ErrorBox error={create.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function EditTeacherDialog({
  teacher, categories, onClose, onSaved,
}: {
  teacher: TeacherRow;
  categories: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: teacher.name,
      phoneNumber: teacher.phoneNumber ?? '',
      subjectId: teacher.subjectCategoryId ?? '',
      isTopTeacher: teacher.isTopTeacher ?? false,
    },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => api(`/api/admin/teachers/${teacher.id}`, {
      method: 'PATCH',
      body: {
        name: values.name,
        phoneNumber: values.phoneNumber,
        subjectId: values.subjectId || null,
        isTopTeacher: values.isTopTeacher,
      },
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
      title={t('editTeacher')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="edit-teacher-form" disabled={save.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="edit-teacher-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('phone')} dir="ltr" {...register('phoneNumber')} />
          <Select label={t('specialization')} {...register('subjectId')}>
            <option value="">{t('choose')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{localizeName(category.name, lang)}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold rounded-lg border border-line p-2.5 hover:bg-surface-subtle">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
              {...register('isTopTeacher')}
            />
            <span className="flex items-center gap-1.5 text-ink">
              <Sparkles size={16} className="text-amber-500" />
              {t('topTeacherToggle')}
            </span>
          </label>
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function TeacherEntitlementsDrawer({
  teacher,
  onClose,
}: {
  teacher: TeacherRow;
  onClose: () => void;
}) {
  const { t, lang } = useLang();

  const entitlements = useQuery({
    queryKey: ['admin-teacher-entitlements', teacher.id],
    queryFn: () => adminApi.getTeacherEntitlements(teacher.id),
  });

  const plans = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.getPlans(),
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);

  return (
    <Sheet
      open={true}
      onOpenChange={(v) => !v && onClose()}
      title={teacher.name}
      closeLabel={t('close')}
      className="w-full sm:w-[580px] md:w-[720px]"
    >
      {entitlements.isLoading ? (
        <Loading />
      ) : entitlements.error ? (
        <ErrorBox error={entitlements.error} />
      ) : entitlements.data ? (
        <div className="space-y-5 pb-8">
          {/* Header Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="text-sm">
              <span className="font-semibold">{teacher.email}</span>
              {teacher.phoneNumber && (
                <span className="ms-3 text-ink-soft" dir="ltr">
                  {teacher.phoneNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{entitlements.data.country}</Badge>
              <Badge tone="neutral">{entitlements.data.currency}</Badge>
            </div>
          </div>

          {/* Active Plan Card */}
          <div className="rounded-xl border border-line bg-surface-tint p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-ink-soft">
                  {t('activePlan')}
                </div>
                <div className="text-lg font-bold text-ink">
                  {lang === 'ar'
                    ? entitlements.data.activePlan.nameAr
                    : entitlements.data.activePlan.nameEn}
                </div>
              </div>
              <Badge
                tone={
                  entitlements.data.activePlan.status === 'ACTIVE'
                    ? 'primary'
                    : entitlements.data.activePlan.status === 'TRIAL'
                      ? 'secondary'
                      : 'neutral'
                }
              >
                {entitlements.data.activePlan.status === 'ACTIVE'
                  ? t('planStatusActive')
                  : entitlements.data.activePlan.status === 'TRIAL'
                    ? t('planStatusTrial')
                    : entitlements.data.activePlan.status === 'FREE'
                      ? t('planStatusFree')
                      : t('planStatusExpired')}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span className="text-ink-soft">{t('billingCycle')}: </span>
                <span className="font-semibold">
                  {entitlements.data.activePlan.billingCycle ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">{t('pricePaid')}: </span>
                <span className="font-semibold">
                  {entitlements.data.activePlan.pricePaid ?? 0}{' '}
                  {entitlements.data.currency}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-ink-soft">{t('expiresOn')}: </span>
                <span className="font-semibold">
                  {entitlements.data.activePlan.endsAt
                    ? formatDateTime(entitlements.data.activePlan.endsAt, lang)
                    : t('noExpiration')}
                </span>
              </div>
            </div>

            {entitlements.data.referral?.referralCode && (
              <div className="mt-3 border-t border-line/50 pt-2 text-xs">
                <span className="text-ink-soft">{t('yourReferralCode')}: </span>
                <span className="font-mono font-bold text-primary">
                  {entitlements.data.referral.referralCode}
                </span>
                <span className="ms-2 text-ink-soft">
                  ({entitlements.data.referral.usedCount} /{' '}
                  {entitlements.data.referral.maxReferrals})
                </span>
              </div>
            )}
          </div>

          {/* Usage Meters */}
          <div className="space-y-3 rounded-xl border border-line p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              {t('storageUsage')} & {t('activeStudentsUsage')}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>{t('activeStudentsUsage')}</span>
                <span className="tabular-nums">
                  {entitlements.data.usage.activeStudentCount} /{' '}
                  {entitlements.data.activePlan.maxStudents ?? t('unlimited')}
                </span>
              </div>
              <Progress
                value={
                  entitlements.data.activePlan.maxStudents
                    ? Math.min(
                        100,
                        (entitlements.data.usage.activeStudentCount /
                          entitlements.data.activePlan.maxStudents) *
                          100,
                      )
                    : 0
                }
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>{t('storageUsage')}</span>
                <span className="tabular-nums">
                  {(
                    entitlements.data.usage.usedStorageBytes /
                    (1024 * 1024)
                  ).toFixed(1)}{' '}
                  MB /{' '}
                  {entitlements.data.activePlan.maxStorageBytes
                    ? `${(entitlements.data.activePlan.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : t('unlimited')}
                </span>
              </div>
              <Progress
                value={
                  entitlements.data.activePlan.maxStorageBytes
                    ? Math.min(
                        100,
                        (entitlements.data.usage.usedStorageBytes /
                          entitlements.data.activePlan.maxStorageBytes) *
                          100,
                      )
                    : 0
                }
              />
            </div>

            <div className="text-xs text-ink-soft">
              {t('groups')}:{' '}
              <span className="font-semibold text-ink">
                {entitlements.data.usage.activeGroupCount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setAssignOpen(true)}>
              <CreditCard size={16} className="me-1.5" />
              {t('assignPaidSubscription')}
            </Button>
            <Button variant="ghost" onClick={() => setGrantOpen(true)}>
              <Sparkles size={16} className="me-1.5" />
              {t('grantGiftDays')}
            </Button>
          </div>

          {/* Saved Gifts Inventory */}
          <div className="rounded-xl border border-line p-4">
            <h3 className="mb-2 text-sm font-bold">
              {t('savedGiftsInventory')} (
              {entitlements.data.savedGifts.length}/3)
            </h3>
            {entitlements.data.savedGifts.length === 0 ? (
              <p className="text-xs text-ink-soft">{t('noSavedGifts')}</p>
            ) : (
              <ul className="divide-y divide-line text-xs">
                {entitlements.data.savedGifts.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <span className="font-semibold">
                        {lang === 'ar' ? g.planNameAr : g.planNameEn}
                      </span>
                      <span className="ms-2 text-ink-soft">({g.planSlug})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="secondary">+{g.durationDays}d</Badge>
                      <span className="text-ink-soft">{g.source}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Discount Ledger History */}
          <div className="rounded-xl border border-line p-4">
            <h3 className="mb-2 text-sm font-bold">
              {t('discountLedger')} ({entitlements.data.discounts.length})
            </h3>
            {entitlements.data.discounts.length === 0 ? (
              <p className="text-xs text-ink-soft">{t('noDiscountsRecorded')}</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-start text-xs">
                  <thead className="sticky top-0 border-b border-line bg-surface text-ink-soft">
                    <tr>
                      <th className="p-2 text-start">{t('occasion')}</th>
                      <th className="p-2 text-start">{t('activePlan')}</th>
                      <th className="p-2 text-start">{t('note')}</th>
                      <th className="p-2 text-end">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {entitlements.data.discounts.map((d) => (
                      <tr key={d.id} className="hover:bg-surface-tint">
                        <td className="p-2">
                          <Badge
                            tone={
                              d.occasion.startsWith('LIMIT_CROSS')
                                ? 'primary'
                                : 'neutral'
                            }
                          >
                            {d.occasion}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-ink-soft">
                          {d.planSlug}
                        </td>
                        <td className="p-2 text-ink">{d.description ?? '—'}</td>
                        <td className="p-2 text-end tabular-nums text-ink-soft">
                          {formatDateTime(d.createdAt, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {assignOpen && plans.data && (
        <AssignSubscriptionDialog
          open={assignOpen}
          teacherId={teacher.id}
          country={entitlements.data?.country ?? 'OM'}
          plans={plans.data}
          onClose={() => setAssignOpen(false)}
        />
      )}
      {grantOpen && plans.data && (
        <GrantGiftDialog
          open={grantOpen}
          teacherId={teacher.id}
          plans={plans.data}
          onClose={() => setGrantOpen(false)}
        />
      )}
    </Sheet>
  );
}

function AssignSubscriptionDialog({
  open,
  teacherId,
  country,
  plans,
  onClose,
}: {
  open: boolean;
  teacherId: string;
  country: 'OM' | 'EG';
  plans: Plan[];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();

  const paidPlans = plans.filter((p) => p.slug !== 'free');
  const [planId, setPlanId] = useState(paidPlans[0]?.id ?? plans[0]?.id ?? '');
  const [currency, setCurrency] = useState<'OMR' | 'EGP'>(
    country === 'EG' ? 'EGP' : 'OMR',
  );
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>(
    'MONTHLY',
  );
  const [durationDays, setDurationDays] = useState(30);
  const [pricePaid, setPricePaid] = useState<number>(0);
  const [recordLimitCrossingDiscount, setRecordLimitCrossingDiscount] =
    useState(false);

  useEffect(() => {
    const selected = plans.find((p) => p.id === planId);
    if (!selected) return;
    if (currency === 'OMR') {
      setPricePaid(
        billingCycle === 'YEARLY'
          ? selected.yearlyMonthlyPriceOmr * 12
          : selected.monthlyPriceOmr,
      );
    } else {
      setPricePaid(
        billingCycle === 'YEARLY'
          ? selected.yearlyMonthlyPriceEgp * 12
          : selected.monthlyPriceEgp,
      );
    }
  }, [planId, currency, billingCycle, plans]);

  const handleCycleChange = (cycle: 'MONTHLY' | 'YEARLY') => {
    setBillingCycle(cycle);
    setDurationDays(cycle === 'YEARLY' ? 365 : 30);
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      adminApi.assignTeacherSubscription(teacherId, {
        planId,
        currency,
        billingCycle,
        durationDays: Number(durationDays),
        pricePaid: Number(pricePaid),
        recordLimitCrossingDiscount,
      }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({
        queryKey: ['admin-teacher-entitlements', teacherId],
      });
      qc.invalidateQueries({ queryKey: ['admin-teachers'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={t('assignPaidSubscription')}
    >
      <div className="space-y-4">
        <Select
          label={t('activePlan')}
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {paidPlans.map((p) => (
            <option key={p.id} value={p.id}>
              {lang === 'ar' ? p.nameAr : p.nameEn} ({p.slug})
            </option>
          ))}
        </Select>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t('currency')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'OMR' | 'EGP')}
          >
            <option value="OMR">OMR (عُمان)</option>
            <option value="EGP">EGP (مصر)</option>
          </Select>

          <Select
            label={t('billingCycle')}
            value={billingCycle}
            onChange={(e) =>
              handleCycleChange(e.target.value as 'MONTHLY' | 'YEARLY')
            }
          >
            <option value="MONTHLY">{t('monthlyCycle')}</option>
            <option value="YEARLY">{t('yearlyCycle')}</option>
          </Select>
        </div>

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
            label={`${t('pricePaid')} (${currency})`}
            type="number"
            min={0}
            value={pricePaid}
            onChange={(e) => setPricePaid(Number(e.target.value))}
            required
          />
        </div>

        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            checked={recordLimitCrossingDiscount}
            onChange={(e) => setRecordLimitCrossingDiscount(e.target.checked)}
            className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold text-ink">
            {t('recordLimitCrossingDiscount')}
          </span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {t('assignPaidSubscription')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function GrantGiftDialog({
  open,
  teacherId,
  plans,
  onClose,
}: {
  open: boolean;
  teacherId: string;
  plans: Plan[];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();

  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [durationDays, setDurationDays] = useState(7);
  const [adminOverride, setAdminOverride] = useState(false);
  const [note, setNote] = useState('');

  const grantMutation = useMutation({
    mutationFn: () =>
      adminApi.grantTeacherGift(teacherId, {
        planId,
        durationDays: Number(durationDays),
        adminOverride,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t('settingsSaved'));
      qc.invalidateQueries({
        queryKey: ['admin-teacher-entitlements', teacherId],
      });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={t('grantGiftDays')}
    >
      <div className="space-y-4">
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

        <Input
          label={t('durationDays')}
          type="number"
          min={1}
          value={durationDays}
          onChange={(e) => setDurationDays(Number(e.target.value))}
          required
        />

        <Input
          label={t('note')}
          placeholder="Operational trial grant / VIP exception"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            checked={adminOverride}
            onChange={(e) => setAdminOverride(e.target.checked)}
            className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold text-ink">
            {t('adminOverride')}
          </span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={grantMutation.isPending}
            onClick={() => grantMutation.mutate()}
          >
            {t('grantGiftDays')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export const adminTeachersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/teachers',
  validateSearch: (search: Record<string, unknown>): { name?: string } => ({
    name: typeof search.name === 'string' ? search.name : undefined,
  }),
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminTeachers,
});
