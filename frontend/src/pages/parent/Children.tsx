import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, FileText, GraduationCap, Link2, MessageSquare, RotateCcw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { api, parentApi } from '../../lib/api';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorBox, InfoHint, Input, Loading, Page, Progress } from '../../components/ui';
import { OnboardingGuide } from '../../components/OnboardingGuide';
import type { ParentChild as Child, ParentChildHomeworkDto, StudentGrades as Grades } from '../../../../shared/api';

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
    monitoringCode: z
      .string()
      .trim()
      .length(8, t('monitoringCodeInvalid')),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ monitoringCode: string }>({
    resolver: zodResolver(schema),
    defaultValues: { monitoringCode: '' },
  });
  const link = useMutation({
    mutationFn: (monitoringCode: string) =>
      api('/api/parent/link', { body: { monitoringCode: monitoringCode.trim().toUpperCase() } }),
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
      <OnboardingGuide
        role="PARENT"
        completedSteps={[
          (children.data?.length ?? 0) > 0,
          Boolean(children.data?.some((c) => c.groups.length > 0 || c.reports.length > 0)),
        ]}
      />
      <Card className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-bold">{t('linkChild')}</h2>
          <InfoHint title={t('hintParentLinkTitle')} hint={t('hintParentLinkBody')} />
        </div>
        <form
          onSubmit={handleSubmit(({ monitoringCode }) => link.mutate(monitoringCode.trim().toUpperCase()))}
          noValidate
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="grow">
              <Input
                label={t('studentMonitoringCode')}
                error={errors.monitoringCode?.message}
                placeholder={t('monitoringCodePlaceholder')}
                dir="ltr"
                maxLength={8}
                {...register('monitoringCode')}
              />
              <p className="mt-1 text-xs text-ink-soft">{t('studentMonitoringCodeHint')}</p>
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
                  variant="danger"
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
                          <Badge tone="primary" className="tabular-nums">{t('progress')}: {g.progress}%</Badge>
                          <Badge className="tabular-nums">{t('attendance')}: {g.attendance.percent}%</Badge>
                          <Badge tone="secondary" className="tabular-nums">{t('averageGrade')}: {g.averageGrade}%</Badge>
                          <Button variant="ghost" onClick={() => setOpen(open === key ? null : key)}>
                            {open === key ? t('hideGrades') : t('viewGrades')}
                          </Button>
                        </div>
                      </div>
                      <Progress value={g.progress} />
                      <p className="mt-1 text-xs text-ink-soft">
                        {t('progress')}: <span className="tabular-nums">{g.completedLessons}/{g.totalLessons}</span> {t('lessons')}
                      </p>
                      {open === key && <ChildGrades studentId={child.id} groupId={g.group.id} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <ChildHomeworkSection studentId={child.id} />
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
                <span className="font-semibold tabular-nums">{q.score}/{q.maxScore}</span>
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
                <span className="font-semibold tabular-nums">{m.score ?? '—'}/{m.maxScore}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ChildHomeworkSection({ studentId }: { studentId: string }) {
  const { t, lang } = useLang();
  const homework = useQuery({
    queryKey: ['parent-homework', studentId],
    queryFn: () => parentApi.getChildHomework(studentId),
  });

  return (
    <div data-testid={`child-homework-section-${studentId}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h3 className="text-sm font-bold">{t('childHomework')}</h3>
        </div>
        {homework.data && homework.data.length > 0 && (
          <span className="rounded-full bg-primary-light/60 px-2 py-0.5 text-xs font-bold text-primary-dark">
            {homework.data.length}
          </span>
        )}
      </div>

      {homework.isLoading ? (
        <Loading />
      ) : homework.error ? (
        <ErrorBox error={homework.error} />
      ) : !homework.data || homework.data.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('noChildHomework')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {homework.data.map((hw: ParentChildHomeworkDto) => {
            const sub = hw.submission;
            const isGraded = sub?.status === 'GRADED';
            const isRevisionRequested = sub?.status === 'REVISION_REQUESTED';
            const isLate = sub?.isLate;

            return (
              <div
                key={hw.id}
                data-testid={`parent-homework-item-${hw.id}`}
                className={`rounded-xl border p-3 text-sm transition-colors ${
                  hw.isUrgent
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-line bg-background/50'
                }`}
              >
                {/* Urgent warning pill */}
                {hw.isUrgent && (
                  <div
                    data-testid="urgent-homework-warning"
                    className="mb-2 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100/90 px-2.5 py-0.5 text-xs font-bold text-rose-800"
                  >
                    <AlertTriangle size={12} />
                    <span>{t('urgentHomeworkWarning')}</span>
                  </div>
                )}

                <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-medium text-ink-soft">{hw.groupName}</span>
                  <span className="rounded-md bg-line/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
                    {hw.maxScore} {t('points')}
                  </span>
                </div>

                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-bold text-ink">{hw.title}</h4>

                  {/* Status badge */}
                  <div>
                    {!sub ? (
                      <Badge tone="neutral">{t('notSubmitted')}</Badge>
                    ) : isGraded ? (
                      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                        <CheckCircle2 size={12} className="inline ltr:mr-1 rtl:ml-1" />
                        {t('gradedWithScore')} ({sub.score ?? 0}/{hw.maxScore})
                      </Badge>
                    ) : isRevisionRequested ? (
                      <Badge tone="danger">
                        <RotateCcw size={12} className="inline ltr:mr-1 rtl:ml-1" />
                        {t('revisionRequested')}
                      </Badge>
                    ) : isLate ? (
                      <Badge className="border-amber-300 bg-amber-50 text-amber-800 font-bold">
                        <AlertTriangle size={12} className="inline ltr:mr-1 rtl:ml-1" />
                        {t('submittedLate')}
                      </Badge>
                    ) : (
                      <Badge tone="primary">
                        <CheckCircle2 size={12} className="inline ltr:mr-1 rtl:ml-1" />
                        {t('submitted')}
                      </Badge>
                    )}
                  </div>
                </div>

                {hw.instructions && (
                  <p className="mb-2 whitespace-pre-wrap text-xs text-ink-soft leading-relaxed">
                    {hw.instructions}
                  </p>
                )}

                {/* Due date */}
                {hw.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-ink-soft">
                    <Clock size={12} />
                    <span>{t('dueDate')}:</span>
                    <span className="font-medium">{formatDateTime(hw.dueDate, lang)}</span>
                  </div>
                )}

                {/* Score if graded */}
                {isGraded && (
                  <p className="mt-1.5 text-xs font-bold text-emerald-700">
                    {t('earnedScore')}: {sub?.score ?? 0} {lang === 'ar' ? 'من' : 'out of'} {hw.maxScore}
                  </p>
                )}

                {/* Teacher feedback */}
                {sub?.teacherFeedback && (
                  <div className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900">
                    <div className="mb-1 flex items-center gap-1 font-bold text-amber-950">
                      <MessageSquare size={14} className="text-amber-700" />
                      <span>{t('teacherFeedback')}:</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{sub.teacherFeedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
