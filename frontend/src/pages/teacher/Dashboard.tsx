import { useState } from 'react';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, ListTree, MoreVertical, Pencil, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, Dialog, EmptyState, ErrorBox, Input, Loading, Page, StatCard } from '../../components/ui';
import type { MeResponse, PresignedUpload, TeacherCourse as Course, TeacherStats } from '../../../../shared/api';
import { ThemeStrip, ThemeSurface } from '../../components/TeacherTheme';

export default function TeacherDashboard() {
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(teacherCoursesQuery);
  const { data: stats } = useQuery(teacherStatsQuery);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const publish = useMutation({
    mutationFn: (course: Course) =>
      api(`/api/teacher/courses/${course.id}`, { method: 'PATCH', body: { isPublished: !course.isPublished } }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  const sections = (['ACADEMIC', 'GENERAL'] as const).map((type) => ({
    type,
    title: type === 'ACADEMIC' ? t('academicCourses') : t('generalCourses'),
    courses: data?.filter((course) => course.courseType === type) ?? [],
  }));

  return (
    <Page title={t('myWorkspace')} wide>
      <ThemeSurface theme={me?.user.landingTheme}>
        <ThemeStrip theme={me?.user.landingTheme} bannerUrl={me?.bannerUrl ?? null} />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={t('curricula')} value={stats?.curricula ?? 0} />
          <StatCard label={t('groups')} value={stats?.groups ?? 0} />
          <StatCard label={t('uniqueStudents')} value={stats?.uniqueStudents ?? 0} />
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t('courses')}</h2>
          <Button onClick={() => navigate({ to: '/teacher/courses/new' })}>
            <Plus className="inline" size={18} /> {t('newCourse')}
          </Button>
        </div>

        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data?.length === 0 ? (
          <EmptyState
            title={t('noCourses')}
            icon={Plus}
            action={<Button onClick={() => navigate({ to: '/teacher/courses/new' })}>{t('newCourse')}</Button>}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <section key={section.type}>
                <h3 className="mb-3 text-sm font-bold text-ink-soft">{section.title}</h3>
                {section.courses.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-ink-soft">
                    {t('noCourses')}
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {section.courses.map((course) => (
                      <CourseCard key={course.id} course={course} publish={publish.mutate} publishing={publish.isPending} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </ThemeSurface>
    </Page>
  );
}

function CourseCard({
  course,
  publish,
  publishing,
}: {
  course: Course;
  publish: (course: Course) => void;
  publishing: boolean;
}) {
  const { t } = useLang();
  const typeLabel = course.courseType === 'ACADEMIC' ? t('academic') : t('general');

  return (
    <Card className="relative !p-0">
      <Link
        to="/teacher/courses/$courseId/groups"
        params={{ courseId: course.id }}
        className="block p-5 pe-14"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={course.courseType === 'ACADEMIC' ? 'primary' : 'secondary'}>{typeLabel}</Badge>
          <Badge>{course.isPublished ? t('active') : t('suspended')}</Badge>
        </div>
        <h3 className="text-lg font-bold">{course.title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="primary">{course.analytics.groups} {t('groups')}</Badge>
          <Badge tone="primary">{course.analytics.students} {t('students')}</Badge>
          <Badge tone="primary">{course.analytics.lessons} {t('lessons')}</Badge>
          <Badge>{t('progress')} {course.analytics.avgProgress}%</Badge>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {t('latestLesson')}: {course.latestLesson?.title ?? t('noLatestLesson')}
        </p>
      </Link>

      <details className="absolute end-3 top-3 z-10">
        <summary
          aria-label={t('actions')}
          className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-surface text-ink-soft hover:text-primary [&::-webkit-details-marker]:hidden"
        >
          <MoreVertical size={18} />
        </summary>
        <div className="absolute end-0 top-full mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface text-sm">
          <div className="border-b border-line px-4 py-3">
            <EditCourse course={course} />
          </div>
          <Link to="/teacher/courses/$courseId/groups" params={{ courseId: course.id }} className="flex min-h-11 items-center gap-2 px-4 font-semibold hover:bg-line/40">
            <Users size={16} /> {t('groups')}
          </Link>
          <Link to="/teacher/courses/$courseId/curriculum" params={{ courseId: course.id }} className="flex min-h-11 items-center gap-2 px-4 font-semibold hover:bg-line/40">
            <ListTree size={16} /> {t('curriculum')}
          </Link>
          <button
            type="button"
            onClick={() => publish(course)}
            disabled={publishing}
            className="flex min-h-11 w-full items-center gap-2 px-4 text-start font-semibold hover:bg-line/40"
          >
            {course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
            {course.isPublished ? t('suspend') : t('activate')}
          </button>
        </div>
      </details>
    </Card>
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
      if (file.size > 5 * 1024 * 1024) throw new Error(t('imageTooLarge'));
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

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const teacherCoursesQuery = {
  queryKey: ['teacher-courses'] as const,
  queryFn: () => api<Course[]>('/api/teacher/courses'),
};

export const teacherStatsQuery = {
  queryKey: ['teacher-stats'] as const,
  queryFn: () => api<TeacherStats>('/api/teacher/stats'),
};

export const teacherDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/dashboard',
  beforeLoad: () => requireRole('TEACHER'),
  loader: () => Promise.all([
    queryClient.ensureQueryData(teacherCoursesQuery),
    queryClient.ensureQueryData(teacherStatsQuery),
  ]),
  component: TeacherDashboard,
});
