import { useState } from 'react';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock, Eye, EyeOff, ListTree, Pencil, Plus, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { deleteUploadedObject } from '../../lib/upload';
import { useLang } from '../../lib/i18n';
import { ActionMenu, Badge, Button, Card, Dialog, EmptyState, ErrorBox, InfoHint, Input, Loading, Page, StatCard } from '../../components/ui';
import type { MeResponse, PresignedUpload, TeacherCourse as Course, TeacherStats } from '../../../../shared/api';
import { ThemeStrip, ThemeSurface } from '../../components/TeacherTheme';
import { OnboardingGuide } from '../../components/OnboardingGuide';

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

        <OnboardingGuide
          role="TEACHER"
          completedSteps={[
            (stats?.curricula ?? 0) > 0,
            (stats?.groups ?? 0) > 0,
            (stats?.uniqueStudents ?? 0) > 0,
          ]}
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={t('curricula')} value={stats?.curricula ?? 0} />
          <StatCard label={t('groups')} value={stats?.groups ?? 0} />
          <StatCard label={t('uniqueStudents')} value={stats?.uniqueStudents ?? 0} />
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{t('courses')}</h2>
            <InfoHint
              title={t('hintCoursesVsGroupsTitle')}
              steps={[
                { title: t('hintCoursesVsGroupsStep1Title'), body: t('hintCoursesVsGroupsStep1Body') },
                { title: t('hintCoursesVsGroupsStep2Title'), body: t('hintCoursesVsGroupsStep2Body') },
                { title: t('hintCoursesVsGroupsStep3Title'), body: t('hintCoursesVsGroupsStep3Body') },
              ]}
            />
          </div>
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
  const [editing, setEditing] = useState(false);
  const typeLabel = course.courseType === 'ACADEMIC' ? t('academic') : t('general');

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          {course.imageUrl && (
            <img
              src={course.imageUrl}
              alt=""
              className="size-16 shrink-0 rounded-xl border border-line object-cover sm:size-20"
            />
          )}
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={course.courseType === 'ACADEMIC' ? 'primary' : 'secondary'}>
                {typeLabel}
              </Badge>
              <Badge tone={course.isPublished ? 'neutral' : 'secondary'}>
                {course.isPublished ? t('active') : t('suspended')}
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-ink">
              <Link
                to="/teacher/courses/$courseId/groups"
                params={{ courseId: course.id }}
                className="transition hover:text-primary"
              >
                {course.title}
              </Link>
            </h3>
            {course.description && (
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                {course.description}
              </p>
            )}
          </div>
        </div>

        <ActionMenu
          label={t('moreActions')}
          items={[
            {
              label: t('edit'),
              icon: <Pencil size={16} />,
              onClick: () => setEditing(true),
            },
            {
              label: course.isPublished ? t('suspend') : t('activate'),
              icon: course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />,
              onClick: () => publish(course),
              disabled: publishing,
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/60 pt-3 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} className="shrink-0 text-primary" />
          <span className="font-semibold tabular-nums text-ink">{course.analytics.students}</span> {t('students')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={14} className="shrink-0 text-primary" />
          <span className="font-semibold tabular-nums text-ink">{course.analytics.lessons}</span> {t('lessons')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp size={14} className="shrink-0 text-primary" />
          <span className="font-semibold tabular-nums text-ink">{course.analytics.avgProgress}%</span> {t('progress')}
        </span>
        {course.latestLesson && (
          <span className="inline-flex items-center gap-1.5 truncate text-ink-soft">
            <Clock size={14} className="shrink-0" />
            <span>{t('latestLesson')}:</span>
            <span className="truncate font-medium text-ink">{course.latestLesson.title}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          to="/teacher/courses/$courseId/groups"
          params={{ courseId: course.id }}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:border-primary/50 hover:bg-surface-subtle"
        >
          <Users size={15} className="shrink-0 text-primary" />
          <span>{t('groups')}</span>
          <span className="rounded-full bg-primary-light/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-dark">
            {course.analytics.groups}
          </span>
        </Link>

        <Link
          to="/teacher/courses/$courseId/curriculum"
          params={{ courseId: course.id }}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:border-primary/50 hover:bg-surface-subtle"
        >
          <ListTree size={15} className="shrink-0 text-primary" />
          <span>{t('curriculum')}</span>
        </Link>
      </div>

      {editing && (
        <EditCourseDialog
          course={course}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}

function EditCourseDialog({
  course,
  open,
  onClose,
}: {
  course: Course;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [previewUrl, setPreviewUrl] = useState(course.previewUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Error | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let image: string | undefined;
      try {
        if (imageFile) {
          const up = await api<PresignedUpload>('/api/storage/course-image', {
            body: {
              courseId: course.id,
              fileName: imageFile.name,
              mimeType: imageFile.type,
              fileSizeBytes: imageFile.size,
            },
          });
          image = up.objectKey;
          const put = await fetch(up.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageFile.type },
            body: imageFile,
          });
          if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
        }
        return await api(`/api/teacher/courses/${course.id}`, {
          method: 'PATCH',
          body: {
            title,
            description,
            previewUrl: previewUrl.trim() || null,
            ...(image ? { image } : {}),
          },
        });
      } catch (error) {
        await deleteUploadedObject(image);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(t('saved'));
      onClose();
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
  });

  const pickImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(new Error(t('imageTooLarge')));
      return;
    }
    setUploadError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleClose = () => {
    onClose();
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? null : handleClose())}
      title={t('edit')}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>{t('cancel')}</Button>
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
          {(imagePreview || course.imageUrl) && (
            <img
              src={imagePreview ?? course.imageUrl!}
              alt=""
              className="mb-2 h-32 w-full rounded-xl border border-line object-cover"
            />
          )}
          <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
            {save.isPending ? '…' : t('uploadFile')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
              }}
            />
          </label>
          <p className="text-xs text-ink-soft">{t('imageHint')}</p>
          {uploadError && <div className="mt-2"><ErrorBox error={uploadError} /></div>}
        </div>
        {save.error && <ErrorBox error={save.error} />}
      </div>
    </Dialog>
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
