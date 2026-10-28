import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { localizeName, useLang } from '../../lib/i18n';
import {
  Badge, Button, Card, ConfirmDialog, Dialog, ErrorBox, FilterLayout, Input, Loading, Page, Select,
} from '../../components/ui';
import type { TaxonomyItem } from '../../../../shared/api';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

type CourseRow = {
  id: string;
  title: string;
  courseType: 'ACADEMIC' | 'GENERAL';
  isPublished: boolean;
  deletedAt: string | null;
  teacherId: string;
  teacherName: string;
  categoryId: string | null;
  categoryName: string | null;
  gradeId: string | null;
  gradeName: string | null;
  semester: string | null;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

type GroupRow = {
  id: string;
  name: string;
  joinCode: string;
  courseId: string;
  courseTitle: string;
};

type TeacherOption = {
  id: string;
  name: string;
};

type CourseValues = {
  title: string;
  teacherId: string;
  courseType: 'ACADEMIC' | 'GENERAL';
  gradeId: string;
  categoryId: string;
  semester: string;
};

const courseSchema = z
  .object({
    title: z.string().trim().min(1),
    teacherId: z.string().min(1),
    courseType: z.enum(['ACADEMIC', 'GENERAL']),
    gradeId: z.string(),
    categoryId: z.string(),
    semester: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.courseType === 'ACADEMIC' && !value.gradeId) {
      ctx.addIssue({ code: 'custom', path: ['gradeId'], message: 'required' });
    }
    if (value.courseType === 'GENERAL' && !value.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'required' });
    }
  });

export default function AdminCourses() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [profile, setProfile] = useState<CourseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);

  const courses = useQuery({
    queryKey: ['admin-courses', name, categoryId, teacherId, showDeleted, limit],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        deleted: String(showDeleted),
      });
      if (name.trim()) params.set('name', name.trim());
      if (categoryId) params.set('categoryId', categoryId);
      if (teacherId) params.set('teacherId', teacherId);
      return api<CourseRow[]>(`/api/admin/courses?${params}`);
    },
  });
  const categories = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/categories'),
  });
  const grades = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/grades'),
  });
  const teachers = useQuery({
    queryKey: ['admin-teachers', 'picker'],
    queryFn: () => api<TeacherOption[]>('/api/admin/teachers?limit=200'),
  });
  const deletedGroups = useQuery({
    queryKey: ['admin-groups', 'deleted'],
    queryFn: () => api<GroupRow[]>('/api/admin/groups?deleted=true'),
    enabled: showDeleted,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-courses'] });
    void qc.invalidateQueries({ queryKey: ['admin-groups'] });
    void qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const restoreCourse = useMutation({
    mutationFn: (id: string) => api(`/api/admin/courses/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });
  const restoreGroup = useMutation({
    mutationFn: (id: string) => api(`/api/admin/groups/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('restored'));
      invalidate();
    },
  });
  const deleteCourse = useMutation({
    mutationFn: (id: string) => api(`/api/admin/courses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      setDeleteTarget(null);
      invalidate();
    },
  });

  const hasFilters = !!(name.trim() || categoryId || teacherId || showDeleted);
  const clearFilters = () => {
    setName('');
    setCategoryId('');
    setTeacherId('');
    setShowDeleted(false);
  };

  return (
    <Page title={t('courses')} wide>
      <FilterLayout
        search={
          <div className="min-w-40 grow"><Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} /></div>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="inline" size={16} /> {t('createCourse')}
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
            <Select label={t('specialization')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('allSpecializations')}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>{localizeName(category.name, lang)}</option>
              ))}
            </Select>
            <Select label={t('teachers')} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">{t('allTeachers')}</option>
              {teachers.data?.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
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
          {(restoreCourse.error ?? deleteCourse.error) && (
            <ErrorBox error={restoreCourse.error ?? deleteCourse.error} />
          )}
          {courses.isLoading ? <Loading /> : courses.error ? <ErrorBox error={courses.error} /> : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface text-xs font-bold text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('name')}</th>
                    <th className="px-3 py-2 text-start">{t('teacher')}</th>
                    <th className="px-3 py-2 text-start">{t('specialization')}</th>
                    <th className="px-3 py-2 text-start">{t('groups')}</th>
                    <th className="px-3 py-2 text-start">{t('settings')}</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.data?.map((course) => (
                    <tr key={course.id} className="border-t border-line/60">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setProfile(course)}
                          className="font-semibold text-primary hover:underline"
                        >
                          {course.title}
                        </button>
                        <Badge tone={course.courseType === 'ACADEMIC' ? 'primary' : 'secondary'} className="ms-2">
                          {course.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                        </Badge>
                        {course.deletedAt && <span className="ms-2 text-xs font-bold text-secondary">{t('deleted')}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to="/admin/teachers"
                          search={{ name: course.teacherName }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {course.teacherName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {course.categoryName
                          ? localizeName(course.categoryName, lang)
                          : course.gradeName
                            ? localizeName(course.gradeName, lang)
                            : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{course.groups.length}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {course.deletedAt ? (
                            <button
                              onClick={() => restoreCourse.mutate(course.id)}
                              className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark"
                            >
                              {t('restore')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditing(course)}
                                className="rounded-full border border-line px-3 py-1 text-xs font-bold"
                                title={t('edit')}
                              >
                                <Pencil className="inline" size={12} /> {t('edit')}
                              </button>
                              <button
                                aria-label={`${t('delete')} ${course.title}`}
                                onClick={() => setDeleteTarget(course)}
                                className="text-ink-soft hover:text-secondary"
                                title={t('delete')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!courses.data?.length && (
                    <tr><td colSpan={5} className="px-3 py-4 text-ink-soft">{t('noResults')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {(courses.data?.length ?? 0) >= limit && limit < 200 && (
            <div className="mt-3"><Button variant="ghost" onClick={() => setLimit((l) => l + 20)}>{t('loadMore')}</Button></div>
          )}
        </Card>
      </FilterLayout>

      {showDeleted && (
        <Card className="mt-4">
          <h2 className="font-bold">{t('deletedGroups')}</h2>
          {deletedGroups.isLoading ? <Loading /> : deletedGroups.error ? <ErrorBox error={deletedGroups.error} /> : (
            deletedGroups.data?.length ? (
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {deletedGroups.data.map((group) => (
                  <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-sm text-ink-soft">{group.courseTitle} · <span dir="ltr">{group.joinCode}</span></p>
                    </div>
                    <button
                      onClick={() => restoreGroup.mutate(group.id)}
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
        <CourseDialog
          teachers={teachers.data ?? []}
          grades={grades.data ?? []}
          categories={categories.data ?? []}
          onClose={() => setCreateOpen(false)}
          onSaved={invalidate}
        />
      )}
      {editing && (
        <CourseDialog
          key={editing.id}
          course={editing}
          teachers={teachers.data ?? []}
          grades={grades.data ?? []}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
      {profile && (
        <CourseProfileDialog course={profile} onClose={() => setProfile(null)} />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={`${t('delete')} ${deleteTarget?.title ?? ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => deleteTarget && deleteCourse.mutate(deleteTarget.id)}
      />
      {restoreGroup.error && <ErrorBox error={restoreGroup.error} />}
    </Page>
  );
}

function CourseDialog({
  course, teachers, grades, categories, onClose, onSaved,
}: {
  course?: CourseRow;
  teachers: TeacherOption[];
  grades: TaxonomyItem[];
  categories: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const isEdit = Boolean(course);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: course?.title ?? '',
      teacherId: course?.teacherId ?? '',
      courseType: course?.courseType ?? 'ACADEMIC',
      gradeId: course?.gradeId ?? '',
      categoryId: course?.categoryId ?? '',
      semester: course?.semester ?? '',
    },
  });
  const courseType = watch('courseType');
  const save = useMutation({
    mutationFn: (values: CourseValues) => api(
      isEdit ? `/api/admin/courses/${course!.id}` : '/api/admin/courses',
      {
        method: isEdit ? 'PATCH' : undefined,
        body: {
          title: values.title,
          teacherId: values.teacherId,
          courseType: values.courseType,
          gradeId: values.courseType === 'ACADEMIC' ? values.gradeId : null,
          categoryId: values.courseType === 'GENERAL' ? values.categoryId : null,
          semester: values.semester,
        },
      },
    ),
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
      title={isEdit ? t('editCourse') : t('createCourse')}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" form="course-form" disabled={save.isPending}>{t('save')}</Button>
        </>
      )}
    >
      <form id="course-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} error={errors.title && t('requiredField')} {...register('title')} />
          <Select label={t('teacher')} {...register('teacherId')}>
            <option value="">{t('choose')}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </Select>
          <Select label={t('courseType')} {...register('courseType')}>
            <option value="ACADEMIC">{t('academic')}</option>
            <option value="GENERAL">{t('general')}</option>
          </Select>
          {courseType === 'ACADEMIC' ? (
            <Select label={t('grade')} {...register('gradeId')}>
              <option value="">{t('choose')}</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>{localizeName(grade.name, lang)}</option>
              ))}
            </Select>
          ) : (
            <Select label={t('specialization')} {...register('categoryId')}>
              <option value="">{t('choose')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{localizeName(category.name, lang)}</option>
              ))}
            </Select>
          )}
          <Input label={t('semester')} {...register('semester')} />
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </form>
    </Dialog>
  );
}

function CourseProfileDialog({ course, onClose }: { course: CourseRow; onClose: () => void }) {
  const { t, lang } = useLang();
  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={course.title}
      className="max-w-xl"
      footer={<Button variant="ghost" onClick={onClose}>{t('close')}</Button>}
    >
      <div className="max-h-[65vh] overflow-y-auto pe-1">
        <p className="text-sm text-ink-soft">
          {course.courseType === 'ACADEMIC' ? t('academic') : t('general')}
          {' · '}
          {course.categoryName
            ? localizeName(course.categoryName, lang)
            : course.gradeName
              ? localizeName(course.gradeName, lang)
              : '—'}
        </p>
        <p className="mt-1 text-sm">
          {t('teacher')}:{' '}
          <Link
            to="/admin/teachers"
            search={{ name: course.teacherName }}
            className="font-semibold text-primary hover:underline"
          >
            {course.teacherName}
          </Link>
        </p>
        <section className="mt-4">
          <h3 className="mb-2 font-bold">{t('groups')}</h3>
          {course.groups.length ? (
            <ul className="flex flex-col gap-2">
              {course.groups.map((group) => (
                <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm">
                  <div>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-xs text-ink-soft">
                      <span dir="ltr">{group.joinCode}</span> · {group.studentCount} {t('students')}
                    </p>
                  </div>
                  <Link
                    to="/admin/students"
                    search={{ groupId: group.id }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {t('viewGroupStudents')}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">{t('noGroupsYet')}</p>}
        </section>
      </div>
    </Dialog>
  );
}

export const adminCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/courses',
  beforeLoad: () => requireRole('ADMIN'),
  component: AdminCourses,
});
