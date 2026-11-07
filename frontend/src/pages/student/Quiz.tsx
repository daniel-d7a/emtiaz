import { useState } from 'react';
import { Link, createRoute, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, ErrorBox, Loading, Page } from '../../components/ui';
import { ThemeSurface } from '../../components/TeacherTheme';
import { studentCurriculumQuery } from './Group';
import type { QuizPayload, QuizSubmission } from '../../../../shared/api';

type LocalResult = QuizSubmission & { answers: Record<string, string> };

export default function StudentQuizPage() {
  const { groupId, quizId } = useParams({ from: '/student/groups/$groupId/quizzes/$quizId' });
  const { t } = useLang();
  const qc = useQueryClient();
  const curriculum = useQuery(studentCurriculumQuery(groupId));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<LocalResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['group-quiz', groupId, quizId],
    queryFn: () => api<QuizPayload>(`/api/student/groups/${groupId}/quizzes/${quizId}`),
  });

  const cleanAnswers = () =>
    Object.fromEntries(
      Object.entries(answers).filter(([, value]) => value.trim().length > 0),
    );

  const submit = useMutation({
    mutationFn: () =>
      api<QuizSubmission>(`/api/student/quizzes/${quizId}/submit`, {
        body: { groupId, answers: cleanAnswers() },
      }),
    onSuccess: (res) => {
      setResult({ ...res, answers: cleanAnswers() });
      toast.success(t('sent'));
      void qc.invalidateQueries({ queryKey: ['group-quiz', groupId, quizId] });
      void qc.invalidateQueries({ queryKey: ['curriculum', groupId] });
      void qc.invalidateQueries({ queryKey: ['grades', groupId] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });

  const shown = result ?? data?.attempt ?? null;
  const quiz = data?.quiz;

  return (
    <ThemeSurface theme={curriculum.data?.teacher.theme}>
      <Page title={quiz?.title ?? t('quiz')}>
        <div className="mb-5">
          <Link
            to="/student/groups/$groupId"
            params={{ groupId }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" /> {t('backToGroup')}
          </Link>
        </div>

        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data && quiz ? (
          shown ? (
            <div className="flex flex-col gap-4">
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 grow">
                    <h1 className="text-xl font-bold">{quiz.title}</h1>
                    <p className="text-sm text-ink-soft">{t('quizResult')}</p>
                  </div>
                  {shown.pending ? (
                    <Badge><Clock className="inline" size={14} /> {t('pending')}</Badge>
                  ) : (
                    <Badge tone="primary" className="tabular-nums">{shown.score}/{shown.maxScore}</Badge>
                  )}
                </div>
              </Card>

              {data.questions.map((q, i) => {
                const r = shown.result.find((x) => x.questionId === q.id);
                const given = shown.answers[q.id];
                const awaitingGrade = shown.pending && q.questionType === 'WRITTEN';
                return (
                  <Card key={q.id} className={r?.correct ? 'border-primary/40' : 'border-line'}>
                    <div className="mb-2 flex items-start gap-2">
                      {awaitingGrade ? (
                        <Clock size={18} className="mt-0.5 shrink-0 text-ink-soft" />
                      ) : r?.correct ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                      ) : (
                        <XCircle size={18} className="mt-0.5 shrink-0 text-secondary" />
                      )}
                      <p className="font-semibold">{i + 1}. {q.prompt}</p>
                    </div>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="" className="mb-3 max-h-64 rounded-xl border border-line object-contain" />
                    )}
                    <dl className="grid gap-1 text-sm">
                      <div className="flex flex-wrap gap-1">
                        <dt className="text-ink-soft">{t('yourAnswer')}:</dt>
                        <dd>{given ? formatAnswer(given, t) : t('notAnswered')}</dd>
                      </div>
                      {!awaitingGrade && (
                        <div className="flex flex-wrap gap-1">
                          <dt className="text-ink-soft">{q.questionType === 'WRITTEN' ? t('modelAnswer') : t('correctAnswer')}:</dt>
                          <dd className="font-semibold text-primary">{formatAnswer(r?.expected ?? '', t)}</dd>
                        </div>
                      )}
                      {r?.explanation && <p className="text-ink-soft">{r.explanation}</p>}
                    </dl>
                  </Card>
                );
              })}
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirming(true);
              }}
            >
              {data.questions.map((q, i) => (
                <Card key={q.id}>
                  <p className="mb-3 font-semibold">
                    {i + 1}. {q.prompt} <span className="text-sm font-normal text-ink-soft">({q.points})</span>
                  </p>
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" className="mb-3 max-h-64 rounded-xl border border-line object-contain" />
                  )}
                  {q.options ? (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={answers[q.id] === opt}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`min-h-12 w-full rounded-xl border px-4 py-3 text-start text-sm ${
                            answers[q.id] === opt
                              ? 'border-primary bg-primary-light font-semibold'
                              : 'border-line bg-white hover:border-primary'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : q.questionType === 'TRUE_FALSE' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {(['true', 'false'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={answers[q.id] === opt}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`min-h-12 rounded-xl border px-4 py-3 text-sm ${
                            answers[q.id] === opt
                              ? 'border-primary bg-primary-light font-semibold'
                              : 'border-line bg-white hover:border-primary'
                          }`}
                        >
                          {opt === 'true' ? `✓ ${t('trueLabel')}` : `✗ ${t('falseLabel')}`}
                        </button>
                      ))}
                    </div>
                  ) : q.questionType === 'WRITTEN' ? (
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      maxLength={5000}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="min-h-12 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  )}
                </Card>
              ))}
              {submit.error && <ErrorBox error={submit.error} />}
              <Button type="submit" disabled={submit.isPending}>
                {t('submit')}
              </Button>
            </form>
          )
        ) : <Loading />}

        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t('confirmSubmit')}
          description={t('confirmSubmitHint')}
          confirmLabel={t('submit')}
          cancelLabel={t('cancel')}
          onConfirm={() => submit.mutate()}
        />
      </Page>
    </ThemeSurface>
  );
}

function formatAnswer(value: string, t: (key: 'trueLabel' | 'falseLabel') => string) {
  if (value === 'true') return t('trueLabel');
  if (value === 'false') return t('falseLabel');
  return value;
}

export const studentQuizRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/groups/$groupId/quizzes/$quizId',
  beforeLoad: () => requireRole('STUDENT'),
  component: StudentQuizPage,
});

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
