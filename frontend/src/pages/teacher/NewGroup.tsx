import { useState } from 'react';
import { Link, createRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getWeekdayOptions, serializeDays, useLang, type WeekdayKey } from '../../lib/i18n';
import { normalizePhone } from '../../lib/phone';
import { Button, Card, ErrorBox, Input, Page } from '../../components/ui';
import type { Group } from '../../../../shared/api';
import { teacherCoursesQuery } from './Dashboard';
import { requireRole } from '../../lib/session';
import { rootRoute } from '../../routes/__root';

type StudentRow = { name: string; phone: string };

export default function NewGroup() {
  const { courseId } = useParams({ from: '/teacher/courses/$courseId/groups/new' });
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [days, setDays] = useState<WeekdayKey[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([{ name: '', phone: '' }]);
  const [error, setError] = useState<Error | null>(null);

  const dayOptions = getWeekdayOptions(lang);

  const toggleDay = (day: WeekdayKey) =>
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );

  const updateStudent = (index: number, patch: Partial<StudentRow>) =>
    setStudents((current) =>
      current.map((student, i) => (i === index ? { ...student, ...patch } : student)),
    );

  const create = useMutation({
    mutationFn: async () => {
      const rows = students.filter((student) => student.name.trim() || student.phone.trim());
      const invalid = rows.find(
        (student) =>
          !student.name.trim() ||
          normalizePhone(student.phone).replace(/\D/g, '').length < 8,
      );
      if (invalid) throw new Error(t('phoneInvalid'));
      return api<Group>(`/api/teacher/courses/${courseId}/groups`, {
        body: {
          name,
          time: time.trim() || null,
          days: serializeDays(days),
          students: rows.map((student) => ({
            name: student.name.trim(),
            phoneNumber: normalizePhone(student.phone),
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: teacherCoursesQuery.queryKey });
      navigate({ to: '/teacher/courses/$courseId/groups', params: { courseId } });
    },
    onError: (e) => setError(e as Error),
  });

  return (
    <Page
      title={t('newGroup')}
      right={
        <Link
          to="/teacher/courses/$courseId/groups"
          params={{ courseId }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" /> {t('cancel')}
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('newGroup')} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t('time')} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">{t('groupNameFallback')}</p>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-ink-soft">{t('days')}</legend>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <label
                  key={day.value}
                  className={`flex min-h-10 cursor-pointer items-center rounded-xl border px-3 text-sm font-semibold ${
                    days.includes(day.value)
                      ? 'border-primary bg-primary-light text-primary-dark'
                      : 'border-line text-ink-soft'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={days.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{t('students')}</h2>
            <Button
              variant="ghost"
              className="!min-h-9 !px-3"
              onClick={() => setStudents((current) => [...current, { name: '', phone: '' }])}
            >
              <Plus className="inline" size={16} /> {t('addStudent')}
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {students.map((student, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input
                  label={t('name')}
                  value={student.name}
                  onChange={(e) => updateStudent(index, { name: e.target.value })}
                />
                <Input
                  label={t('phone')}
                  value={student.phone}
                  onChange={(e) => updateStudent(index, { phone: e.target.value })}
                  dir="ltr"
                  placeholder="+968 9xxx xxxx"
                />
                <Button
                  variant="ghost"
                  className="!min-h-10 !px-3"
                  onClick={() => setStudents((current) => current.filter((_, i) => i !== index))}
                  disabled={students.length === 1}
                  aria-label={t('delete')}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">{t('studentPhoneHint')}</p>
        </Card>

        {error && <ErrorBox error={error} />}
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {t('save')}
        </Button>
      </div>
    </Page>
  );
}

export const teacherNewGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/courses/$courseId/groups/new',
  beforeLoad: () => requireRole('TEACHER'),
  component: NewGroup,
});
