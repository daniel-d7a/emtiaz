import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoute, useLocation, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileUp, ImagePlus, NotebookPen, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { attachmentIcon, attachmentUrl } from '../../lib/attachment';
import { useLang } from '../../lib/i18n';
import { Button, Card, ConfirmDialog, Dialog, ErrorBox, Input, Loading, Page, Select, StatCard } from '../../components/ui';
import type {
  Attachment,
  TeacherCurriculum as Curriculum,
  TeacherQuiz,
  TeacherQuizQuestion as QuizQuestionData,
} from '../../../../shared/api';


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
  const quizCount = [
    ...(data?.quizzes ?? []),
    ...modules.flatMap((mod) => [
      ...mod.quizzes,
      ...mod.lessons.flatMap((lesson) => lesson.quizzes),
    ]),
  ].length;

  return (
    <Page title={t('curriculum')} wide>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t('modules')} value={modules.length} />
            <StatCard label={t('lessons')} value={lessonCount} />
            <StatCard label={t('quizzes')} value={quizCount} />
          </div>
          {data && (
            <Card className="flex flex-col gap-3">
              <span className="font-bold">{t('finalQuiz')}</span>
              {data.quizzes.length === 0 && (
                <p className="text-sm text-ink-soft">{t('noQuiz')}</p>
              )}
              {data.quizzes.map((quiz, index) => (
                <div key={quiz.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold">{quiz.title}</span>
                  <span className="flex items-center gap-1">
                    <QuizOrderButtons
                      courseId={courseId}
                      quizId={quiz.id}
                      canUp={index > 0}
                      canDown={index < data.quizzes.length - 1}
                    />
                    <QuizBuilder
                      courseId={courseId}
                      targetType="course"
                      targetId={courseId}
                      existing={quiz}
                    />
                  </span>
                </div>
              ))}
              <div>
                <QuizBuilder courseId={courseId} targetType="course" targetId={courseId} />
              </div>
            </Card>
          )}
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
  const reorderItems = useMutation({
    mutationFn: (items: Array<{ id: string; type: 'lesson' | 'quiz' }>) =>
      api(`/api/teacher/modules/${mod.id}/items/reorder`, { method: 'PUT', body: { items } }),
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
  const unitQuizCount =
    mod.quizzes.length + mod.lessons.reduce((total, lesson) => total + lesson.quizzes.length, 0);
  const unitItems = [
    ...mod.lessons.map((lesson) => ({ id: lesson.id, type: 'lesson' as const, order: lesson.displayOrder, lesson })),
    ...mod.quizzes.map((quiz) => ({ id: quiz.id, type: 'quiz' as const, order: quiz.displayOrder, quiz })),
  ].sort((a, b) => a.order - b.order);

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
                <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">
                  {mod.lessons.length} {t('lessons')} · {unitQuizCount} {t('quizzes')}
                </span>
              </button>
              <button aria-label={t('edit')} title={t('edit')} onClick={() => setEditing(true)} className="shrink-0 text-ink-soft hover:text-primary"><Pencil size={15} /></button>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <QuizBuilder
            courseId={courseId}
            targetType="module"
            targetId={mod.id}
            existing={undefined}
          />
          <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="shrink-0 text-ink-soft hover:text-danger" title={t('delete')}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <Collapse open={open}>
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {unitItems.map((item, ii) => {
            const onMove = (dir: -1 | 1) =>
              reorderItems.mutate(
                swap(unitItems, ii, dir).map(({ id, type }) => ({ id, type })),
              );
            if (item.type === 'quiz') {
              return (
                <div key={item.id} className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 bg-primary-light/20 px-3">
                  <span className="flex shrink-0 flex-col gap-0">
                    <button aria-label={t('moveUp')} title={t('moveUp')} disabled={ii === 0 || reorderItems.isPending} onClick={() => onMove(-1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button aria-label={t('moveDown')} title={t('moveDown')} disabled={ii === unitItems.length - 1 || reorderItems.isPending} onClick={() => onMove(1)} className="text-ink-soft hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
                  </span>
                  <NotebookPen size={16} className="shrink-0 text-primary" />
                  <span className="min-w-0 grow truncate text-sm font-semibold">{item.quiz.title}</span>
                  <QuizBuilder
                    courseId={courseId}
                    targetType="module"
                    targetId={mod.id}
                    existing={item.quiz}
                  />
                </div>
              );
            }
            return (
              <LessonEditor
                key={item.id}
                lesson={item.lesson}
                courseId={courseId}
                autoFocus={item.id === focusLessonId}
                canUp={ii > 0}
                canDown={ii < unitItems.length - 1}
                moving={reorderItems.isPending}
                onMove={onMove}
              />
            );
          })}
          <div className="flex gap-2">
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder={t('newLesson')} label={t('newLesson')} />
            <Button onClick={() => addLesson.mutate()} disabled={!lessonTitle || addLesson.isPending} className="self-end">
              <Plus className="inline" size={18} /> {t('add')}
            </Button>
          </div>
          {addLesson.error && <ErrorBox error={addLesson.error} />}
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
            <span className="min-w-0 truncate">{title}</span>
            {lesson.quizzes.length > 0 && <NotebookPen size={14} className="shrink-0 text-ink-soft" aria-label={t('quiz')} />}
          </button>
        </div>
        <button aria-label={t('delete')} onClick={() => setConfirming(true)} className="text-ink-soft hover:text-danger" title={t('delete')}>
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
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-white px-3 py-2">
            <p className="text-sm font-bold">{t('quiz')}</p>
            {lesson.quizzes.length === 0 && (
              <p className="text-xs text-ink-soft">{t('noQuiz')}</p>
            )}
            {lesson.quizzes.map((quiz, index) => (
              <div key={quiz.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold">{quiz.title}</span>
                <span className="flex items-center gap-1">
                  <QuizOrderButtons
                    courseId={courseId}
                    quizId={quiz.id}
                    canUp={index > 0}
                    canDown={index < lesson.quizzes.length - 1}
                  />
                  <QuizBuilder
                    courseId={courseId}
                    targetType="lesson"
                    targetId={lesson.id}
                    existing={quiz}
                  />
                </span>
              </div>
            ))}
            <div>
              <QuizBuilder courseId={courseId} targetType="lesson" targetId={lesson.id} />
            </div>
          </div>
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
                  className="shrink-0 text-ink-soft hover:text-danger"
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

type QuestionForm = {
  questionType: 'MCQ' | 'TRUE_FALSE' | 'WRITTEN';
  prompt: string;
  imageKey: string | null;
  imageUrl: string | null;
  options: string[];
  correctIndex: number | null;
  correctBool: 'true' | 'false' | '';
  modelAnswer: string;
};

const blankQuestion = (): QuestionForm => ({
  questionType: 'MCQ',
  prompt: '',
  imageKey: null,
  imageUrl: null,
  options: ['', ''],
  correctIndex: null,
  correctBool: '',
  modelAnswer: '',
});

const formQuestion = (q: QuizQuestionData): QuestionForm => ({
  questionType: q.questionType,
  prompt: q.prompt,
  imageKey: q.imageKey,
  imageUrl: q.imageUrl,
  options: q.options?.length ? q.options : ['', ''],
  correctIndex:
    q.questionType === 'MCQ' && q.options
      ? q.options.findIndex((option) => option === q.correctAnswer)
      : null,
  correctBool:
    q.questionType === 'TRUE_FALSE'
      ? q.correctAnswer.toLowerCase() === 'false'
        ? 'false'
        : 'true'
      : '',
  modelAnswer: q.questionType === 'WRITTEN' ? q.correctAnswer : '',
});

function QuizOrderButtons({ courseId, quizId, canUp, canDown }: {
  courseId: string;
  quizId: string;
  canUp: boolean;
  canDown: boolean;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const move = useMutation({
    mutationFn: (direction: 'up' | 'down') =>
      api(`/api/teacher/quizzes/${quizId}/move`, {
        method: 'PUT',
        body: { direction },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={t('moveUp')}
        title={t('moveUp')}
        disabled={!canUp || move.isPending}
        onClick={() => move.mutate('up')}
        className="text-ink-soft hover:text-primary disabled:opacity-30"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        aria-label={t('moveDown')}
        title={t('moveDown')}
        disabled={!canDown || move.isPending}
        onClick={() => move.mutate('down')}
        className="text-ink-soft hover:text-primary disabled:opacity-30"
      >
        <ChevronDown size={14} />
      </button>
    </span>
  );
}

function QuizBuilder({ courseId, targetType, targetId, existing }: {
  courseId: string;
  targetType: 'course' | 'module' | 'lesson';
  targetId: string;
  existing?: TeacherQuiz;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [err, setErr] = useState<Error | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });

  const show = () => {
    setTitle(existing?.title ?? t('quiz'));
    setQuestions(existing?.questions.length ? existing.questions.map(formQuestion) : [blankQuestion()]);
    setErr(null);
    setOpen(true);
  };

  const upsert = useMutation({
    mutationFn: () => {
      const body = {
        title,
        questions: questions.map((q) => ({
          questionType: q.questionType,
          prompt: q.prompt,
          imageKey: q.imageKey,
          options:
            q.questionType === 'MCQ'
              ? q.options.map((option) => option.trim())
              : undefined,
          correctAnswer:
            q.questionType === 'MCQ'
              ? (q.options[q.correctIndex ?? -1] ?? '').trim()
              : q.questionType === 'WRITTEN'
                ? q.modelAnswer.trim()
                : q.correctBool,
          points: 1,
        })),
      };
      return existing
        ? api(`/api/teacher/quizzes/${existing.id}`, { method: 'PUT', body })
        : api(`/api/teacher/courses/${courseId}/quizzes`, {
            body: { ...body, targetType, targetId },
          });
    },
    onSuccess: () => {
      setErr(null);
      setOpen(false);
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => {
      setErr(e);
      toast.error((e as Error).message || t('errorOccurred'));
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      api(`/api/teacher/quizzes/${existing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirming(false);
      toast.success(t('deleted'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  const save = () => {
    const valid = questions.length > 0 && questions.every((q) => {
      if (!q.prompt.trim() && !q.imageKey) return false;
      if (q.questionType === 'MCQ') {
        return (
          q.options.length >= 2 &&
          q.options.every((option) => option.trim()) &&
          q.correctIndex !== null &&
          !!q.options[q.correctIndex]?.trim()
        );
      }
      if (q.questionType === 'WRITTEN') return !!q.modelAnswer.trim();
      return q.correctBool === 'true' || q.correctBool === 'false';
    });
    if (!title.trim() || !valid) {
      setErr(new Error(t('quizValidation')));
      return;
    }
    setErr(null);
    upsert.mutate();
  };

  const uploadImage = async (qi: number, file: File) => {
    setUploading(qi);
    setErr(null);
    try {
      if (!file.type.startsWith('image/')) throw new Error(t('requiredField'));
      if (file.size > 5 * 1024 * 1024) throw new Error(t('imageTooLarge'));
      const up = await api<{ objectKey: string; uploadUrl: string }>('/api/storage/quiz-image', {
        body: {
          courseId,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        },
      });
      const put = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      const preview = URL.createObjectURL(file);
      setQuestions((current) =>
        current.map((question, i) =>
          i === qi ? { ...question, imageKey: up.objectKey, imageUrl: preview } : question,
        ),
      );
    } catch (e) {
      setErr(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setUploading(null);
    }
  };

  const update = (qi: number, patch: Partial<QuestionForm>) => {
    setQuestions((current) => current.map((question, i) => (i === qi ? { ...question, ...patch } : question)));
  };

  return (
    <>
      <span className="flex items-center gap-1">
        <Button variant="ghost" className="!min-h-9 !px-3" onClick={show}>
          {existing ? <Pencil className="inline" size={14} /> : <Plus className="inline" size={14} />}{' '}
          {existing ? t('edit') : t('add')} {t('quiz')}
        </Button>
        {existing && (
          <button
            type="button"
            aria-label={t('delete')}
            title={t('delete')}
            onClick={() => setConfirming(true)}
            className="text-ink-soft hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        )}
      </span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('quiz')}
        className="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save} disabled={upsert.isPending}>
              <Save className="inline" size={16} /> {t('save')}
            </Button>
          </>
        }
      >
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pe-1">
          <Input
            label={t('quiz')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('quiz')}
          />
          {questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{t('question')} {qi + 1}</span>
                <button
                  type="button"
                  aria-label={t('delete')}
                  title={t('delete')}
                  onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
                  className="text-ink-soft hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <Select
                label={t('question')}
                value={q.questionType}
                onChange={(e) =>
                  update(qi, {
                    questionType: e.target.value as QuestionForm['questionType'],
                    correctIndex: null,
                    correctBool: '',
                    modelAnswer: '',
                  })
                }
              >
                <option value="MCQ">{t('mcq')}</option>
                <option value="TRUE_FALSE">{t('trueFalse')}</option>
                <option value="WRITTEN">{t('writtenQuestion')}</option>
              </Select>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('question')}</span>
                <textarea
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => update(qi, { prompt: e.target.value })}
                  placeholder={t('question')}
                />
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-soft">{t('questionImage')}</span>
                {q.imageUrl && (
                  <div className="flex items-start gap-3">
                    <img src={q.imageUrl} alt="" className="max-h-40 min-w-0 rounded-lg border border-line object-contain" />
                    <button
                      type="button"
                      onClick={() => update(qi, { imageKey: null, imageUrl: null })}
                      className="shrink-0 text-sm font-semibold text-danger hover:underline"
                    >
                      {t('removeImage')}
                    </button>
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-background px-3 py-2 text-sm font-semibold text-ink-soft hover:border-primary">
                  <ImagePlus size={16} className="shrink-0" />
                  <span className="min-w-0 truncate">
                    {uploading === qi ? '…' : q.imageUrl ? t('removeImage') : t('questionImage')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(qi, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {q.questionType === 'MCQ' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink-soft">{t('correctAnswer')}</span>
                  {q.options.map((option, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        aria-label={`${t('correctAnswer')} ${oi + 1}`}
                        checked={q.correctIndex === oi}
                        onChange={() => update(qi, { correctIndex: oi })}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <input
                        className="min-h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                        value={option}
                        aria-label={`${t('addOption')} ${oi + 1}`}
                        placeholder={`${t('addOption')} ${oi + 1}`}
                        onChange={(e) => {
                          const options = [...q.options];
                          options[oi] = e.target.value;
                          update(qi, { options });
                        }}
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          aria-label={t('delete')}
                          title={t('delete')}
                          onClick={() => update(qi, { options: q.options.filter((_, i) => i !== oi), correctIndex: null })}
                          className="shrink-0 text-ink-soft hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <Button variant="ghost" className="!min-h-9 self-start !px-3" onClick={() => update(qi, { options: [...q.options, ''] })}>
                      <Plus className="inline" size={14} /> {t('addOption')}
                    </Button>
                  )}
                </div>
              ) : q.questionType === 'WRITTEN' ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('modelAnswer')}</span>
                  <textarea
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
                    rows={2}
                    value={q.modelAnswer}
                    onChange={(e) => update(qi, { modelAnswer: e.target.value })}
                  />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(['true', 'false'] as const).map((value) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${q.correctBool === value ? 'border-primary bg-primary-light font-semibold' : 'border-line'}`}
                    >
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correctBool === value}
                        onChange={() => update(qi, { correctBool: value })}
                        className="h-4 w-4 accent-primary"
                      />
                      {value === 'true' ? t('trueLabel') : t('falseLabel')}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Button variant="ghost" className="self-start" onClick={() => setQuestions([...questions, blankQuestion()])}>
            <Plus className="inline" size={16} /> {t('question')}
          </Button>
          {err && <ErrorBox error={err} />}
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`${t('delete')} ${existing?.title ?? t('quiz')}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => remove.mutate()}
      />
    </>
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
