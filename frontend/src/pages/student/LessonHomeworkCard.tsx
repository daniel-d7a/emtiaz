import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  Paperclip,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { studentApi } from '../../lib/api';
import { homeworkFileUrl, submissionFileUrl } from '../../lib/attachment';
import { formatDateTime, useLang } from '../../lib/i18n';
import { Badge, Button, Card, ErrorBox, Input, Loading } from '../../components/ui';
import type { HomeworkAttachmentType, StudentHomeworkDto, SubmitHomeworkDto } from '../../../../shared/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function formatDueDateCountdown(dueDateStr: string | null | undefined, lang: 'ar' | 'en' = 'ar'): {
  text: string;
  isPast: boolean;
  isUrgent: boolean;
} | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      text: lang === 'ar' ? 'متأخر' : 'Overdue',
      isPast: true,
      isUrgent: true,
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const isUrgent = diffHours < 24;

  if (diffDays === 0) {
    if (diffHours === 0) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return {
        text: lang === 'ar' ? `ينتهي بعد ${diffMins} دقيقة` : `Due in ${diffMins}m`,
        isPast: false,
        isUrgent,
      };
    }
    return {
      text: lang === 'ar' ? `ينتهي خلال ${diffHours} ساعة` : `Due in ${diffHours}h`,
      isPast: false,
      isUrgent,
    };
  }
  if (diffDays === 1) {
    return {
      text: lang === 'ar' ? 'ينتهي غداً' : 'Due tomorrow',
      isPast: false,
      isUrgent,
    };
  }
  if (diffDays === 2) {
    return {
      text: lang === 'ar' ? 'ينتهي بعد يومين' : 'Due in 2 days',
      isPast: false,
      isUrgent: false,
    };
  }
  if (diffDays <= 10) {
    return {
      text: lang === 'ar' ? `ينتهي بعد ${diffDays} أيام` : `Due in ${diffDays} days`,
      isPast: false,
      isUrgent: false,
    };
  }
  return {
    text: lang === 'ar' ? `ينتهي بعد ${diffDays} يوماً` : `Due in ${diffDays} days`,
    isPast: false,
    isUrgent: false,
  };
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectAttachmentType(file: File): HomeworkAttachmentType {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  if (
    mime.includes('word') ||
    mime.includes('officedocument') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'DOC';
  }
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) return 'IMAGE';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(name)) return 'AUDIO';
  if (mime.includes('zip') || mime.includes('compressed') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return 'ARCHIVE';
  }
  if (mime.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(name)) return 'VIDEO';
  return 'OTHER';
}

export function HomeworkItemCard({
  hw,
  groupId,
  lessonId,
}: {
  hw: StudentHomeworkDto;
  groupId: string;
  lessonId: string;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sub = hw.submission;
  const isGraded = sub?.status === 'GRADED';
  const isRevisionRequested = sub?.status === 'REVISION_REQUESTED';

  // Submission form state
  const [mode, setMode] = useState<'TEXT' | 'LINK' | 'FILE'>('TEXT');
  const [content, setContent] = useState(sub?.content ?? '');
  const [url, setUrl] = useState(sub?.url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const countdown = formatDueDateCountdown(hw.dueDate, lang);

  const submitMutation = useMutation({
    mutationFn: async (dto: SubmitHomeworkDto) => {
      return await studentApi.submitHomework(groupId, hw.id, dto);
    },
    onSuccess: () => {
      toast.success(t('homeworkSubmittedSuccess'));
      void qc.invalidateQueries({ queryKey: ['lesson-homework', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['lesson-view', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['curriculum', groupId] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
      setFile(null);
      setFileError(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError(t('fileSizeExceedsLimit'));
      return;
    }
    setFileError(null);
    setFile(selected);
  };

  const handleSubmit = () => {
    const trimmedContent = content.trim();
    const trimmedUrl = url.trim();

    if (mode === 'TEXT') {
      if (!trimmedContent) {
        toast.error(t('submissionRequired'));
        return;
      }
      submitMutation.mutate({
        content: trimmedContent,
        attachmentType: 'NONE',
      });
    } else if (mode === 'LINK') {
      if (!trimmedUrl) {
        toast.error(t('submissionRequired'));
        return;
      }
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        toast.error(lang === 'ar' ? 'الرابط يجب أن يبدأ بـ http:// أو https://' : 'URL must start with http:// or https://');
        return;
      }
      submitMutation.mutate({
        content: trimmedContent || null,
        url: trimmedUrl,
        attachmentType: 'LINK',
      });
    } else if (mode === 'FILE') {
      if (!file && !sub?.r2ObjectKey) {
        toast.error(t('submissionRequired'));
        return;
      }
      if (file) {
        const attType = detectAttachmentType(file);
        submitMutation.mutate({
          content: trimmedContent || null,
          attachmentType: attType,
          r2ObjectKey: `submissions/${hw.id}/${file.name}`,
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
        });
      } else {
        // Keeping previously submitted file but updating note
        submitMutation.mutate({
          content: trimmedContent || null,
        });
      }
    }
  };

  return (
    <div
      data-testid={`homework-item-${hw.id}`}
      className="rounded-xl border border-line bg-card p-4 transition-colors sm:p-5"
    >
      {/* Top row: Title, points, countdown, status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink sm:text-lg">{hw.title}</h3>
            <span className="rounded-md bg-line/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
              {hw.maxScore} {t('points')}
            </span>
          </div>

          {/* Due date countdown banner */}
          {hw.dueDate && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-ink-soft">
                <Clock size={13} />
                <span>{t('dueDate')}:</span>
                <span className="font-medium">{formatDateTime(hw.dueDate, lang)}</span>
              </span>

              {countdown && (
                <span
                  data-testid="due-countdown-badge"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                    countdown.isPast
                      ? 'border border-rose-300 bg-rose-50 text-rose-700'
                      : countdown.isUrgent
                        ? 'border border-amber-300 bg-amber-50 text-amber-800'
                        : 'border border-primary/20 bg-primary-light/40 text-primary-dark'
                  }`}
                >
                  {countdown.isPast && <AlertTriangle size={12} />}
                  <span>{countdown.text}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live Submission Status Badge */}
        <div data-testid="submission-status-badge" className="shrink-0">
          {!sub ? (
            <Badge tone="neutral" className="font-bold">
              {t('notSubmitted')}
            </Badge>
          ) : isGraded ? (
            <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
              <CheckCircle2 size={13} className="inline ltr:mr-1 rtl:ml-1" />
              {t('gradedWithScore')} ({sub.score ?? 0}/{hw.maxScore})
            </Badge>
          ) : isRevisionRequested ? (
            <Badge tone="danger" className="font-bold">
              <RotateCcw size={13} className="inline ltr:mr-1 rtl:ml-1" />
              {t('revisionRequested')}
            </Badge>
          ) : sub.isLate ? (
            <Badge className="border-amber-300 bg-amber-50 text-amber-800 font-bold">
              <AlertTriangle size={13} className="inline ltr:mr-1 rtl:ml-1" />
              {t('submittedLate')}
            </Badge>
          ) : (
            <Badge tone="primary" className="font-bold">
              <CheckCircle2 size={13} className="inline ltr:mr-1 rtl:ml-1" />
              {t('submitted')}
            </Badge>
          )}
        </div>
      </div>

      {/* Instructions */}
      {hw.instructions && (
        <div className="mt-3 rounded-lg bg-background p-3 text-sm text-ink-soft">
          <p className="whitespace-pre-wrap leading-relaxed">{hw.instructions}</p>
        </div>
      )}

      {/* Teacher Reference Material */}
      {(hw.url || hw.r2ObjectKey) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft">{t('referenceAttachment')}:</span>
          {hw.url && (
            <a
              href={hw.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-line/40"
            >
              <ExternalLink size={14} />
              <span>{t('openStudentLink')}</span>
            </a>
          )}
          {hw.r2ObjectKey && (
            <a
              href={homeworkFileUrl(hw)}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-line/40"
            >
              <Download size={14} />
              <span>
                {t('download')} ({hw.mimeType ?? hw.attachmentType})
              </span>
            </a>
          )}
        </div>
      )}

      {/* Prominent Teacher Feedback */}
      {sub?.teacherFeedback && (
        <div
          data-testid="teacher-feedback-callout"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-amber-900"
        >
          <div className="mb-1 flex items-center gap-1.5 font-bold text-sm text-amber-950">
            <MessageSquare size={16} className="text-amber-700" />
            <span>{t('teacherFeedback')}</span>
            {sub.revisionCount > 0 && (
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {t('revisionCount')}: {sub.revisionCount}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
            {sub.teacherFeedback}
          </p>
        </div>
      )}

      {/* Previous Submitted Content Preview */}
      {sub && (
        <div className="mt-4 rounded-xl border border-line bg-background/60 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-ink-soft">{t('yourSubmission')}</span>
            <span className="text-ink-soft tabular-nums">
              {t('submittedAt')}: {formatDateTime(sub.submittedAt, lang)}
            </span>
          </div>

          {sub.content && (
            <p className="mb-2 whitespace-pre-wrap text-sm text-ink">{sub.content}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {sub.url && (
              <a
                href={sub.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-line/40"
              >
                <Link2 size={13} />
                <span>{t('openSubmittedLink')}</span>
              </a>
            )}
            {sub.r2ObjectKey && (
              <a
                href={submissionFileUrl(sub)}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-line/40"
              >
                <Download size={13} />
                <span>
                  {t('downloadSubmittedFile')} ({sub.mimeType ?? sub.attachmentType})
                </span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 3-Way Submission Form (when not GRADED) */}
      {!isGraded && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-ink">
              {sub ? t('resubmitHomework') : t('submitHomework')}
            </h4>

            {/* Mode selection tabs */}
            <div className="inline-flex rounded-lg border border-line bg-background p-0.5 text-xs">
              <button
                type="button"
                data-testid="mode-tab-text"
                onClick={() => setMode('TEXT')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  mode === 'TEXT' ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <FileText size={13} />
                <span>{t('submissionMethodText')}</span>
              </button>
              <button
                type="button"
                data-testid="mode-tab-link"
                onClick={() => setMode('LINK')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  mode === 'LINK' ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Link2 size={13} />
                <span>{t('submissionMethodLink')}</span>
              </button>
              <button
                type="button"
                data-testid="mode-tab-file"
                onClick={() => setMode('FILE')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  mode === 'FILE' ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <UploadCloud size={13} />
                <span>{t('submissionMethodFile')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Mode: TEXT */}
            {mode === 'TEXT' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">
                  {t('yourAnswerNotes')}
                </label>
                <textarea
                  data-testid="homework-content-input"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('answerPlaceholder')}
                  className="w-full rounded-xl border border-line bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Mode: LINK */}
            {mode === 'LINK' && (
              <div className="space-y-2">
                <Input
                  data-testid="homework-url-input"
                  label={t('submissionMethodLink')}
                  dir="ltr"
                  placeholder={t('externalLinkPlaceholder')}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-soft">
                    {t('yourAnswerNotes')} ({t('optional')})
                  </label>
                  <textarea
                    rows={2}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('answerPlaceholder')}
                    className="w-full rounded-xl border border-line bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Mode: FILE */}
            {mode === 'FILE' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-soft">
                  {t('submissionMethodFile')} ({t('fileSizeMax10Mb')})
                </label>

                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    data-testid="homework-file-input"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip,.rar"
                  />

                  {file ? (
                    <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary-light/20 p-3 text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={16} className="shrink-0 text-primary" />
                        <span className="truncate font-semibold text-ink">{file.name}</span>
                        <span className="shrink-0 text-xs text-ink-soft tabular-nums">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setFileError(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="rounded p-1 text-ink-soft hover:bg-line/40 hover:text-ink"
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-background/50 p-4 transition-colors hover:border-primary/50 hover:bg-background"
                    >
                      <UploadCloud size={24} className="mb-1 text-primary" />
                      <span className="text-xs font-semibold text-ink">{t('chooseFile')}</span>
                      <span className="mt-0.5 text-[11px] text-ink-soft">{t('fileSizeMax10Mb')}</span>
                    </button>
                  )}

                  {fileError && (
                    <p data-testid="file-error" className="text-xs font-semibold text-rose-600">
                      {fileError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-soft">
                    {t('yourAnswerNotes')} ({t('optional')})
                  </label>
                  <textarea
                    rows={2}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('answerPlaceholder')}
                    className="w-full rounded-xl border border-line bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {submitMutation.error ? (
              <ErrorBox error={submitMutation.error} />
            ) : null}

            {/* Action Submit / Resubmit Button */}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                data-testid="submit-homework-button"
                disabled={submitMutation.isPending || !!fileError}
                onClick={handleSubmit}
              >
                {submitMutation.isPending ? (
                  '…'
                ) : sub ? (
                  <>
                    <RotateCcw size={16} className="inline ltr:mr-1 rtl:ml-1" />
                    <span>{t('resubmitHomework')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="inline ltr:mr-1 rtl:ml-1" />
                    <span>{t('submitHomework')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LessonHomeworkCard({
  groupId,
  lessonId,
}: {
  groupId: string;
  lessonId: string;
}) {
  const { t } = useLang();
  const homework = useQuery({
    queryKey: ['lesson-homework', groupId, lessonId],
    queryFn: () => studentApi.getLessonHomework(groupId, lessonId),
  });

  if (homework.isLoading) return <Loading />;
  if (homework.error) return <ErrorBox error={homework.error} />;

  const items = homework.data ?? [];
  if (items.length === 0) return null;

  return (
    <Card data-testid="lesson-homework-section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-ink">{t('homework')}</h2>
        </div>
        <span className="rounded-full bg-primary-light/60 px-2.5 py-0.5 text-xs font-bold text-primary-dark">
          {items.length} {items.length === 1 ? t('homework') : t('homeworkList')}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((hw) => (
          <HomeworkItemCard
            key={hw.id}
            hw={hw}
            groupId={groupId}
            lessonId={lessonId}
          />
        ))}
      </div>
    </Card>
  );
}
