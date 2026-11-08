import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { teacherApi } from '../../lib/api';
import { isSafeHttpUrl, submissionFileUrl } from '../../lib/attachment';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Badge, Button, Card, Dialog, ErrorBox, Input, Loading } from '../../components/ui';
import type {
  HomeworkDto,
  HomeworkRosterSummaryDto,
  HomeworkSubmissionDto,
  PacingLesson,
} from '../../../../shared/api';

export function HomeworkPacingSection({
  groupId,
  lessons,
  onOpenSubmissions,
}: {
  groupId: string;
  lessons: Array<{ id: string; title: string }>;
  onOpenSubmissions: (hw: { id: string; title: string; maxScore: number }) => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();

  const { data: homeworkList = [], isLoading, error } = useQuery({
    queryKey: ['group-homework', groupId],
    queryFn: async () => {
      if (!lessons.length) return [];
      const nested = await Promise.all(
        lessons.map((lesson) => teacherApi.getLessonHomework(lesson.id, groupId)),
      );
      return nested.flat();
    },
    enabled: lessons.length > 0,
  });

  const setAccess = useMutation({
    mutationFn: ({
      homeworkId,
      dueDate,
      isHidden,
    }: {
      homeworkId: string;
      dueDate?: string | null;
      isHidden?: boolean;
    }) =>
      teacherApi.setGroupHomeworkAccess(groupId, homeworkId, {
        dueDate,
        isHidden,
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['group-homework', groupId] });
      void qc.invalidateQueries({ queryKey: ['gradebook', groupId] });
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  const lessonTitleMap = new Map(lessons.map((l) => [l.id, l.title]));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{t('homeworkList')}</h3>
      </div>

      {isLoading ? (
        <div className="mt-3"><Loading /></div>
      ) : error ? (
        <div className="mt-3"><ErrorBox error={error} /></div>
      ) : homeworkList.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{t('noHomeworkInGroup')}</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {homeworkList.map((hw) => {
            const dateValue = hw.dueDate ? hw.dueDate.slice(0, 10) : '';
            return (
              <li key={hw.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <BookOpen size={16} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <span className={`block font-semibold ${hw.isHidden ? 'text-ink-soft line-through' : ''}`}>
                      {hw.title}
                      {hw.isHidden && (
                        <span className="ms-2 rounded bg-line px-1.5 py-0.5 text-xs no-underline">
                          {t('hidden')}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {lessonTitleMap.get(hw.lessonId) ?? ''} · {hw.maxScore} {t('points')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar size={14} className="text-ink-soft" />
                    <input
                      type="date"
                      aria-label={`${t('dueDate')}: ${hw.title}`}
                      value={dateValue}
                      disabled={setAccess.isPending}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccess.mutate({
                          homeworkId: hw.id,
                          dueDate: val ? new Date(val).toISOString() : null,
                          isHidden: hw.isHidden,
                        });
                      }}
                      className="rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-primary disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAccess.mutate({
                        homeworkId: hw.id,
                        isHidden: !hw.isHidden,
                        dueDate: hw.dueDate,
                      })
                    }
                    disabled={setAccess.isPending}
                    className="flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {hw.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {hw.isHidden ? t('show') : t('hide')}
                  </button>

                  <Button
                    variant="ghost"
                    className="!min-h-8 !px-3 text-xs"
                    onClick={() =>
                      onOpenSubmissions({
                        id: hw.id,
                        title: hw.title,
                        maxScore: hw.maxScore,
                      })
                    }
                  >
                    {t('submissions')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function HomeworkSubmissionsDialog({
  groupId,
  homeworkId,
  title,
  maxScore,
  onClose,
}: {
  groupId: string;
  homeworkId: string;
  title: string;
  maxScore: number;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [gradingTarget, setGradingTarget] = useState<HomeworkRosterSummaryDto['submissions'][number] | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['homework-submissions', groupId, homeworkId],
    queryFn: () => teacherApi.getHomeworkSubmissions(groupId, homeworkId),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['homework-submissions', groupId, homeworkId] });
    void qc.invalidateQueries({ queryKey: ['gradebook', groupId] });
    void qc.invalidateQueries({ queryKey: ['group-homework', groupId] });
  };

  const statusBadge = (sub: HomeworkSubmissionDto | null) => {
    if (!sub) {
      return <Badge className="bg-line text-ink-soft">{t('notSubmitted')}</Badge>;
    }
    if (sub.status === 'GRADED') {
      return <Badge className="bg-emerald-100 text-emerald-800">{t('graded')}</Badge>;
    }
    if (sub.status === 'REVISION_REQUESTED') {
      return <Badge className="bg-amber-100 text-amber-800">{t('revisionRequested')}</Badge>;
    }
    return <Badge className="bg-primary-light text-primary-dark">{t('submitted')}</Badge>;
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => !next && onClose()}
        title={`${t('homeworkSubmissions')}: ${title}`}
        className="!max-w-4xl"
      >
        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {isLoading ? (
            <Loading />
          ) : error ? (
            <ErrorBox error={error} />
          ) : !data ? null : (
            <>
              {/* Aggregate Statistics Pills */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('totalEnrolled')}</span>
                  <span className="text-base font-bold tabular-nums">{data.stats.totalEnrolled}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('submitted')}</span>
                  <span className="text-base font-bold tabular-nums text-primary">{data.stats.submitted}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('graded')}</span>
                  <span className="text-base font-bold tabular-nums text-emerald-700">{data.stats.graded}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('pendingReview')}</span>
                  <span className="text-base font-bold tabular-nums text-blue-700">{data.stats.pendingReview}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('revisionRequested')}</span>
                  <span className="text-base font-bold tabular-nums text-amber-700">{data.stats.revisionRequested}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('notSubmitted')}</span>
                  <span className="text-base font-bold tabular-nums text-ink-soft">{data.stats.notSubmitted}</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-2 text-center">
                  <span className="block text-xs font-semibold text-ink-soft">{t('late')}</span>
                  <span className="text-base font-bold tabular-nums text-danger">{data.stats.late}</span>
                </div>
              </div>

              {/* Student Roster Table */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-xs font-bold text-ink-soft">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('student')}</th>
                      <th className="px-3 py-2 text-start">{t('submissionDate')}</th>
                      <th className="px-3 py-2 text-center">{t('status')}</th>
                      <th className="px-3 py-2 text-end">{t('points')}</th>
                      <th className="px-3 py-2 text-end">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {data.submissions.map((item) => {
                      const sub = item.submission;
                      return (
                        <tr key={item.studentId} className="hover:bg-primary-light/10">
                          <td className="px-3 py-2.5 font-semibold text-ink">
                            {item.studentName}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-ink-soft">
                            {sub ? (
                              <div className="flex flex-col gap-0.5">
                                <span>{formatDateTime(sub.submittedAt, lang)}</span>
                                {sub.isLate && (
                                  <span className="inline-flex items-center gap-1 font-bold text-danger">
                                    <Clock size={12} /> {t('late')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {statusBadge(sub)}
                          </td>
                          <td className="px-3 py-2.5 text-end font-bold tabular-nums">
                            {sub?.score !== null && sub?.score !== undefined
                              ? `${sub.score} / ${data.homework.maxScore ?? maxScore}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-end">
                            {sub ? (
                              <Button
                                variant="ghost"
                                className="!min-h-8 !px-2.5 text-xs"
                                onClick={() => setGradingTarget(item)}
                              >
                                {t('gradeAndReview')}
                              </Button>
                            ) : (
                              <span className="text-xs text-ink-soft">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Interactive Grading Drawer / Modal */}
      {gradingTarget?.submission && (
        <GradingDrawerModal
          groupId={groupId}
          homeworkId={homeworkId}
          maxScore={data?.homework.maxScore ?? maxScore}
          studentName={gradingTarget.studentName}
          submission={gradingTarget.submission}
          onClose={() => setGradingTarget(null)}
          onSuccess={() => {
            setGradingTarget(null);
            invalidate();
          }}
        />
      )}
    </>
  );
}

export function GradingDrawerModal({
  groupId,
  homeworkId,
  maxScore,
  studentName,
  submission,
  onClose,
  onSuccess,
}: {
  groupId: string;
  homeworkId: string;
  maxScore: number;
  studentName: string;
  submission: HomeworkSubmissionDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, lang } = useLang();
  const [score, setScore] = useState<string>(
    submission.score !== null && submission.score !== undefined ? String(submission.score) : '',
  );
  const [feedback, setFeedback] = useState<string>(submission.teacherFeedback ?? '');
  const [err, setErr] = useState<Error | null>(null);

  const gradeMutation = useMutation({
    mutationFn: (dto: { score?: number | null; teacherFeedback?: string | null; action: 'SAVE_GRADE' | 'REQUEST_REVISION' }) =>
      teacherApi.gradeHomeworkSubmission(groupId, homeworkId, submission.studentId, dto),
    onSuccess: () => {
      toast.success(t('saved'));
      onSuccess();
    },
    onError: (e) => {
      const error = e as Error;
      setErr(error);
      toast.error(error.message || t('errorOccurred'));
    },
  });

  const handleSaveGrade = () => {
    setErr(null);
    const parsedScore = Number(score);
    if (score.trim() === '' || isNaN(parsedScore) || !Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > maxScore) {
      setErr(new Error(t('scoreInvalid')));
      return;
    }
    gradeMutation.mutate({
      action: 'SAVE_GRADE',
      score: parsedScore,
      teacherFeedback: feedback.trim() || undefined,
    });
  };

  const handleRequestRevision = () => {
    setErr(null);
    if (!feedback.trim()) {
      setErr(new Error(t('feedbackRequiredForRevision')));
      return;
    }
    gradeMutation.mutate({
      action: 'REQUEST_REVISION',
      teacherFeedback: feedback.trim(),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${t('gradeAndReview')}: ${studentName}`}
      className="!max-w-2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose} disabled={gradeMutation.isPending}>
            {t('cancel')}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={handleRequestRevision}
              disabled={gradeMutation.isPending}
              className="!border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <RotateCcw className="inline" size={14} /> {t('requestRevision')}
            </Button>
            <Button onClick={handleSaveGrade} disabled={gradeMutation.isPending}>
              <CheckCircle2 className="inline" size={14} /> {t('saveGrade')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Submission Meta Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-ink-soft" />
            <span>
              {t('submittedAt')}: {formatDateTime(submission.submittedAt, lang)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {submission.isLate && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle size={12} className="inline me-1" /> {t('late')}
              </Badge>
            )}
            {submission.revisionCount > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                {t('revisionCount')}: {submission.revisionCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Student Submitted Content Display */}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
          <span className="text-sm font-bold text-ink">{t('studentSubmissionContent')}</span>

          {submission.content && (
            <div className="rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {submission.content}
            </div>
          )}

          {submission.url && (
            <div className="mt-1">
              {isSafeHttpUrl(submission.url) ? (
                <a
                  href={submission.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-light/40"
                >
                  <Link2 size={16} />
                  <span>{t('openStudentLink')}</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-soft">
                  <Link2 size={16} />
                  <span className="truncate font-mono text-xs">{submission.url}</span>
                </span>
              )}
            </div>
          )}

          {submission.r2ObjectKey && (
            <div className="mt-1">
              <a
                href={submissionFileUrl(submission)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-light/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-light/40"
              >
                <Download size={16} />
                <span>
                  {t('downloadStudentFile')} ({submission.mimeType ?? submission.attachmentType})
                </span>
              </a>
            </div>
          )}

          {!submission.content && !submission.url && !submission.r2ObjectKey && (
            <p className="text-xs text-ink-soft">—</p>
          )}
        </div>

        {/* Score Input */}
        <div>
          <Input
            label={`${t('points')} (0 - ${maxScore})`}
            type="number"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder={`0 - ${maxScore}`}
            autoFocus
          />
        </div>

        {/* Teacher Feedback Textarea */}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-soft">
            {t('teacherFeedback')}
          </span>
          <textarea
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
          />
        </label>

        {err && <ErrorBox error={err} />}
      </div>
    </Dialog>
  );
}
