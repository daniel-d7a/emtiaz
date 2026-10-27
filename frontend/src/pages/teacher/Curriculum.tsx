import { useState } from 'react';
import { createRoute, useLocation, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileUp, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, ErrorBox, Input, Loading, Page } from '../../components/ui';

type Question = {
  questionType: 'MCQ' | 'TRUE_FALSE';
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
};
type QuizData = { id: string; title: string; questions: unknown[] } | null;
type Curriculum = {
  quiz: QuizData;
  modules: Array<{
    id: string;
    title: string;
    quiz: QuizData;
    lessons: Array<{
      id: string;
      title: string;
      content: string | null;
      quiz: QuizData;
      attachments: Array<{ id: string; title: string }>;
    }>;
  }>;
};

function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function TeacherCurriculum() {
  const { courseId } = useParams({ from: '/teacher/courses/$courseId/curriculum' });
  const { t } = useLang();
  const qc = useQueryClient();
  const location = useLocation() as { state?: { lessonId?: string } };

  const { data, isLoading, error } = useQuery(teacherCurriculumQuery(courseId));

  const [moduleName, setModuleName] = useState('');
  const addModule = useMutation({
    mutationFn: () => api(`/api/teacher/courses/${courseId}/modules`, { body: { title: moduleName } }),
    onSuccess: () => {
      setModuleName('');
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
    },
  });

  return (
    <Page title={t('curriculum')}>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="flex flex-col gap-6">
          {data && <QuizBuilder endpoint={`/api/teacher/courses/${courseId}/quiz`} existing={data.quiz} />}
          {data?.modules.map((mod, mi) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              courseId={courseId}
              focusLessonId={location.state?.lessonId}
              canUp={mi > 0}
              canDown={mi < data.modules.length - 1}
              onMoveModule={(dir) =>
                api(`/api/teacher/courses/${courseId}/modules/reorder`, {
                  body: { moduleIds: swap(data.modules.map((m) => m.id), mi, dir) },
                }).then(() => qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] }))
              }
            />
          ))}

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grow">
                <Input label={t('newModule')} value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder={t('modules')} />
              </div>
              <Button onClick={() => addModule.mutate()} disabled={!moduleName}>
                <Plus className="inline" size={18} /> {t('add')}
              </Button>
            </div>
            {addModule.error && <ErrorBox error={addModule.error} />}
          </Card>
        </div>
      )}
    </Page>
  );
}

function ModuleCard({ mod, courseId, focusLessonId, canUp, canDown, onMoveModule }: {
  mod: Curriculum['modules'][0];
  courseId: string;
  focusLessonId?: string;
  canUp: boolean;
  canDown: boolean;
  onMoveModule?: (dir: -1 | 1) => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [lessonTitle, setLessonTitle] = useState('');
  const [confirming, setConfirming] = useState(false);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const addLesson = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}/lessons`, { body: { title: lessonTitle } }),
    onSuccess: () => {
      setLessonTitle('');
      toast.success(t('saved'));
      invalidate();
    },
  });
  const delModule = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex grow items-center gap-2">
          {(canUp || canDown) && (
            <span className="flex flex-col gap-0">
              <button aria-label={t('moveUp')} title={t('moveUp')} disabled={!canUp} onClick={() => onMoveModule?.(-1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
              <button aria-label={t('moveDown')} title={t('moveDown')} disabled={!canDown} onClick={() => onMoveModule?.(1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
            </span>
          )}
          <button aria-expanded={open} aria-label={open ? t('collapse') : t('expand')} title={open ? t('collapse') : t('expand')} className="flex grow items-center gap-2 text-start text-lg font-bold" onClick={() => setOpen(!open)}>
            <ChevronDown className={`transition ${open ? '' : 'ltr:-rotate-90 rtl:rotate-90'}`} size={18} />
            {mod.title}
          </button>
        </div>
        <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="text-ink-soft hover:text-secondary" title={t('delete')}>
          <Trash2 size={16} />
        </button>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {mod.lessons.map((l, li) => (
            <LessonEditor
              key={l.id}
              lesson={l}
              courseId={courseId}
              autoFocus={l.id === focusLessonId}
              canUp={li > 0}
              canDown={li < mod.lessons.length - 1}
              onMove={(dir) =>
                api(`/api/teacher/modules/${mod.id}/lessons/reorder`, {
                  body: { lessonIds: swap(mod.lessons.map((x) => x.id), li, dir) },
                }).then(invalidate)
              }
            />
          ))}
          <div className="flex gap-2">
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder={t('newLesson')} label={t('newLesson')} />
            <Button onClick={() => addLesson.mutate()} disabled={!lessonTitle} className="self-end">
              <Plus className="inline" size={18} /> {t('add')}
            </Button>
          </div>
          {addLesson.error && <ErrorBox error={addLesson.error} />}
          <QuizBuilder endpoint={`/api/teacher/modules/${mod.id}/quiz`} existing={mod.quiz} />
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`${t('delete')} ${mod.title}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => delModule.mutate()}
      />
    </Card>
  );
}

function LessonEditor({ lesson, courseId, autoFocus, canUp, canDown, onMove }: {
  lesson: Curriculum['modules'][0]['lessons'][0];
  courseId: string;
  autoFocus?: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(!!autoFocus);
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content ?? '');
  const [confirming, setConfirming] = useState(false);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
  const save = useMutation({
    mutationFn: () => api(`/api/teacher/lessons/${lesson.id}`, { method: 'PATCH', body: { title, content } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: () => api(`/api/teacher/lessons/${lesson.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });

  return (
    <div className="rounded-xl border border-line bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex grow items-center gap-1">
          {(canUp || canDown) && (
            <span className="flex flex-col gap-0">
              <button aria-label={t('moveUp')} title={t('moveUp')} disabled={!canUp} onClick={() => onMove(-1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
              <button aria-label={t('moveDown')} title={t('moveDown')} disabled={!canDown} onClick={() => onMove(1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
            </span>
          )}
          <button aria-expanded={open} className="grow text-start font-semibold" onClick={() => setOpen(!open)}>{title}</button>
        </div>
        <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="text-ink-soft hover:text-secondary" title={t('delete')}>
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} label={t('name')} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('lessons')} / notes</span>
            <textarea
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => save.mutate()}>
              <Save className="inline" size={16} /> {t('save')}
            </Button>
          </div>
          {save.error && <ErrorBox error={save.error} />}
          <AttachmentUploader lessonId={lesson.id} courseId={courseId} />
          <QuizBuilder endpoint={`/api/teacher/lessons/${lesson.id}/quiz`} existing={lesson.quiz} />
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`${t('delete')} ${lesson.title}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}

function AttachmentUploader({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Error | null>(null);
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const up = await api<{ objectKey: string; uploadUrl: string }>('/api/storage/presigned-upload', {
        body: { courseId, lessonId, fileName: file.name, mimeType: file.type, fileSizeBytes: file.size },
      });
      const resp = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      await api('/api/storage/attachments', {
        body: { lessonId, title: file.name, objectKey: up.objectKey, mimeType: file.type, fileSizeBytes: file.size },
      });
      invalidate();
      toast.success(t('saved'));
    } catch (e) {
      setErr(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-sm font-semibold text-ink-soft hover:border-primary">
        <FileUp size={16} />
        {busy ? '…' : t('uploadFile')}
        <input
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {err && <div className="mt-2"><ErrorBox error={err} /></div>}
    </div>
  );
}

function QuizBuilder({ endpoint, existing }: { endpoint: string; existing: { title: string } | null }) {
  const { t } = useLang();
  const [title, setTitle] = useState(existing?.title ?? 'Quiz');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [err, setErr] = useState<Error | null>(null);

  const upsert = useMutation({
    mutationFn: () =>
      api(endpoint, {
        body: {
          title,
          questions: questions.map((q) => ({
            ...q,
            options: q.questionType === 'MCQ' ? q.options : undefined,
          })),
        },
      }),
    onSuccess: () => {
      setQuestions([]);
      setErr(null);
      toast.success(t('saved'));
    },
    onError: (e) => setErr(e),
  });

  const blank = (): Question => ({ questionType: 'MCQ', prompt: '', options: ['', '', '', ''], correctAnswer: '', points: 1 });

  return (
    <Card className="border-line bg-white">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{t('quiz')}</span>
        <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => setQuestions([...questions, blank()])}>
          <Plus className="inline" size={14} /> {t('add')}
        </Button>
      </div>
      <div className="mt-2">
        <Input label={t('quiz')} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {questions.map((q, qi) => (
        <div key={qi} className="mt-4 flex flex-col gap-2 rounded-xl border border-line p-3">
          <div className="flex gap-2">
            <select
              className="rounded-lg border border-line px-2 py-2 text-sm"
              value={q.questionType}
              onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...q, questionType: e.target.value as Question['questionType'] };
                setQuestions(next);
              }}
            >
              <option value="MCQ">MCQ</option>
              <option value="TRUE_FALSE">True/False</option>
            </select>
            <Input
              value={q.prompt}
              onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...q, prompt: e.target.value };
                setQuestions(next);
              }}
              placeholder="…"
            />
            <button
              aria-label={t('delete')}
              title={t('delete')}
              className="text-ink-soft hover:text-secondary"
              onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
            >
              <Trash2 size={14} />
            </button>
          </div>
          {q.questionType === 'MCQ' && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, oi) => (
                <Input
                  key={oi}
                  value={opt}
                  onChange={(e) => {
                    const next = [...questions];
                    const options = [...q.options];
                    options[oi] = e.target.value;
                    next[qi] = { ...q, options };
                    setQuestions(next);
                  }}
                />
              ))}
            </div>
          )}
          {q.questionType === 'TRUE_FALSE' && (
            <div className="flex gap-2">
              {['true', 'false'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const next = [...questions];
                    next[qi] = { ...q, correctAnswer: v };
                    setQuestions(next);
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${q.correctAnswer === v ? 'border-primary bg-primary-light font-semibold' : 'border-line'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          {q.questionType === 'MCQ' && (
            <Input
              label="correct answer"
              value={q.correctAnswer}
              onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...q, correctAnswer: e.target.value };
                setQuestions(next);
              }}
            />
          )}
        </div>
      ))}
      {err && <ErrorBox error={err} />}
      <Button onClick={() => upsert.mutate()} disabled={questions.length === 0} className="mt-3">
        <Save className="inline" size={16} /> {t('save')} {t('quiz')}
      </Button>
    </Card>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const teacherCurriculumQuery = (courseId: string) => ({
  queryKey: ['teacher-curriculum', courseId] as const,
  queryFn: () => api<Curriculum>(`/api/teacher/courses/${courseId}/curriculum`),
});

export const teacherCurriculumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/courses/$courseId/curriculum',
  beforeLoad: () => requireRole('TEACHER'),
  loader: ({ params }) => queryClient.ensureQueryData(teacherCurriculumQuery(params.courseId)),
  component: TeacherCurriculum,
});
