import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, Dialog, ErrorBox, Input, Loading, Page, Select } from '../../components/ui';
import type { TaxonomyItem } from '../../../../shared/api';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

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
  phoneNumber: z.string().trim(),
  subject: z.string().trim().min(1),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: z.string().trim(),
  subjectId: z.string(),
});
type EditValues = z.infer<typeof editSchema>;

export default function AdminTeachers() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRow | null>(null);

  const teachers = useQuery({
    queryKey: ['admin-teachers', name, phone, subjectId, showDeleted, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        deleted: String(showDeleted),
      });
      if (name.trim()) params.set('name', name.trim());
      if (phone.trim()) params.set('phone', phone.trim());
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
        <div className="font-semibold">
          {row.original.name}
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
            {teacher.deletedAt ? (
              <button
                onClick={() => restoreUser.mutate(teacher.id)}
                className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
              >
                {t('restore')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditing(teacher)}
                  className="rounded-full border border-line px-3 py-1 text-xs font-bold"
                  title={t('edit')}
                >
                  <Pencil className="inline" size={12} /> {t('edit')}
                </button>
                <button
                  onClick={() => setStatus.mutate({ id: teacher.id, isActive: !teacher.isActive })}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${teacher.isActive ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}
                >
                  {teacher.isActive ? t('suspend') : t('activate')}
                </button>
                <button
                  aria-label={`${t('delete')} ${teacher.name}`}
                  onClick={() => setDeleteTarget(teacher)}
                  className="text-ink-soft hover:text-secondary"
                  title={t('delete')}
                >
                  <Trash2 size={14} />
                </button>
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

  return (
    <Page title={t('teachers')} wide>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className={`min-h-12 rounded-xl px-4 text-sm font-semibold ${showDeleted ? 'bg-primary text-white' : 'border border-line text-ink-soft'}`}
          >
            {t('showDeleted')}
          </button>
          <div className="min-w-40 grow"><Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="min-w-40 grow"><Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
          <div className="min-w-40 grow">
            <Select label={t('specialization')} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">{t('allSpecializations')}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>{localizeName(category.name, lang)}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="inline" size={16} /> {t('createTeacher')}
          </Button>
        </div>
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
      body: {
        ...values,
        phoneNumber: values.phoneNumber || undefined,
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
    },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => api(`/api/admin/teachers/${teacher.id}`, {
      method: 'PATCH',
      body: {
        name: values.name,
        phoneNumber: values.phoneNumber,
        subjectId: values.subjectId || null,
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
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </form>
    </Dialog>
  );
}

export const adminTeachersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/teachers',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminTeachers,
});
