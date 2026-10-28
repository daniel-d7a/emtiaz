import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Page, Select } from '../../components/ui';
import type { Course, TaxonomyItem } from '../../../../shared/api';
import { teacherCoursesQuery, teacherStatsQuery } from './Dashboard';

const schema = z
  .object({
    title: z.string().trim().min(1),
    courseType: z.enum(['ACADEMIC', 'GENERAL']),
    grade: z.string().trim(),
    semester: z.string().trim(),
    skill: z.string().trim(),
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
  const { t } = useLang();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<Error | null>(null);
  const { data: grades } = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/grades'),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/categories'),
  });
  const { data: semesters } = useQuery({
    queryKey: ['semesters-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/semesters'),
  });
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', courseType: 'ACADEMIC', grade: '', semester: '', skill: '' },
  });
  const type = watch('courseType');

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      const academic = values.courseType === 'ACADEMIC';
      const grade = grades?.find((item) => item.name.toLowerCase() === values.grade.trim().toLowerCase());
      const skill = categories?.find((item) => item.name.toLowerCase() === values.skill.trim().toLowerCase());
      return api<Course>('/api/teacher/courses', {
        body: {
          title: values.title,
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
    },
    onSuccess: (course) => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: teacherCoursesQuery.queryKey });
      void qc.invalidateQueries({ queryKey: teacherStatsQuery.queryKey });
      navigate({ to: '/teacher/courses/$courseId/groups', params: { courseId: course.id } });
    },
    onError: (error) => setFormError(error as Error),
  });

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
          <Select label={`${t('academic')} / ${t('general')}`} {...register('courseType')}>
            <option value="ACADEMIC">{t('academic')}</option>
            <option value="GENERAL">{t('general')}</option>
          </Select>

          {type === 'ACADEMIC' ? (
            <>
              <div>
                <Input
                  label={t('grade')}
                  list="teacher-grades"
                  error={errors.grade ? t('requiredField') : undefined}
                  {...register('grade')}
                />
                <datalist id="teacher-grades">
                  {grades?.map((gradeOption) => <option key={gradeOption.id} value={gradeOption.name} />)}
                </datalist>
              </div>
              <div>
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
            <div>
              <Input
                label={t('skill')}
                list="teacher-skills"
                placeholder={t('skillPlaceholder')}
                error={errors.skill ? t('requiredField') : undefined}
                {...register('skill')}
              />
              <datalist id="teacher-skills">
                {categories?.map((category) => <option key={category.id} value={category.name} />)}
              </datalist>
            </div>
          )}

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
