import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { deleteUploadedObject } from '../../lib/upload';
import { localizeName, useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Page, Select } from '../../components/ui';
import type { CategoryItem, Course, GradeItem, MeResponse, PresignedUpload, TaxonomyItem } from '../../../../shared/api';
import { teacherCoursesQuery, teacherStatsQuery } from './Dashboard';

const schema = z
  .object({
    title: z.string().trim().min(1),
    courseType: z.enum(['ACADEMIC', 'GENERAL']),
    grade: z.string().trim(),
    semester: z.string().trim(),
    skill: z.string().trim(),
    description: z.string().trim().max(2000),
    previewUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https?:\/\//i.test(v)),
  })
  .superRefine((value, ctx) => {
    if (value.courseType === 'ACADEMIC' && !value.grade) {
      ctx.addIssue({ code: 'custom', path: ['grade'], message: 'required' });
    }
    if (value.courseType === 'GENERAL' && !value.skill) {
      ctx.addIssue({ code: 'custom', path: ['skill'], message: 'required' });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function NewCourse() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<Error | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const teacherCountry = me?.user?.country ?? 'OM';
  const { data: grades } = useQuery({
    queryKey: ['grades-list', teacherCountry],
    queryFn: () => api<GradeItem[]>(`/api/onboarding/grades?country=${teacherCountry}`),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<CategoryItem[]>('/api/onboarding/categories'),
  });
  const { data: semesters } = useQuery({
    queryKey: ['semesters-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/semesters'),
  });
  const { register, handleSubmit, watch, setValue, formState: { errors, dirtyFields } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      courseType: me?.courseFocus ?? me?.user?.courseFocus ?? 'ACADEMIC',
      grade: '',
      semester: '',
      skill: '',
      description: '',
      previewUrl: '',
    },
  });

  useEffect(() => {
    const defaultFocus = me?.courseFocus ?? me?.user?.courseFocus;
    if (defaultFocus && !dirtyFields.courseType) {
      setValue('courseType', defaultFocus);
    }
  }, [me?.courseFocus, me?.user?.courseFocus, dirtyFields.courseType, setValue]);

  const prioritizedGrades = useMemo(() => {
    if (!grades) return [];
    const taughtIds = new Set((me?.taughtGrades ?? me?.user?.taughtGrades ?? []).map((g) => g.id));
    const countryFiltered = grades.filter((g) => !g.country || g.country === teacherCountry);
    const taught = countryFiltered.filter((g) => taughtIds.has(g.id));
    const rest = countryFiltered.filter((g) => !taughtIds.has(g.id));
    return [...taught, ...rest];
  }, [grades, me?.taughtGrades, me?.user?.taughtGrades, teacherCountry]);

  const type = watch('courseType');

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      const academic = values.courseType === 'ACADEMIC';
      const gradeInput = values.grade.trim().toLowerCase();
      const grade = prioritizedGrades.find(
        (item) =>
          item.name.toLowerCase() === gradeInput ||
          item.nameAr?.toLowerCase() === gradeInput ||
          item.nameEn?.toLowerCase() === gradeInput,
      );
      const skillInput = values.skill.trim().toLowerCase();
      const skill = categories?.find(
        (item) =>
          item.name.toLowerCase() === skillInput ||
          item.nameAr?.toLowerCase() === skillInput ||
          item.nameEn?.toLowerCase() === skillInput,
      );
      const course = await api<Course>('/api/teacher/courses', {
        body: {
          title: values.title,
          description: values.description.trim() || undefined,
          previewUrl: values.previewUrl.trim() || undefined,
          courseType: values.courseType,
          ...(academic
            ? {
                gradeId: grade?.id,
                gradeName: grade ? undefined : values.grade.trim(),
                semester: values.semester.trim() || undefined,
              }
            : {
                categoryId: skill?.id,
                categoryName: skill ? undefined : values.skill.trim(),
              }),
        },
      });
      let imageError: Error | null = null;
      if (imageFile) {
        let objectKey: string | undefined;
        try {
          const up = await api<PresignedUpload>('/api/storage/course-image', {
            body: {
              courseId: course.id,
              fileName: imageFile.name,
              mimeType: imageFile.type,
              fileSizeBytes: imageFile.size,
            },
          });
          objectKey = up.objectKey;
          const put = await fetch(up.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageFile.type },
            body: imageFile,
          });
          if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
          await api(`/api/teacher/courses/${course.id}`, {
            method: 'PATCH',
            body: { image: up.objectKey },
          });
        } catch (e) {
          await deleteUploadedObject(objectKey);
          imageError = e as Error;
        }
      }
      return { course, imageError };
    },
    onSuccess: ({ course, imageError }) => {
      if (imageError) toast.error(imageError.message || t('errorOccurred'));
      else toast.success(t('saved'));
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      void qc.invalidateQueries({ queryKey: teacherCoursesQuery.queryKey });
      void qc.invalidateQueries({ queryKey: teacherStatsQuery.queryKey });
      navigate({ to: '/teacher/courses/$courseId/groups', params: { courseId: course.id } });
    },
    onError: (error) => setFormError(error as Error),
  });

  const pickImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setFormError(new Error(t('imageTooLarge')));
      return;
    }
    setFormError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <Page
      title={t('newCourse')}
      right={<Link to="/teacher/dashboard" className="text-sm font-semibold text-primary">{t('backToCourses')}</Link>}
    >
      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))} noValidate>
          <Input
            label={t('courseTitle')}
            placeholder={t('courseTitlePlaceholder')}
            error={errors.title ? t('requiredField') : undefined}
            {...register('title')}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('courseDescription')}</span>
            <textarea
              className="w-full rounded-xl border border-line bg-white px-4 py-3"
              rows={4}
              maxLength={2000}
              {...register('description')}
            />
          </label>
          <Input
            label={t('previewUrl')}
            placeholder="https://"
            dir="ltr"
            error={errors.previewUrl ? t('invalidUrl') : undefined}
            {...register('previewUrl')}
          />
          <Select
            label={`${t('academic')} / ${t('general')}`}
            error={errors.courseType ? t('requiredField') : undefined}
            {...register('courseType')}
          >
            <option value="ACADEMIC">{t('academic')}</option>
            <option value="GENERAL">{t('general')}</option>
          </Select>

          {type === 'ACADEMIC' ? (
            <>
              <div key="academic-grade">
                <Input
                  label={t('grade')}
                  list="teacher-grades"
                  error={errors.grade ? t('requiredField') : undefined}
                  {...register('grade')}
                />
                <datalist id="teacher-grades">
                  {prioritizedGrades.map((gradeOption) => (
                    <option
                      key={gradeOption.id}
                      value={localizeName(gradeOption, lang)}
                      label={gradeOption.nameEn && gradeOption.nameAr ? `${gradeOption.nameAr} — ${gradeOption.nameEn}` : undefined}
                    />
                  ))}
                </datalist>
              </div>
              <div key="academic-semester">
                <Input
                  label={t('semester')}
                  list="teacher-semesters"
                  placeholder={t('semesterPlaceholder')}
                  {...register('semester')}
                />
                <datalist id="teacher-semesters">
                  {semesters?.map((semester) => <option key={semester.id} value={semester.name} />)}
                </datalist>
              </div>
            </>
          ) : (
            <div key="general-skill">
              <Input
                label={t('skill')}
                list="teacher-skills"
                placeholder={t('skillPlaceholder')}
                error={errors.skill ? t('requiredField') : undefined}
                {...register('skill')}
              />
              <datalist id="teacher-skills">
                {categories?.map((category) => (
                  <option
                    key={category.id}
                    value={localizeName(category, lang)}
                    label={category.nameEn && category.nameAr ? `${category.nameAr} — ${category.nameEn}` : undefined}
                  />
                ))}
              </datalist>
            </div>
          )}

          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('courseImage')}</span>
            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="mb-2 h-32 w-full rounded-xl border border-line object-cover"
              />
            )}
            <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
              {create.isPending ? '…' : t('uploadFile')}
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
          </div>

          {formError && <ErrorBox error={formError} />}
          <Button type="submit" disabled={create.isPending}>{t('save')}</Button>
        </form>
      </Card>
    </Page>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

export const teacherNewCourseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/courses/new',
  beforeLoad: () => requireRole('TEACHER'),
  component: NewCourse,
});
