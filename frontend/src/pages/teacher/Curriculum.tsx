import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoute, useLocation, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileUp, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { attachmentIcon, attachmentUrl } from '../../lib/attachment';
import { useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, Dialog, ErrorBox, Input, Loading, Page, Select, StatCard } from '../../components/ui';
import type { Attachment } from '../../../../shared/api';

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
      attachments: Attachment[];
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
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const [moduleName, setModuleName] = useState('');
  const addModule = useMutation({
    mutationFn: () => api(`/api/teacher/courses/${courseId}/modules`, { body: { title: moduleName } }),
    onSuccess: () => {
      setModuleName('');
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const reorderModules = useMutation({
    mutationFn: (moduleIds: string[]) =>
      api(`/api/teacher/courses/${courseId}/modules/reorder`, { method: 'PUT', body: { moduleIds } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  const modules = data?.modules ?? [];
  const lessonCount = modules.reduce((total, mod) => total + mod.lessons.length, 0);
  const quizCount = [data?.quiz, ...modules.flatMap((mod) => [mod.quiz, ...mod.lessons.map((lesson) => lesson.quiz)])]
    .filter(Boolean).length;

  return (
    <Page title={t('curriculum')} wide>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t('modules')} value={modules.length} />
            <StatCard label={t('lessons')} value={lessonCount} />
            <StatCard label={t('quizzes')} value={quizCount} />
          </div>
          {data && <QuizBuilder endpoint={`/api/teacher/courses/${courseId}/quiz`} existing={data.quiz} />}
          {modules.map((mod, mi) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              courseId={courseId}
              focusLessonId={location.state?.lessonId}
              canUp={mi > 0}
              canDown={mi < modules.length - 1}
              moving={reorderModules.isPending}
              onMoveModule={(dir) => reorderModules.mutate(swap(modules.map((m) => m.id), mi, dir))}
            />
          ))}

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grow">
                <Input label={t('newModule')} value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder={t('modules')} />
              </div>
              <Button onClick={() => addModule.mutate()} disabled={!moduleName || addModule.isPending}>
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

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.inert = !open;
  }, [open]);
  return (
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div ref={ref} className="overflow-hidden">{children}</div>
    </div>
  );
}

function ModuleCard({ mod, courseId, focusLessonId, canUp, canDown, moving, onMoveModule }: {
  mod: Curriculum['modules'][0];
  courseId: string;
  focusLessonId?: string;
  canUp: boolean;
  canDown: boolean;
  moving: boolean;
  onMoveModule?: (dir: -1 | 1) => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [moduleTitle, setModuleTitle] = useState(mod.title);
  const [lessonTitle, setLessonTitle] = useState('');
  const [confirming, setConfirming] = useState(false);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const rename = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}`, { method: 'PATCH', body: { title: moduleTitle } }),
    onSuccess: () => {
      setEditing(false);
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const reorderLessons = useMutation({
    mutationFn: (lessonIds: string[]) =>
      api(`/api/teacher/modules/${mod.id}/lessons/reorder`, { method: 'PUT', body: { lessonIds } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const addLesson = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}/lessons`, { body: { title: lessonTitle } }),
    onSuccess: () => {
      setLessonTitle('');
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const delModule = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const unitQuizCount = [mod.quiz, ...mod.lessons.map((lesson) => lesson.quiz)].filter(Boolean).length;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 grow items-center gap-2">
          {(canUp || canDown) && (
            <span className="flex shrink-0 flex-col gap-0">
              <button aria-label={t('moveUp')} title={t('moveUp')} disabled={!canUp || moving} onClick={() => onMoveModule?.(-1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
              <button aria-label={t('moveDown')} title={t('moveDown')} disabled={!canDown || moving} onClick={() => onMoveModule?.(1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
            </span>
          )}
          {editing ? (
            <div className="flex min-w-0 grow flex-wrap items-center gap-2">
              <div className="min-w-40 grow">
                <Input aria-label={t('name')} value={moduleTitle} autoFocus onChange={(e) => setModuleTitle(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter' && moduleTitle.trim()) rename.mutate();
                  if (e.key === 'Escape') setEditing(false);
                }} />
              </div>
              <Button onClick={() => rename.mutate()} disabled={!moduleTitle.trim() || rename.isPending}>{t('save')}</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setModuleTitle(mod.title); }}>{t('cancel')}</Button>
            </div>
          ) : (
            <>
              <button aria-expanded={open} aria-label={`${open ? t('collapse') : t('expand')}: ${mod.title}`} title={open ? t('collapse') : t('expand')} className="flex min-w-0 grow items-center gap-2 text-start text-lg font-bold" onClick={() => setOpen(!open)}>
                <ChevronDown className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? '' : 'ltr:-rotate-90 rtl:rotate-90'}`} size={18} />
                <span className="min-w-0">{mod.title}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-soft">
                  {mod.lessons.length} {t('lessons')} · {unitQuizCount} {t('quizzes')}
                </span>
              </button>
              <button aria-label={t('edit')} title={t('edit')} onClick={() => setEditing(true)} className="shrink-0 text-ink-soft hover:text-primary"><Pencil size={15} /></button>
            </>
          )}
        </div>
        <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="shrink-0 text-ink-soft hover:text-secondary" title={t('delete')}>
          <Trash2 size={16} />
        </button>
      </div>
      <Collapse open={open}>
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {mod.lessons.map((l, li) => (
            <LessonEditor
              key={l.id}
              lesson={l}
              courseId={courseId}
              autoFocus={l.id === focusLessonId}
              canUp={li > 0}
              canDown={li < mod.lessons.length - 1}
              moving={reorderLessons.isPending}
              onMove={(dir) => reorderLessons.mutate(swap(mod.lessons.map((x) => x.id), li, dir))}
            />
          ))}
          <div className="flex gap-2">
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder={t('newLesson')} label={t('newLesson')} />
            <Button onClick={() => addLesson.mutate()} disabled={!lessonTitle || addLesson.isPending} className="self-end">
              <Plus className="inline" size={18} /> {t('add')}
            </Button>
          </div>
          {addLesson.error && <ErrorBox error={addLesson.error} />}
          <QuizBuilder endpoint={`/api/teacher/modules/${mod.id}/quiz`} existing={mod.quiz} />
        </div>
      </Collapse>
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

function LessonEditor({ lesson, courseId, autoFocus, canUp, canDown, moving, onMove }: {
  lesson: Curriculum['modules'][0]['lessons'][0];
  courseId: string;
  autoFocus?: boolean;
  canUp: boolean;
  canDown: boolean;
  moving: boolean;
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
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const del = useMutation({
    mutationFn: () => api(`/api/teacher/lessons/${lesson.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  return (
    <div className="rounded-xl border border-line bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex grow items-center gap-1">
          {(canUp || canDown) && (
            <span className="flex shrink-0 flex-col gap-0">
              <button aria-label={t('moveUp')} title={t('moveUp')} disabled={!canUp || moving} onClick={() => onMove(-1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
              <button aria-label={t('moveDown')} title={t('moveDown')} disabled={!canDown || moving} onClick={() => onMove(1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
            </span>
          )}
          <button aria-expanded={open} className="flex grow items-center gap-2 text-start font-semibold" onClick={() => setOpen(!open)}>
            <ChevronDown className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? '' : 'ltr:-rotate-90 rtl:rotate-90'}`} size={15} />
            {title}
          </button>
        </div>
        <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="text-ink-soft hover:text-secondary" title={t('delete')}>
          <Trash2 size={14} />
        </button>
      </div>
      <Collapse open={open}>
        <div className="mt-3 flex flex-col gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} label={t('name')} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('lessons')} / {t('notes')}</span>
            <textarea
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="inline" size={16} /> {t('save')}
            </Button>
          </div>
          {save.error && <ErrorBox error={save.error} />}
          <LessonMaterials lesson={lesson} courseId={courseId} />
          <QuizBuilder endpoint={`/api/teacher/lessons/${lesson.id}/quiz`} existing={lesson.quiz} />
        </div>
      </Collapse>
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

function LessonMaterials({ lesson, courseId }: { lesson: Curriculum['modules'][0]['lessons'][0]; courseId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Error | null>(null);
  const [removing, setRemoving] = useState<Attachment | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const reset = () => {
    setMode('file');
    setTitle('');
    setUrl('');
    setFile(null);
    setErr(null);
  };
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/storage/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'link' && !/^https?:\/\//i.test(url.trim())) throw new Error(t('invalidUrl'));
      if (mode === 'file' && !file) throw new Error(t('requiredField'));
      const materialTitle = title.trim() || (mode === 'file' ? file!.name : url.trim());
      if (mode === 'file') {
        const up = await api<{ objectKey: string; uploadUrl: string }>('/api/storage/presigned-upload', {
          body: {
            courseId,
            lessonId: lesson.id,
            fileName: file!.name,
            mimeType: file!.type || undefined,
            fileSizeBytes: file!.size,
          },
        });
        const resp = await fetch(up.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file!.type || 'application/octet-stream' },
          body: file,
        });
        if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
        await api('/api/storage/attachments', {
          body: {
            lessonId: lesson.id,
            title: materialTitle,
            objectKey: up.objectKey,
            mimeType: file!.type || undefined,
            fileSizeBytes: file!.size,
          },
        });
      } else {
        await api('/api/storage/attachments', {
          body: { lessonId: lesson.id, title: materialTitle, url: url.trim() },
        });
      }
      toast.success(t('saved'));
      invalidate();
      setOpen(false);
      reset();
    } catch (e) {
      setErr(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{t('materials')}</span>
        <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="inline" size={15} /> {t('addMaterial')}
        </Button>
      </div>
      {lesson.attachments.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{t('noMaterials')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {lesson.attachments.map((attachment) => {
            const Icon = attachmentIcon(attachment.fileType);
            return (
              <li key={attachment.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3">
                <Icon size={17} className="shrink-0 text-primary" />
                <a
                  href={attachmentUrl(attachment)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 grow truncate text-sm font-semibold hover:text-primary"
                >
                  {attachment.title}
                </a>
                <span className="shrink-0 text-xs text-ink-soft">{attachment.fileType}</span>
                <button
                  type="button"
                  aria-label={t('delete')}
                  title={t('delete')}
                  onClick={() => setRemoving(attachment)}
                  className="shrink-0 text-ink-soft hover:text-secondary"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('addMaterial')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={add} disabled={busy || (mode === 'file' ? !file : !url.trim())}>
              {busy ? '…' : t('add')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select label={t('materialSource')} value={mode} onChange={(e) => setMode(e.target.value as 'file' | 'link')}>
            <option value="file">{t('uploadFile')}</option>
            <option value="link">{t('externalLink')}</option>
          </Select>
          <Input
            label={t('materialTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={mode === 'file' ? t('uploadFile') : t('externalLink')}
          />
          {mode === 'file' ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-sm font-semibold text-ink-soft hover:border-primary">
              <FileUp size={16} className="shrink-0" />
              <span className="min-w-0 truncate">{file?.name ?? t('uploadFile')}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  setFile(picked);
                  if (picked && !title) setTitle(picked.name);
                }}
              />
            </label>
          ) : (
            <Input
              label={t('materialUrl')}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              dir="ltr"
            />
          )}
          {err && <ErrorBox error={err} />}
        </div>
      </Dialog>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`${t('delete')} ${removing?.title ?? ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

function QuizBuilder({ endpoint, existing }: { endpoint: string; existing: { title: string } | null }) {
  const { t } = useLang();
  const [title, setTitle] = useState(existing?.title ?? t('quiz'));
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
    onError: (e) => {
      setErr(e);
      toast.error((e as Error).message || t('errorOccurred'));
    },
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
              <option value="MCQ">{t('mcq')}</option>
              <option value="TRUE_FALSE">{t('trueFalse')}</option>
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
                  {v === 'true' ? t('trueLabel') : t('falseLabel')}
                </button>
              ))}
            </div>
          )}
          {q.questionType === 'MCQ' && (
            <Input
              label={t('correctAnswer')}
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
