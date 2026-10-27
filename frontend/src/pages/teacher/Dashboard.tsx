import { useState } from 'react';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, FileUp, ListTree, Pencil, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, Dialog, EmptyState, ErrorBox, Input, Loading, Page, Select } from '../../components/ui';
import type { MeResponse, PresignedUpload, TeacherCourse as Course } from '../../../../shared/api';
import { ThemeStrip, ThemeSurface } from '../../components/TeacherTheme';

export default function TeacherDashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(teacherCoursesQuery);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const { data: grades } = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/taxonomy/grades'),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/admin/taxonomy/categories'),
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'ACADEMIC' | 'GENERAL'>('ACADEMIC');
  const [gradeId, setGradeId] = useState('');
  const [semester, setSemester] = useState('Semester 1');
  const [categoryId, setCategoryId] = useState('');
  const [formError, setFormError] = useState<Error | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api('/api/teacher/courses', {
        body: {
          title,
          courseType: type,
          gradeId: type === 'ACADEMIC' ? gradeId : undefined,
          semester: type === 'ACADEMIC' ? semester : undefined,
          categoryId: type === 'GENERAL' ? categoryId : undefined,
        },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      setShowForm(false);
      setTitle('');
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
    onError: (e) => setFormError(e),
  });
  const publish = useMutation({
    mutationFn: (course: Course) =>
      api(`/api/teacher/courses/${course.id}`, { method: 'PATCH', body: { isPublished: !course.isPublished } }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  return (
    <Page title={t('myWorkspace')}>
      <ThemeSurface theme={me?.user.landingTheme}>
      <ThemeStrip theme={me?.user.landingTheme} bannerUrl={me?.bannerUrl ?? null} />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('courses')}</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="inline" size={18} /> {t('newCourse')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="flex flex-col gap-3">
            <Input label={t('newCourse')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('courseTitlePlaceholder')} />
            <Select label={`${t('academic')} / ${t('general')}`} value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="ACADEMIC">{t('academic')}</option>
              <option value="GENERAL">{t('general')}</option>
            </Select>
            {type === 'ACADEMIC' ? (
              <>
                <Select label={t('grade')} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">— {t('grade')} —</option>
                  {grades?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
                <Input label={t('semester')} value={semester} onChange={(e) => setSemester(e.target.value)} />
              </>
            ) : (
              <Select label={t('general')} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— {t('general')} —</option>
                {categories?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            )}
            {formError && <ErrorBox error={formError} />}
            <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>{t('save')}</Button>
          </div>
        </Card>
      )}

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((c) => (
            <Card key={c.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.courseType === 'ACADEMIC' ? 'bg-primary-light text-primary-dark' : 'bg-secondary-light text-secondary'}`}>
                  {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                </span>
                <EditCourse course={c} />
              </div>
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-soft">
                {c.analytics.students} {t('students')} · {c.analytics.groups} {t('groups')} · {c.analytics.lessons} {t('lessons')} · {t('progress')} {c.analytics.avgProgress}%
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <AddGroup courseId={c.id} />
                  <button
                    onClick={() => publish.mutate(c)}
                    className="flex items-center gap-2 text-ink-soft hover:text-primary"
                  >
                    {c.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                    {c.isPublished ? t('active') : t('suspended')}
                  </button>
                </div>
                <Link to="/teacher/courses/$courseId/curriculum" params={{ courseId: c.id }} className="flex items-center gap-2 font-semibold text-primary">
                  <ListTree size={16} /> {t('curriculum')}
                </Link>
                {c.groups.map((g) => (
                  <Link key={g.id} to="/teacher/groups/$groupId" params={{ groupId: g.id }} className="flex items-center gap-2 text-primary">
                    <Users size={16} /> {g.name}
                    <span className="text-xs text-ink-soft">({g.studentCount})</span>
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs font-bold" dir="ltr">{g.joinCode}</span>
                  </Link>
                ))}
                <button
                  className="flex items-center gap-2 text-ink-soft"
                  onClick={() => navigate({ to: '/teacher/courses/$courseId/curriculum', params: { courseId: c.id } })}
                >
                  <FileUp size={16} /> {t('pacing')}
                </button>
              </div>
            </Card>
          ))}
          {data?.length === 0 && (
            <div className="sm:col-span-2">
              <EmptyState
                title={t('noCourses')}
                icon={Plus}
                action={<Button onClick={() => setShowForm(true)}>{t('newCourse')}</Button>}
              />
            </div>
          )}
        </div>
      )}
      </ThemeSurface>
    </Page>
  );
}

function EditCourse({ course }: { course: Course }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [previewUrl, setPreviewUrl] = useState(course.previewUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const save = useMutation({
    mutationFn: (image?: string) =>
      api(`/api/teacher/courses/${course.id}`, {
        method: 'PATCH',
        body: {
          title,
          description,
          previewUrl: previewUrl.trim() || null,
          ...(image ? { image } : {}),
        },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  const uploadImage = async (file: File) => {
    setBusy(true);
    setUploadError(null);
    try {
      const up = await api<PresignedUpload>('/api/storage/course-image', {
        body: {
          courseId: course.id,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        },
      });
      const put = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      save.mutate(up.objectKey);
    } catch (e) {
      setUploadError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-primary">
        <Pencil size={14} /> {t('edit')}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('edit')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => save.mutate(undefined)} disabled={!title.trim() || save.isPending}>
              {t('save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label={t('courseTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('courseDescription')}</span>
            <textarea
              className="w-full rounded-xl border border-line bg-white px-4 py-3"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <Input
            label={t('previewUrl')}
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            placeholder="https://"
            dir="ltr"
          />
          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('courseImage')}</span>
            {course.imageUrl && (
              <img src={course.imageUrl} alt="" className="mb-2 h-32 w-full rounded-xl border border-line object-cover" />
            )}
            <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
              {busy ? '…' : t('uploadFile')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
              />
            </label>
            <p className="text-xs text-ink-soft">{t('imageHint')}</p>
            {uploadError && <div className="mt-2"><ErrorBox error={uploadError} /></div>}
          </div>
          {save.error && <ErrorBox error={save.error} />}
        </div>
      </Dialog>
    </>
  );
}

function AddGroup({ courseId }: { courseId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const add = useMutation({
    mutationFn: () => api(`/api/teacher/courses/${courseId}/groups`, { body: { name } }),
    onSuccess: () => {
      setName('');
      setOpen(false);
      toast.success(t('saved'));
      return qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 font-semibold text-primary">
        <Plus size={16} /> {t('newGroup')}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <input
        className="w-36 rounded-lg border border-line px-2 py-1 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('newGroup')}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && add.mutate()}
      />
      <button onClick={() => add.mutate()} disabled={!name.trim()} className="font-semibold text-primary">
        {t('add')}
      </button>
      {add.error && <ErrorBox error={add.error} />}
    </span>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const teacherCoursesQuery = {
  queryKey: ['teacher-courses'] as const,
  queryFn: () => api<Course[]>('/api/teacher/courses'),
};

export const teacherDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/dashboard',
  beforeLoad: () => requireRole('TEACHER'),
  loader: () => queryClient.ensureQueryData(teacherCoursesQuery),
  component: TeacherDashboard,
});
