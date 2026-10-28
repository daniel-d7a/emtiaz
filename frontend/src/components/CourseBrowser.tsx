import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { localizeName, useLang } from '../lib/i18n';
import { Badge, Card, EmptyState, ErrorBox, FilterLayout, Input, Loading, Select } from './ui';
import { ThemeSurface } from './TeacherTheme';
import type { CourseCatalogue } from '../../../shared/api';

export function CourseBrowser() {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [courseType, setCourseType] = useState('');
  const [semester, setSemester] = useState('');

  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (teacherId) params.set('teacherId', teacherId);
  if (subjectId) params.set('subjectId', subjectId);
  if (gradeId) params.set('gradeId', gradeId);
  if (courseType) params.set('courseType', courseType);
  if (semester) params.set('semester', semester);
  const query = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-catalogue', query],
    queryFn: () => api<CourseCatalogue>(`/api/public/courses${query ? `?${query}` : ''}`),
  });

  const hasFilters = !!(search.trim() || teacherId || subjectId || gradeId || courseType || semester);
  const clear = () => {
    setSearch('');
    setTeacherId('');
    setSubjectId('');
    setGradeId('');
    setCourseType('');
    setSemester('');
  };

  return (
    <FilterLayout
      search={
        <div className="w-full sm:max-w-md">
          <Input
            label={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCoursesPlaceholder')}
          />
        </div>
      }
      filters={
        <>
          <Select label={t('teacher')} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">{t('all')}</option>
            {data?.filters.teachers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
          <Select label={t('specialization')} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">{t('all')}</option>
            {data?.filters.subjects.map((x) => <option key={x.id} value={x.id}>{localizeName(x.name, lang)}</option>)}
          </Select>
          <Select label={t('grade')} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
            <option value="">{t('all')}</option>
            {data?.filters.grades.map((x) => <option key={x.id} value={x.id}>{localizeName(x.name, lang)}</option>)}
          </Select>
          <Select label={t('courseType')} value={courseType} onChange={(e) => setCourseType(e.target.value)}>
            <option value="">{t('all')}</option>
            <option value="ACADEMIC">{t('academic')}</option>
            <option value="GENERAL">{t('general')}</option>
          </Select>
          <Select label={t('semester')} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">{t('all')}</option>
            {data?.filters.semesters.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="text-start text-sm font-semibold text-primary underline"
            >
              {t('clearFilters')}
            </button>
          )}
        </>
      }
    >
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data?.courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((c) => (
            <ThemeSurface key={c.id} theme={c.teacher.theme} className="h-full">
              <Link to="/t/$slug/courses/$courseId" params={{ slug: c.teacher.slug, courseId: c.id }} className="block h-full">
                <Card className="flex h-full flex-col overflow-hidden p-0 transition hover:border-primary">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-primary-light text-primary">
                      <BookOpen size={28} />
                    </div>
                  )}
                  <div className="flex grow flex-col p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={c.courseType === 'ACADEMIC' ? 'primary' : 'secondary'}>
                        {c.courseType === 'ACADEMIC' ? t('academic') : t('general')}
                      </Badge>
                      {c.semester && <span className="text-xs text-ink-soft">{c.semester}</span>}
                    </div>
                    <h3 className="text-lg font-bold">{c.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-primary">{c.teacher.name}</p>
                    <p className="text-xs text-ink-soft">
                      {[c.subject ? localizeName(c.subject, lang) : null, c.grade ? localizeName(c.grade, lang) : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    {c.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{c.description}</p>
                    )}
                  </div>
                </Card>
              </Link>
            </ThemeSurface>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('noCourseResults')}
          description={t('noCourseResultsHint')}
          icon={Search}
        />
      )}
    </FilterLayout>
  );
}
