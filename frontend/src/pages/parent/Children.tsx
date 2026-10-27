import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorBox, Input, Loading, Page, Progress } from '../../components/ui';
import type { ParentChild as Child, StudentGrades as Grades } from '../../../../shared/api';

export default function ParentChildren() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<Child | null>(null);

  const children = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api<Child[]>('/api/parent/students'),
  });
  const schema = z.object({
    phoneNumber: z.string().trim().min(8, t('phoneInvalid')).regex(/^[+\d\s()-]+$/, t('phoneInvalid')),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ phoneNumber: string }>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: '' },
  });
  const link = useMutation({
    mutationFn: (phoneNumber: string) => api('/api/parent/link', { body: { phoneNumber } }),
    onSuccess: () => {
      reset();
      toast.success(t('linked'));
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });
  const unlink = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/parent/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('unlinked'));
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });

  return (
    <Page title={t('myChildren')} right={<Badge>{t('readOnly')}</Badge>} wide>
      <Card className="mb-6">
        <form
          onSubmit={handleSubmit(({ phoneNumber }) => link.mutate(phoneNumber.trim()))}
          noValidate
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="grow">
              <Input
                label={t('studentPhone')}
                error={errors.phoneNumber?.message}
                placeholder={t('phoneExample')}
                dir="ltr"
                maxLength={20}
                {...register('phoneNumber')}
              />
              <p className="mt-1 text-xs text-ink-soft">{t('studentPhoneHint')}</p>
            </div>
            <Button type="submit" disabled={link.isPending}>
              <Link2 className="inline" size={18} /> {t('linkChild')}
            </Button>
          </div>
          {link.error && <div className="mt-2"><ErrorBox error={link.error} /></div>}
        </form>
      </Card>

      {unlink.error && <ErrorBox error={unlink.error} />}
      {children.isLoading ? <Loading /> : children.error ? <ErrorBox error={children.error} /> : (
        <div className="flex flex-col gap-4">
          {children.data?.map((child) => (
            <Card key={child.id}>
              <div className="mb-3 flex items-center gap-2 text-primary">
                <GraduationCap size={18} />
                <h2 className="grow text-lg font-bold">{child.name}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setUnlinkTarget(child)}
                >
                  <Unlink size={16} /> {t('unlinkChild')}
                </Button>
              </div>
              <p className="mb-4 text-sm text-ink-soft" dir="ltr">{child.email}{child.phoneNumber ? ` · ${child.phoneNumber}` : ''}</p>
              <div className="flex flex-col gap-3">
                {child.groups.map((g) => {
                  const key = `${child.id}:${g.group.id}`;
                  return (
                    <div key={key} className="rounded-xl border border-line p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{g.course.title}</p>
                          <p className="text-xs text-ink-soft">{g.group.name} · {g.teacher.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="primary">{t('progress')}: {g.progress}%</Badge>
                          <Badge>{t('attendance')}: {g.attendance.percent}%</Badge>
                          <Badge tone="secondary">{t('averageGrade')}: {g.averageGrade}%</Badge>
                          <Button variant="ghost" onClick={() => setOpen(open === key ? null : key)}>
                            {open === key ? t('hideGrades') : t('viewGrades')}
                          </Button>
                        </div>
                      </div>
                      <Progress value={g.progress} />
                      <p className="mt-1 text-xs text-ink-soft">
                        {t('progress')}: {g.completedLessons}/{g.totalLessons} {t('lessons')}
                      </p>
                      {open === key && <ChildGrades studentId={child.id} groupId={g.group.id} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="mb-2 text-sm font-bold">{t('deliveredReports')}</h3>
                {child.reports.length === 0 ? (
                  <p className="text-sm text-ink-soft">{t('noReports')}</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {child.reports.map((report) => (
                      <li key={report.id} className="rounded-lg bg-background p-2">
                        <p>{report.message}</p>
                        <p className="mt-1 text-xs text-ink-soft">{formatDateTime(report.createdAt, lang)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
          {children.data?.length === 0 && (
            <EmptyState
              title={t('noChildren')}
              description={t('linkChildHint')}
              icon={GraduationCap}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(unlinkTarget)}
        onOpenChange={(next) => !next && setUnlinkTarget(null)}
        title={`${t('unlinkChild')} ${unlinkTarget?.name ?? ''}?`}
        confirmLabel={t('unlinkChild')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => unlinkTarget && unlink.mutate(unlinkTarget.id)}
      />
    </Page>
  );
}

function ChildGrades({ studentId, groupId }: { studentId: string; groupId: string }) {
  const { t } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-grades', studentId, groupId],
    queryFn: () => api<Grades>(`/api/parent/students/${studentId}/groups/${groupId}/grades`),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-sm">
      <div>
        <p className="mb-1 font-semibold">{t('quiz')}</p>
        {data.quizzes.length === 0 ? <p className="text-ink-soft">—</p> : (
          <ul className="flex flex-col gap-1">
            {data.quizzes.map((q) => (
              <li key={q.quizId} className="flex justify-between gap-2">
                <span>{q.title}</span>
                <span className="font-semibold">{q.score}/{q.maxScore}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 font-semibold">{t('gradebook')}</p>
        {data.manual.length === 0 ? <p className="text-ink-soft">—</p> : (
          <ul className="flex flex-col gap-1">
            {data.manual.map((m) => (
              <li key={m.columnId} className="flex justify-between gap-2">
                <span>{m.title}</span>
                <span className="font-semibold">{m.score ?? '—'}/{m.maxScore}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';

export const parentChildrenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parent/children',
  beforeLoad: () => requireRole('PARENT'),
  component: ParentChildren,
});
