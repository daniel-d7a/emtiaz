import { useState } from 'react';
import { Link, createRoute, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Download, FileDown, Lock, NotebookPen, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Loading, Page } from '../../components/ui';

type Curriculum = {
  course: { title: string };
  group: { name: string; joinCode: string };
  modules: Array<{
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      content: string | null;
      unlocked: boolean;
      completed: boolean;
      hasQuiz: boolean;
      attachments: Array<{ id: string; title: string; fileType: string }>;
    }>;
  }>;
};

type Quiz = {
  quiz: { id: string; title: string };
  questions: Array<{ id: string; questionType: string; prompt: string; options: string[] | null; points: number }>;
};

type Grades = {
  quizzes: Array<{ quizId: string; title: string; lessonTitle: string; score: number; maxScore: number }>;
  manual: Array<{ columnId: string; title: string; maxScore: number; score: number | null; note: string | null }>;
};

export default function StudentGroup() {
  const { groupId } = useParams({ from: '/student/groups/$groupId' });
  const { t } = useLang();
  const qc = useQueryClient();
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [tab, setTab] = useState<'lessons' | 'grades'>('lessons');

  const { data, isLoading, error } = useQuery(studentCurriculumQuery(groupId));
  const { data: grades } = useQuery({
    queryKey: ['grades', groupId],
    queryFn: () => api<Grades>(`/api/student/groups/${groupId}/grades`),
    enabled: tab === 'grades',
  });

  const complete = useMutation({
    mutationFn: (lessonId: string) => api(`/api/student/lessons/${lessonId}/complete`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['curriculum', groupId] }),
  });

  return (
    <Page
      title={data ? data.group.name : '…'}
      right={
        <div className="flex gap-2 text-sm">
          <button onClick={() => setTab('lessons')} className={`rounded-lg px-3 py-2 ${tab === 'lessons' ? 'bg-primary text-white' : 'border border-line'}`}>{t('lessons')}</button>
          <button onClick={() => setTab('grades')} className={`rounded-lg px-3 py-2 ${tab === 'grades' ? 'bg-primary text-white' : 'border border-line'}`}>{t('myGrades')}</button>
        </div>
      }
    >
      {isLoading ? <Loading /> : error ? (
        <ErrorBox error={error} />
      ) : data ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-ink-soft">{data.course.title}</p>
          {/* lesson modules only on the lessons tab */}
      {tab === 'lessons' && data.modules.map((mod) => (
            <section key={mod.title}>
              <h2 className="mb-3 text-lg font-bold text-secondary">{mod.title}</h2>
              <div className="flex flex-col gap-2">
                {mod.lessons.map((l) => (
                  <div key={l.id}>
                    {l.unlocked ? (
                      <Card>
                        <button className="flex w-full items-center justify-between text-start" onClick={() => setOpenLesson(openLesson === l.id ? null : l.id)}>
                          <span className="flex items-center gap-2 font-semibold">
                            {l.completed && <CheckCircle2 size={18} className="text-primary" />}
                            {l.title}
                            {l.hasQuiz && <NotebookPen size={14} className="text-ink-soft" />}
                          </span>
                          <ArrowRight size={16} className="text-ink-soft ltr:rotate-180 rtl:rotate-0" />
                        </button>
                        {openLesson === l.id && (
                          <div className="mt-4 border-t border-line pt-4">
                            {l.content && <p className="mb-3 whitespace-pre-wrap text-sm text-ink-soft">{l.content}</p>}
                            {l.attachments.length > 0 && (
                              <ul className="mb-3 flex flex-col gap-2">
                                {l.attachments.map((a) => <AttachmentRow key={a.id} id={a.id} title={a.title} />)}
                              </ul>
                            )}
                            {l.hasQuiz && <StudentQuiz lessonId={l.id} groupId={groupId} />}
                            <div className="mt-3">
                              {l.completed ? (
                                <span className="text-sm font-semibold text-primary">✓ {t('completed')}</span>
                              ) : (
                                <Button variant="ghost" onClick={() => complete.mutate(l.id)}>{t('markComplete')}</Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ) : (
                      <Card className="opacity-60">
                        <span className="flex items-center gap-2 font-semibold text-ink-soft">
                          <Lock size={16} /> {l.title}
                        </span>
                        <p className="text-xs text-ink-soft">{t('locked')}</p>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : <Loading />}
      {grades && tab === 'grades' && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Trophy size={18} className="text-secondary" /> {t('myGrades')}
          </h2>
          <Card>
            {grades.quizzes.length === 0 && grades.manual.length === 0 && <p className="text-sm text-ink-soft">—</p>}
            <ul className="flex flex-col divide-y divide-line">
              {grades.quizzes.map((q) => (
                <li key={q.quizId} className="flex items-center justify-between py-2 text-sm">
                  <span>{q.title} <span className="text-ink-soft">({q.lessonTitle})</span></span>
                  <span className="font-bold">{q.score}/{q.maxScore}</span>
                </li>
              ))}
              {grades.manual.map((m) => (
                <li key={m.columnId} className="flex items-center justify-between py-2 text-sm">
                  <span>{m.title}{m.note ? ` — ${m.note}` : ''}</span>
                  <span className="font-bold">{m.score ?? '—'}/{m.maxScore}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
      <p className="mt-8 text-center">
        <Link to="/student/dashboard" className="text-sm text-primary underline">{t('myCourses')}</Link>
      </p>
    </Page>
  );
}

function AttachmentRow({ id, title }: { id: string; title: string }) {
  const { t } = useLang();
  const [url, setUrl] = useState<string | null>(null);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm">
      <FileDown size={16} className="text-ink-soft" />
      <span className="grow">{title}</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
          <Download size={16} className="inline" />
        </a>
      ) : (
        <Button
          variant="ghost"
          className="!min-h-9 !px-3 !py-1 text-xs"
          onClick={() => api(`/api/storage/attachments/${id}/download`).then((d: any) => setUrl(d.url))}
        >
          {t('download')}
        </Button>
      )}
    </li>
  );
}

export function StudentQuiz({ lessonId, groupId }: { lessonId: string; groupId: string }) {
  const { t } = useLang();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => api<any>(`/api/student/lessons/${lessonId}/quiz`),
  });

  if (!quiz?.quiz?.id) return null;

  const submit = async () => {
    setError(null);
    try {
      const res = await api(`/api/student/quizzes/${quiz.quiz.id}/submit`, {
        body: { groupId, answers },
      });
      setResult(res);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary-light/30">
      <h3 className="mb-3 font-bold">{t('quiz')}: {quiz.quiz.title}</h3>
      {isLoading && <Loading />}
      {!result && (
        <div className="flex flex-col gap-4">
          {quiz.questions?.map((q: any, i: number) => (
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
                      {opt === 'true' ? '✓' : '✗'}
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
          {result.result.map((r: any, i: number) => (
            <div key={r.questionId}>
              <span className={r.correct ? 'font-semibold text-primary' : 'font-semibold text-secondary'}>
                {r.correct ? '✓' : '✗'} {i + 1}
              </span>
              <span className="text-ink-soft"> — {r.expected}{r.explanation ? `: ${r.explanation}` : ''}</span>
            </div>
          ))}
          <Button variant="ghost" onClick={() => { setResult(null); setAnswers({}); }}>↺</Button>
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
