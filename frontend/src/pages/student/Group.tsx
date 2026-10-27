import { useState } from 'react';
import { Link, createRoute, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, CheckCircle2, Lock, NotebookPen, Paperclip, RotateCcw, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, ErrorBox, Loading, Page } from '../../components/ui';
import { ThemeHero, ThemeSurface } from '../../components/TeacherTheme';
import type {
  QuizPayload,
  QuizSubmission,
  StudentCurriculum as Curriculum,
  StudentGrades as Grades,
  StudentLesson,
} from '../../../../shared/api';

export default function StudentGroup() {
  const { groupId } = useParams({ from: '/student/groups/$groupId' });
  const { t } = useLang();
  const [tab, setTab] = useState<'lessons' | 'grades'>('lessons');

  const { data, isLoading, error } = useQuery(studentCurriculumQuery(groupId));
  const { data: grades } = useQuery({
    queryKey: ['grades', groupId],
    queryFn: () => api<Grades>(`/api/student/groups/${groupId}/grades`),
    enabled: tab === 'grades',
  });

  const ordered = data?.modules.flatMap((m) => m.lessons) ?? [];
  const currentLessonId = ordered.find((l) => l.unlocked && !l.completed)?.id ?? null;
  const currentModuleId = data?.modules.find((m) =>
    m.lessons.some((l) => l.id === currentLessonId),
  )?.id;
  const totalLessons = ordered.length;
  const doneLessons = ordered.filter((l) => l.completed).length;

  return (
    <ThemeSurface theme={data?.teacher.theme}>
      <Page
        title={data ? data.group.name : '…'}
        right={
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setTab('lessons')}
              className={`rounded-lg px-3 py-2 ${tab === 'lessons' ? 'bg-primary text-white' : 'border border-line'}`}
            >
              {t('lessons')}
            </button>
            <button
              onClick={() => setTab('grades')}
              className={`rounded-lg px-3 py-2 ${tab === 'grades' ? 'bg-primary text-white' : 'border border-line'}`}
            >
              {t('myGrades')}
            </button>
          </div>
        }
      >
        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data ? (
          <div className="flex min-w-0 flex-col gap-6">
            <ThemeHero
              theme={data.teacher.theme}
              bannerUrl={data.teacher.bannerUrl}
              name={data.teacher.name}
              subject={data.course.title}
            />

            <Card className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 grow">
                <h2 className="text-lg font-bold">{data.course.title}</h2>
                <p className="text-sm text-ink-soft">
                  {t('teacher')}:{' '}
                  {data.teacher.slug ? (
                    <Link to="/t/$slug" params={{ slug: data.teacher.slug }} className="font-semibold text-primary underline">
                      {data.teacher.name}
                    </Link>
                  ) : data.teacher.name}
                </p>
              </div>
              <Badge tone="primary">{doneLessons}/{totalLessons} {t('lessons')}</Badge>
              <Badge>{data.modules.length} {t('modules')}</Badge>
            </Card>

            {tab === 'lessons' && (
              <div className="flex min-w-0 flex-col gap-5">
                {data.modules.map((mod) => {
                  const isCurrent = mod.id === currentModuleId;
                  return (
                    <section
                      key={mod.id}
                      className={`min-w-0 rounded-2xl border p-4 ${isCurrent ? 'border-primary bg-primary-light/20' : 'border-line bg-surface'}`}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-secondary">{mod.title}</h2>
                        {isCurrent && <Badge tone="primary">{t('currentUnit')}</Badge>}
                        <Badge>{mod.lessons.length} {t('lessons')}</Badge>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        {mod.lessons.map((lesson) => (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            groupId={groupId}
                            current={lesson.id === currentLessonId}
                          />
                        ))}
                        {mod.quiz && (
                          <div className="mt-1">
                            <StudentQuiz quizId={mod.quiz.id} groupId={groupId} />
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}

                {data.quiz && (
                  <section className="min-w-0">
                    <h2 className="mb-3 text-lg font-bold text-secondary">{t('finalQuiz')}</h2>
                    <StudentQuiz quizId={data.quiz.id} groupId={groupId} />
                  </section>
                )}
              </div>
            )}

            {tab === 'grades' && grades && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Trophy size={18} className="text-secondary" /> {t('myGrades')}
                </h2>
                <Card>
                  {grades.quizzes.length === 0 && grades.manual.length === 0 && <p className="text-sm text-ink-soft">—</p>}
                  <ul className="flex flex-col divide-y divide-line">
                    {grades.quizzes.map((q) => (
                      <li key={q.quizId} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>{q.title} <span className="text-ink-soft">({q.lessonTitle})</span></span>
                        <span className="font-bold">{q.score}/{q.maxScore}</span>
                      </li>
                    ))}
                    {grades.manual.map((m) => (
                      <li key={m.columnId} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>{m.title}{m.note ? ` — ${m.note}` : ''}</span>
                        <span className="font-bold">{m.score ?? '—'}/{m.maxScore}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )}

            <p className="text-center">
              <Link to="/student/dashboard" className="text-sm text-primary underline">{t('home')}</Link>
            </p>
          </div>
        ) : <Loading />}
      </Page>
    </ThemeSurface>
  );
}

function LessonRow({ lesson, groupId, current }: { lesson: StudentLesson; groupId: string; current: boolean }) {
  const { t } = useLang();
  const body = (
    <Card className={`flex min-w-0 flex-wrap items-center gap-3 ${current ? 'border-primary' : ''} ${lesson.unlocked ? 'transition hover:border-primary' : 'opacity-60'}`}>
      <span className="flex min-w-0 grow items-center gap-2 font-semibold">
        {!lesson.unlocked ? (
          <Lock size={16} className="shrink-0 text-ink-soft" />
        ) : lesson.completed ? (
          <CheckCircle2 size={18} className="shrink-0 text-primary" />
        ) : (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
        )}
        <span className="truncate">{lesson.title}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {lesson.hasQuiz && <NotebookPen size={15} className="text-ink-soft" aria-label={t('quiz')} />}
        {lesson.attachments.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            <Paperclip size={14} /> {lesson.attachments.length}
          </span>
        )}
        {!lesson.unlocked ? (
          <Badge>{t('locked')}</Badge>
        ) : lesson.completed ? (
          <Badge tone="primary">{t('completed')}</Badge>
        ) : current ? (
          <Badge tone="primary">{t('current')}</Badge>
        ) : null}
        {lesson.unlocked && <ArrowRight size={16} className="shrink-0 text-ink-soft ltr:rotate-180 rtl:rotate-0" />}
      </span>
    </Card>
  );

  if (!lesson.unlocked) return body;
  return (
    <Link
      to="/student/groups/$groupId/lessons/$lessonId"
      params={{ groupId, lessonId: lesson.id }}
      className="block min-w-0"
    >
      {body}
    </Link>
  );
}

export function StudentQuiz({ lessonId, quizId, groupId }: { lessonId?: string; quizId?: string; groupId: string }) {
  const { t } = useLang();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId ?? lessonId],
    queryFn: () =>
      quizId
        ? api<QuizPayload>(`/api/student/groups/${groupId}/quizzes/${quizId}`)
        : api<QuizPayload>(`/api/student/lessons/${lessonId}/quiz`),
    enabled: !!(quizId || lessonId),
  });

  if (!quiz?.quiz?.id) return null;
  const quizData = quiz.quiz;

  const submit = async () => {
    setError(null);
    try {
      const res = await api<QuizSubmission>(`/api/student/quizzes/${quizData.id}/submit`, {
        body: { groupId, answers },
      });
      setResult(res);
      toast.success(t('sent'));
    } catch (e) {
      setError(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    }
  };

  return (
    <Card className="border-primary/30 bg-primary-light/30">
      <h3 className="mb-3 font-bold">{t('quiz')}: {quizData.title}</h3>
      {isLoading && <Loading />}
      {!result && (
        <div className="flex flex-col gap-4">
          {quiz.questions.map((q, i) => (
            <div key={q.id}>
              <p className="mb-2 text-sm font-semibold">
                {i + 1}. {q.prompt} <span className="text-ink-soft">({q.points})</span>
              </p>
              {q.options ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`rounded-lg border px-3 py-2 text-sm ${answers[q.id] === opt ? 'border-primary bg-primary-light font-semibold' : 'border-line bg-white'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : q.questionType === 'TRUE_FALSE' ? (
                <div className="flex gap-2">
                  {['true', 'false'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`rounded-lg border px-4 py-2 text-sm ${answers[q.id] === opt ? 'border-primary bg-primary-light font-semibold' : 'border-line bg-white'}`}
                    >
                      {opt === 'true' ? '✓ ' : '✗ '}{opt === 'true' ? t('trueLabel') : t('falseLabel')}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
          {error && <ErrorBox error={error} />}
          <Button variant="secondary" onClick={() => void submit()}>
            {t('submit')}
          </Button>
        </div>
      )}
      {result && (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-lg font-bold text-primary">
            {t('yourScore')}: {result.score}/{result.maxScore}
          </p>
          {result.result.map((r, i) => (
            <div key={r.questionId}>
              <span className={r.correct ? 'font-semibold text-primary' : 'font-semibold text-secondary'}>
                {r.correct ? '✓' : '✗'} {i + 1}
              </span>
              <span className="text-ink-soft"> — {r.expected === 'true' ? t('trueLabel') : r.expected === 'false' ? t('falseLabel') : r.expected}{r.explanation ? `: ${r.explanation}` : ''}</span>
            </div>
          ))}
          <Button variant="ghost" aria-label={t('retry')} title={t('retry')} onClick={() => { setResult(null); setAnswers({}); }}><RotateCcw size={18} /></Button>
        </div>
      )}
    </Card>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const studentCurriculumQuery = (groupId: string) => ({
  queryKey: ['curriculum', groupId] as const,
  queryFn: () => api<Curriculum>(`/api/student/groups/${groupId}/curriculum`),
});

export const studentGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/groups/$groupId',
  beforeLoad: () => requireRole('STUDENT'),
  loader: ({ params }) => queryClient.ensureQueryData(studentCurriculumQuery(params.groupId)),
  component: StudentGroup,
});
