import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, KeyRound, Pencil, Plus, RotateCcw, Trash2, UserRound, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang } from '../../lib/i18n';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import {
  ActionMenu, type ActionMenuItem, Badge, Button, Card, ConfirmDialog, Dialog, ErrorBox, FilterLayout, IconButton, Input, Loading, Page, Select,
} from '../../components/ui';
import { ResetPasswordModal, type ResetTargetUser } from '../../components/ResetPasswordModal';
import type { TaxonomyItem } from '../../../../shared/api';
import { rootRoute } from '../../routes/__root';
import { requireRole, useAdminPermissions } from '../../lib/session';

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  enrollments: Array<{ groupName: string; courseTitle: string; courseId: string }>;
};

type GroupOption = {
  id: string;
  name: string;
  courseTitle: string;
  deletedAt: string | null;
};

type StudentProfile = StudentRow & {
  gradeName: string | null;
  parents: Array<{ id: string; name: string; email: string; phoneNumber: string | null }>;
  groups: Array<{
    groupId: string;
    groupName: string;
    courseId: string;
    courseTitle: string;
    teacherId: string;
    teacherName: string;
    joinedAt: string;
    attendancePercent: number;
  }>;
  quiz: { attempts: number; averagePercent: number };
};

const phoneRule = z.string().trim().min(8).regex(/^[+\d\s()-]+$/);

const createSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: phoneRule,
  email: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
  password: z.string().min(8),
  gradeId: z.string(),
});
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: phoneRule,
  gradeId: z.string(),
});
type EditValues = z.infer<typeof editSchema>;

export default function AdminStudents() {
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
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [groupsModalStudent, setGroupsModalStudent] = useState<StudentRow | null>(null);
  const { studentId: linkedStudentId, groupId: linkedGroupId } = adminStudentsRoute.useSearch();
  useEffect(() => {
    if (linkedStudentId) setProfileId(linkedStudentId);
  }, [linkedStudentId]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<ResetTargetUser | null>(null);

  const students = useQuery({
    queryKey: ['admin-students', debouncedName, debouncedPhone, linkedGroupId, showDeleted, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        deleted: String(showDeleted),
      });
      if (debouncedName.trim()) params.set('name', debouncedName.trim());
      if (debouncedPhone.trim()) params.set('phone', debouncedPhone.trim());
      if (linkedGroupId) params.set('groupId', linkedGroupId);
      return api<StudentRow[]>(`/api/admin/students?${params}`);
    },
  });
  const grades = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/grades'),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-students'] });
    void qc.invalidateQueries({ queryKey: ['admin-student-profile'] });
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

  const hasFilters = !!(name.trim() || phone.trim() || showDeleted);
  const clearFilters = () => {
    setName('');
    setPhone('');
    setShowDeleted(false);
  };

  return (
    <Page title={t('students')} wide>
      <FilterLayout
        search={
          <>
            <div className="min-w-44 grow"><Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="min-w-44 grow"><Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
          </>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="inline" size={16} /> {t('createStudent')}
          </Button>
        }
        filters={
          <>
            {linkedGroupId && (
              <p className="text-xs font-semibold text-primary">
                {t('filteredByGroup')}{' '}
                <Link to="/admin/students" search={{}} className="underline">{t('clearFilters')}</Link>
              </p>
            )}
            <label className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="size-4 accent-primary"
              />
              {t('showDeleted')}
            </label>
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
          {students.isLoading ? <Loading /> : students.error ? <ErrorBox error={students.error} /> : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-surface text-xs font-bold text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('name')}</th>
                    <th className="px-3 py-2 text-start">{t('email')}</th>
                    <th className="px-3 py-2 text-start">{t('phone')}</th>
                    <th className="px-3 py-2 text-start">{t('groups')}</th>
                    <th className="px-3 py-2 text-start">{t('settings')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.data?.map((student) => (
                    <tr key={student.id} className="border-t border-line/60">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setProfileId(student.id)}
                          className="font-semibold text-primary hover:underline"
                        >
                          {student.name}
                        </button>
                        {student.deletedAt && <span className="ms-2 text-xs font-bold text-secondary">{t('deleted')}</span>}
                      </td>
                      <td className="px-3 py-2" dir="ltr">{student.email}</td>
                      <td className="px-3 py-2" dir="ltr">{student.phoneNumber ?? '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setGroupsModalStudent(student)}
                          title={
                            student.enrollments
                              .map((e) => `${e.courseTitle} · ${e.groupName}`)
                              .join(' / ') || t('notEnrolledYet')
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-primary/50 hover:bg-surface-subtle"
                        >
                          <Users size={14} className="text-primary shrink-0" />
                          <span className="tabular-nums font-bold">
                            {student.enrollments.length}
                          </span>
                          <span>{t('groups')}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <IconButton label={t('profile')} onClick={() => setProfileId(student.id)}>
                            <UserRound size={16} />
                          </IconButton>
                          {student.deletedAt ? (
                            canManageUsers && (
                              <IconButton
                                label={t('restore')}
                                onClick={() => restoreUser.mutate(student.id)}
                              >
                                <RotateCcw size={16} />
                              </IconButton>
                            )
                          ) : (
                            <>
                              <IconButton label={t('edit')} onClick={() => setEditing(student)}>
                                <Pencil size={16} />
                              </IconButton>
                              {canManageUsers && (
                                <ActionMenu
                                  label={t('moreActions')}
                                  items={[
                                    {
                                      label: t('resetPassword'),
                                      icon: <KeyRound size={16} />,
                                      onClick: () =>
                                        setResetPasswordTarget({
                                          id: student.id,
                                          name: student.name,
                                          phoneNumber: student.phoneNumber,
                                        }),
                                    },
                                    {
                                      label: student.isActive ? t('suspend') : t('activate'),
                                      icon: student.isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />,
                                      onClick: () =>
                                        setStatus.mutate({ id: student.id, isActive: !student.isActive }),
                                    },
                                    {
                                      label: `${t('delete')} ${student.name}`,
                                      icon: <Trash2 size={16} />,
                                      danger: true,
                                      onClick: () => setDeleteTarget(student),
                                    },
                                  ]}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!students.data?.length && (
                    <tr><td colSpan={5} className="px-3 py-4 text-ink-soft">{t('noResults')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {(students.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
      </FilterLayout>

      {createOpen && (
        <CreateStudentDialog grades={grades.data ?? []} onClose={() => setCreateOpen(false)} onCreated={invalidate} />
      )}
      {editing && (
        <EditStudentDialog
          key={editing.id}
          student={editing}
          grades={grades.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
      {profileId && (
        <StudentProfileDialog
          key={profileId}
          studentId={profileId}
          onClose={() => setProfileId(null)}
          onChanged={invalidate}
          onResetPassword={(student) => setResetPasswordTarget(student)}
        />
      )}
      {groupsModalStudent && (
        <StudentGroupsDialog
          key={groupsModalStudent.id}
          student={groupsModalStudent}
          onClose={() => setGroupsModalStudent(null)}
          onOpenProfile={() => {
            const sid = groupsModalStudent.id;
            setGroupsModalStudent(null);
            setProfileId(sid);
          }}
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
      <ResetPasswordModal
        user={resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
      />
    </Page>
  );
}

function today(value: string, lang: 'ar' | 'en') {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB');
}

function StudentGroupsDialog({
  student,
  onClose,
  onOpenProfile,
}: {
  student: StudentRow;
  onClose: () => void;
  onOpenProfile: () => void;
}) {
  const { t, lang } = useLang();
  const profile = useQuery({
    queryKey: ['admin-student-profile', student.id],
    queryFn: () => api<StudentProfile>(`/api/admin/students/${student.id}`),
  });

  const detailedGroups = profile.data?.groups;

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${t('studentGroups')} — ${student.name}`}
      className="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
          >
            <UserRound size={16} />
            <span>{t('manageEnrollments')}</span>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto pe-1">
        <div className="mb-3 rounded-xl border border-line bg-surface-subtle p-3 text-xs text-ink-soft">
          <p className="font-semibold text-ink">{student.name}</p>
          <p dir="ltr" className="mt-0.5">
            {student.email} {student.phoneNumber ? `· ${student.phoneNumber}` : ''}
          </p>
        </div>

        {profile.isLoading && !student.enrollments.length ? (
          <Loading />
        ) : detailedGroups && detailedGroups.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {detailedGroups.map((g) => (
              <div
                key={g.groupId}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-3 transition hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{g.courseTitle}</p>
                  <Badge tone="primary">{g.groupName}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  {g.teacherName && (
                    <span>
                      {t('teacher')}: <span className="font-semibold text-ink">{g.teacherName}</span>
                    </span>
                  )}
                  {g.attendancePercent !== undefined && (
                    <span>
                      {t('attendance')}: <strong className="tabular-nums text-ink">{g.attendancePercent}%</strong>
                    </span>
                  )}
                  {g.joinedAt && (
                    <span>
                      {t('enrolled')} {today(g.joinedAt, lang)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : student.enrollments.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {student.enrollments.map((e, idx) => (
              <div
                key={`${e.courseId}-${e.groupName}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3"
              >
                <div>
                  <p className="font-semibold text-ink">{e.courseTitle}</p>
                  <p className="text-xs text-ink-soft">
                    {t('group')}: {e.groupName}
                  </p>
                </div>
                <Badge tone="primary">{e.groupName}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-ink-soft">
            <Users size={32} className="mx-auto mb-2 text-ink-soft/40" />
            <p>{t('notEnrolledYet')}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function CreateStudentDialog({
  grades, onClose, onCreated,
}: {
  grades: TaxonomyItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, lang } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', phoneNumber: '', email: '', password: '', gradeId: '' },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) => api('/api/admin/students', {
      body: {
        ...values,
        email: values.email || undefined,
        gradeId: values.gradeId || undefined,
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
      title={t('createStudent')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="create-student-form" disabled={create.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="create-student-form" onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('phone')} dir="ltr" error={errors.phoneNumber && t('phoneInvalid')} {...register('phoneNumber')} />
          <Input label={t('emailOptional')} type="email" dir="ltr" error={errors.email && t('emailInvalid')} {...register('email')} />
          <Input label={t('password')} type="password" error={errors.password && t('passwordMin')} {...register('password')} />
          <Select label={t('grade')} {...register('gradeId')}>
            <option value="">{t('choose')}</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>{localizeName(grade.name, lang)}</option>
            ))}
          </Select>
          {create.error && <ErrorBox error={create.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function EditStudentDialog({
  student, grades, onClose, onSaved,
}: {
  student: StudentRow;
  grades: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: student.name,
      phoneNumber: student.phoneNumber ?? '',
      gradeId: student.gradeId ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (values: EditValues) => api(`/api/admin/students/${student.id}`, {
      method: 'PATCH',
      body: {
        name: values.name,
        phoneNumber: values.phoneNumber,
        gradeId: values.gradeId || null,
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
      title={t('editStudent')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="edit-student-form" disabled={save.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="edit-student-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.name && t('requiredField')} {...register('name')} />
          <Input label={t('phone')} dir="ltr" error={errors.phoneNumber && t('phoneInvalid')} {...register('phoneNumber')} />
          <Select label={t('grade')} {...register('gradeId')}>
            <option value="">{t('choose')}</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>{localizeName(grade.name, lang)}</option>
            ))}
          </Select>
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function StudentProfileDialog({
  studentId, onClose, onChanged, onResetPassword,
}: {
  studentId: string;
  onClose: () => void;
  onChanged: () => void;
  onResetPassword?: (student: ResetTargetUser) => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const canManageUsers = useAdminPermissions()('users');
  const [addGroupId, setAddGroupId] = useState('');
  const profile = useQuery({
    queryKey: ['admin-student-profile', studentId],
    queryFn: () => api<StudentProfile>(`/api/admin/students/${studentId}`),
  });
  const groups = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => api<GroupOption[]>('/api/admin/groups'),
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-student-profile', studentId] });
    onChanged();
  };
  const enroll = useMutation({
    mutationFn: (groupId: string) =>
      api(`/api/admin/students/${studentId}/enroll`, { body: { groupId } }),
    onSuccess: () => {
      toast.success(t('saved'));
      setAddGroupId('');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (groupId: string) =>
      api(`/api/admin/students/${studentId}/groups/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('saved'));
      refresh();
    },
  });
  const move = useMutation({
    mutationFn: ({ fromGroupId, targetGroupId }: { fromGroupId: string; targetGroupId: string }) =>
      api(`/api/admin/students/${studentId}/groups/${fromGroupId}/move`, {
        method: 'PATCH',
        body: { targetGroupId },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      refresh();
    },
  });
  const actionError = enrollmentError(enroll.error, remove.error, move.error);
  const enrolledGroupIds = new Set(profile.data?.groups.map((g) => g.groupId));

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={profile.data?.name ?? t('studentProfile')}
      className="max-w-2xl"
      footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}
    >
      {profile.isLoading ? <Loading /> : profile.error ? <ErrorBox error={profile.error} /> : profile.data && (
        <div className="max-h-[65vh] overflow-y-auto pe-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <p className="text-sm text-ink-soft" dir="ltr">{profile.data.email} · {profile.data.phoneNumber ?? '—'}</p>
              <p className="mt-1 text-sm">{t('grade')}: {profile.data.gradeName ? localizeName(profile.data.gradeName, lang) : '—'}</p>
            </div>
            {canManageUsers && onResetPassword && (
              <button
                type="button"
                className="rounded-full border border-line px-3 py-1 text-xs font-bold hover:bg-surface-subtle"
                onClick={() =>
                  onResetPassword({
                    id: profile.data!.id,
                    name: profile.data!.name,
                    phoneNumber: profile.data!.phoneNumber,
                  })
                }
              >
                <KeyRound className="inline me-1" size={12} />
                {t('resetPassword')}
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs font-bold text-ink-soft">{t('quizAttempts')}</p>
              <p className="text-xl font-bold tabular-nums">{profile.data.quiz.attempts}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs font-bold text-ink-soft">{t('quizAverage')}</p>
              <p className="text-xl font-bold tabular-nums">{profile.data.quiz.averagePercent}%</p>
            </div>
          </div>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('parents')}</h3>
            {profile.data.parents.length ? (
              <ul className="flex flex-col gap-2">
                {profile.data.parents.map((parent) => (
                  <li key={parent.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold">{parent.name}</p>
                    <p className="text-ink-soft" dir="ltr">{parent.email} · {parent.phoneNumber ?? '—'}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">{t('noParentsLinked')}</p>}
          </section>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('groupHistory')}</h3>
            {profile.data.groups.length ? (
              <div className="flex flex-col gap-2">
                {profile.data.groups.map((group) => (
                  <div key={group.groupId} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{group.courseTitle}</p>
                        <p className="text-xs text-ink-soft">{group.groupName} · {group.teacherName}</p>
                        <p className="text-xs text-ink-soft">
                          {t('enrolled')} {today(group.joinedAt, lang)} · {t('attendance')} <span className="tabular-nums">{group.attendancePercent}%</span>
                        </p>
                      </div>
                      <button
                        onClick={() => remove.mutate(group.groupId)}
                        className="text-xs font-bold text-danger hover:underline"
                      >
                        {t('removeFromGroup')}
                      </button>
                    </div>
                    <Select
                      value=""
                      onChange={(e) => e.target.value && move.mutate({ fromGroupId: group.groupId, targetGroupId: e.target.value })}
                      className="mt-2"
                    >
                      <option value="">{t('moveTo')}</option>
                      {groups.data?.filter((option) => !enrolledGroupIds.has(option.id)).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.courseTitle} · {option.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-ink-soft">{t('notEnrolledYet')}</p>}
          </section>

          <section className="mt-4">
            <h3 className="mb-2 font-bold">{t('addToGroup')}</h3>
            <div className="flex items-end gap-2">
              <div className="grow">
                <Select value={addGroupId} onChange={(e) => setAddGroupId(e.target.value)}>
                  <option value="">{t('choose')}</option>
                  {groups.data?.filter((option) => !enrolledGroupIds.has(option.id)).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.courseTitle} · {option.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                disabled={!addGroupId || enroll.isPending}
                onClick={() => enroll.mutate(addGroupId)}
              >
                {t('add')}
              </Button>
            </div>
          </section>
          {actionError && <div className="mt-3"><ErrorBox error={actionError} /></div>}
        </div>
      )}
    </Dialog>
  );
}

function enrollmentError(...errors: Array<Error | null>) {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export const adminStudentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/students',
  validateSearch: (search: Record<string, unknown>): { studentId?: string; groupId?: string } => ({
    studentId: typeof search.studentId === 'string' ? search.studentId : undefined,
    groupId: typeof search.groupId === 'string' ? search.groupId : undefined,
  }),
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminStudents,
});
