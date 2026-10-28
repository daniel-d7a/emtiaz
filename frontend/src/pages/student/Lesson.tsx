import { useState } from 'react';
import { Link, createRoute, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ExternalLink, File } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { attachmentIcon, attachmentUrl, previewableTypes } from '../../lib/attachment';
import { embedUrl } from '../../lib/embed';
import { useLang } from '../../lib/i18n';
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, Page } from '../../components/ui';
import { ThemeSurface } from '../../components/TeacherTheme';
import { StudentQuiz, studentCurriculumQuery } from './Group';
import type { StudentLessonView } from '../../../../shared/api';

export default function StudentLesson() {
  const { groupId, lessonId } = useParams({ from: '/student/groups/$groupId/lessons/$lessonId' });
  const { t } = useLang();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const curriculum = useQuery(studentCurriculumQuery(groupId));
  const { data, isLoading, error } = useQuery({
    queryKey: ['lesson-view', groupId, lessonId],
    queryFn: () => api<StudentLessonView>(`/api/student/lessons/${lessonId}/view?groupId=${groupId}`),
  });

  const complete = useMutation({
    mutationFn: () => api(`/api/student/lessons/${lessonId}/${data?.completed ? 'incomplete' : 'complete'}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['lesson-view', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['curriculum', groupId] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });

  const attachment = data?.attachments.find((a) => a.id === selected);
  const attachmentSrc = attachment ? attachmentUrl(attachment) : '';
  const videoEmbed = attachment?.fileType === 'VIDEO' && attachment.url ? embedUrl(attachment.url) : null;

  return (
    <ThemeSurface theme={curriculum.data?.teacher.theme}>
      <Page title={data?.title ?? '…'}>
        <div className="mb-5">
          <Link
            to="/student/groups/$groupId"
            params={{ groupId }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" /> {t('backToGroup')}
          </Link>
        </div>

        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data ? (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <main className="flex min-w-0 flex-col gap-5">
              <Card>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{data.title}</h2>
                  {data.completed && <Badge tone="primary">{t('completed')}</Badge>}
                </div>
                {data.content ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{data.content}</p>
                ) : (
                  <p className="text-sm text-ink-soft">—</p>
                )}
                <div className="mt-4 border-t border-line pt-4">
                  {data.completed ? (
                    <Button variant="ghost" onClick={() => complete.mutate()}>{t('markIncomplete')}</Button>
                  ) : (
                    <Button onClick={() => complete.mutate()}>
                      <CheckCircle2 className="inline" size={18} /> {t('markComplete')}
                    </Button>
                  )}
                </div>
              </Card>

              {attachment && previewableTypes.has(attachment.fileType) && (
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{attachment.title}</h3>
                    <a
                      href={attachmentSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm font-semibold text-primary underline"
                    >
                      <ExternalLink size={14} /> {t('openInNewTab')}
                    </a>
                  </div>
                  {attachment.fileType === 'IMAGE' && (
                    <img src={attachmentSrc} alt={attachment.title} className="max-h-[70vh] w-full rounded-xl border border-line object-contain" />
                  )}
                  {attachment.fileType === 'PDF' && (
                    <iframe src={attachmentSrc} title={attachment.title} className="h-[70vh] w-full rounded-xl border border-line" />
                  )}
                  {attachment.fileType === 'VIDEO' && (
                    videoEmbed ? (
                      <iframe
                        src={videoEmbed}
                        title={attachment.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full rounded-xl border border-line"
                      />
                    ) : (
                      <video src={attachmentSrc} controls className="max-h-[70vh] w-full rounded-xl border border-line" />
                    )
                  )}
                  {attachment.fileType === 'AUDIO' && (
                    <audio src={attachmentSrc} controls className="w-full" />
                  )}
                </Card>
              )}

              {data.hasQuiz && <StudentQuiz lessonId={lessonId} groupId={groupId} />}
            </main>

            <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
              <Card>
                <h2 className="mb-3 font-bold">{t('materials')}</h2>
                {data.attachments.length === 0 ? (
                  <EmptyState title={t('noMaterials')} icon={File} />
                ) : (
                  <ul className="flex flex-col gap-1">
                    {data.attachments.map((a) => {
                      const Icon = attachmentIcon(a.fileType);
                      const content = (
                        <>
                          <Icon size={18} className="shrink-0 text-primary" />
                          <span className="min-w-0 grow truncate text-sm font-semibold">{a.title}</span>
                          {previewableTypes.has(a.fileType) && <Badge tone="primary">{t('preview')}</Badge>}
                        </>
                      );
                      return (
                        <li key={a.id}>
                          {previewableTypes.has(a.fileType) ? (
                            <button
                              type="button"
                              onClick={() => setSelected(a.id)}
                              className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-start hover:bg-line/40 ${selected === a.id ? 'bg-primary-light' : ''}`}
                            >
                              {content}
                            </button>
                          ) : (
                            <a
                              href={attachmentUrl(a)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 hover:bg-line/40"
                            >
                              {content}
                              <ExternalLink size={14} className="shrink-0 text-ink-soft" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </aside>
          </div>
        ) : <Loading />}
      </Page>
    </ThemeSurface>
  );
}

export const studentLessonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/groups/$groupId/lessons/$lessonId',
  beforeLoad: () => requireRole('STUDENT'),
  component: StudentLesson,
});

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
