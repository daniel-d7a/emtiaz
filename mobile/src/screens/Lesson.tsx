import { useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, ScrollView, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, resolveAttachmentDownloadUrl, resolveAttachmentUrl, studentApi } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import { embedUrl } from '../../../shared/embed';
import type { AttachmentType, StudentHomeworkDto, StudentLessonView as Lesson, SubmitHomeworkDto } from '../../../shared/api';

type LessonAttachment = Lesson['attachments'][number];

const typeLabel: Record<AttachmentType, string> = {
  IMAGE: 'صورة',
  PDF: 'PDF',
  DOC: 'مستند',
  AUDIO: 'صوت',
  ARCHIVE: 'أرشيف',
  LINK: 'رابط',
  VIDEO: 'فيديو',
  NONE: 'بدون',
  OTHER: 'أخرى',
};

function mediaHtml(src: string, tag: 'video' | 'audio') {
  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
<${tag} src="${src}" controls autoplay playsinline style="max-width:100%;max-height:100%"></${tag}>
</body></html>`;
}

function viewerSource(attachment: LessonAttachment, src: string) {
  if (attachment.fileType === 'PDF' && Platform.OS === 'android') {
    return { uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(src)}` };
  }
  if (attachment.fileType === 'VIDEO' && attachment.url) {
    const embed = embedUrl(attachment.url);
    if (embed) return { uri: embed };
  }
  if (attachment.fileType === 'VIDEO') return { html: mediaHtml(src, 'video'), baseUrl: src };
  if (attachment.fileType === 'AUDIO') return { html: mediaHtml(src, 'audio'), baseUrl: src };
  return { uri: src };
}

function AttachmentRow({ attachment, onOpen }: { attachment: LessonAttachment; onOpen: (a: LessonAttachment, src: string) => void }) {
  const [error, setError] = useState<Error | null>(null);
  const image = useQuery({
    queryKey: ['attachment-url', attachment.id],
    queryFn: () => resolveAttachmentUrl(attachment),
    enabled: attachment.fileType === 'IMAGE',
    staleTime: Infinity,
  });
  const open = () => {
    setError(null);
    resolveAttachmentUrl(attachment)
      .then((url) => onOpen(attachment, url))
      .catch((e) => setError(e as Error));
  };
  const download = () => {
    setError(null);
    resolveAttachmentDownloadUrl(attachment)
      .then((url) => Linking.openURL(url))
      .catch((e) => setError(e as Error));
  };
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
      <View style={s.row}>
        <Text style={{ flexShrink: 1, fontWeight: '600' }}>{attachment.title}</Text>
        <Text style={{ color: c.inkSoft, fontSize: 12 }}>{typeLabel[attachment.fileType]}</Text>
      </View>
      {attachment.fileType === 'IMAGE' && image.data ? (
        <Image
          source={{ uri: image.data }}
          resizeMode="contain"
          style={{ width: '100%', height: 220, borderRadius: 12, marginTop: 8, backgroundColor: c.line }}
        />
      ) : null}
      {image.error && <ErrorBox error={image.error} />}
      {error && <ErrorBox error={error} />}
      <View style={s.row}>
        <Btn label="فتح" variant="ghost" onPress={open} />
        {!attachment.url && <Btn label="تنزيل" variant="ghost" onPress={download} />}
      </View>
    </View>
  );
}

function formatDueDateCountdown(dueDateStr: string | null | undefined): { text: string; isPast: boolean } | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    return { text: 'متأخر', isPast: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours === 0) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return { text: `ينتهي بعد ${diffMins} دقيقة`, isPast: false };
    }
    return { text: `ينتهي خلال ${diffHours} ساعة`, isPast: false };
  }
  if (diffDays === 1) {
    return { text: 'ينتهي غداً', isPast: false };
  }
  if (diffDays === 2) {
    return { text: 'ينتهي بعد يومين', isPast: false };
  }
  if (diffDays <= 10) {
    return { text: `ينتهي بعد ${diffDays} أيام`, isPast: false };
  }
  return { text: `ينتهي بعد ${diffDays} يوماً`, isPast: false };
}

function StatusBadge({
  label,
  bg,
  text,
  border,
}: {
  label: string;
  bg: string;
  text: string;
  border: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>{label}</Text>
    </View>
  );
}

function LessonHomeworkItem({
  hw,
  groupId,
  lessonId,
  isLast,
}: {
  hw: StudentHomeworkDto;
  groupId: string;
  lessonId: string;
  isLast: boolean;
}) {
  const qc = useQueryClient();
  const sub = hw.submission;
  const [content, setContent] = useState(sub?.content ?? '');
  const [url, setUrl] = useState(sub?.url ?? '');

  const submitMutation = useMutation({
    mutationFn: (dto: SubmitHomeworkDto) => studentApi.submitHomework(groupId, hw.id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson-homework', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
      Alert.alert('تم التسليم', 'تم إرسال إجابة الواجب بنجاح');
    },
    onError: (err: any) => {
      Alert.alert('تعذر التسليم', err?.message || 'حدث خطأ أثناء تسليم الواجب');
    },
  });

  const dueCountdown = formatDueDateCountdown(hw.dueDate);
  const isGraded = sub?.status === 'GRADED';
  const isRevisionRequested = sub?.status === 'REVISION_REQUESTED';

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingTop: 12,
        marginTop: 12,
        paddingBottom: isLast ? 0 : 8,
      }}
    >
      {/* Title & Max Score */}
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <Text style={[s.h2, { fontSize: 16, flexShrink: 1, marginBottom: 4 }]}>{hw.title}</Text>
        <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontWeight: '600' }}>
            {hw.maxScore} درجة
          </Text>
        </View>
      </View>

      {/* Due date countdown & Status Badge */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
        {!sub ? (
          <StatusBadge label="لم يسلم" bg="#F3F4F6" text="#4B5563" border="#E5E7EB" />
        ) : isGraded ? (
          <StatusBadge
            label={`مكتمل ومصحح (${sub.score ?? 0}/${hw.maxScore})`}
            bg="#DCFCE7"
            text="#166534"
            border="#86EFAC"
          />
        ) : isRevisionRequested ? (
          <StatusBadge label="مطلوب تعديل" bg="#FEF2F2" text="#B91C1C" border="#FECACA" />
        ) : sub.isLate ? (
          <StatusBadge label="تم التسليم (متأخر)" bg="#FFEDD5" text="#EA580C" border="#FDBA74" />
        ) : (
          <StatusBadge label="تم التسليم" bg="#CCFBF1" text="#0F766E" border="#99F6E4" />
        )}

        {dueCountdown && (
          <StatusBadge
            label={dueCountdown.text}
            bg={dueCountdown.isPast ? '#FEF2F2' : '#FEF3C7'}
            text={dueCountdown.isPast ? '#B91C1C' : '#92400E'}
            border={dueCountdown.isPast ? '#FECACA' : '#FDE68A'}
          />
        )}
      </View>

      {/* Due date full text */}
      {hw.dueDate && (
        <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 6 }}>
          موعد التسليم:{' '}
          {new Date(hw.dueDate).toLocaleDateString('ar-OM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      )}

      {/* Instructions */}
      {hw.instructions ? (
        <Text style={{ color: c.ink, fontSize: 14, lineHeight: 22, marginBottom: 8 }}>
          {hw.instructions}
        </Text>
      ) : null}

      {/* Reference file / link button */}
      {hw.url && (
        <View style={{ marginBottom: 10 }}>
          <Btn
            label={hw.attachmentType === 'LINK' ? '🔗 فتح الرابط المرجعي' : '📄 فتح الملف المرفق'}
            variant="ghost"
            onPress={() =>
              Linking.openURL(hw.url!).catch((e) =>
                Alert.alert('تعذر فتح الرابط', e instanceof Error ? e.message : String(e)),
              )
            }
          />
        </View>
      )}

      {/* Teacher Feedback Box */}
      {sub?.teacherFeedback ? (
        <View
          style={{
            backgroundColor: '#FFFBEB',
            borderWidth: 1,
            borderColor: '#FDE68A',
            borderRadius: 12,
            padding: 12,
            marginVertical: 8,
          }}
        >
          <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 13, marginBottom: 4 }}>
            ملاحظات المعلم:
          </Text>
          <Text style={{ color: '#78350F', fontSize: 14, lineHeight: 22 }}>
            {sub.teacherFeedback}
          </Text>
          {isRevisionRequested && (
            <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '600', marginTop: 6 }}>
              ⚠️ يرجى تعديل الإجابة وإعادة التسليم حسب ملاحظات المعلم.
            </Text>
          )}
        </View>
      ) : null}

      {/* Existing submission details */}
      {sub && (
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginVertical: 6 }}>
          <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 2 }}>
            تاريخ آخر تسليم:{' '}
            {new Date(sub.submittedAt).toLocaleDateString('ar-OM', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {sub.revisionCount > 0 ? ` (تعديل رقم ${sub.revisionCount})` : ''}
          </Text>
          {sub.content ? (
            <Text style={{ color: c.ink, fontSize: 13, marginTop: 4 }}>
              نص الإجابة: {sub.content}
            </Text>
          ) : null}
          {sub.url ? (
            <View style={{ marginTop: 4 }}>
              <Btn
                label="🔗 فتح الرابط المسلّم"
                variant="ghost"
                onPress={() =>
                  Linking.openURL(sub.url!).catch((e) =>
                    Alert.alert('تعذر فتح الرابط', e instanceof Error ? e.message : String(e)),
                  )
                }
              />
            </View>
          ) : null}
        </View>
      )}

      {/* Submission Form (only when not GRADED) */}
      {!isGraded && (
        <View style={{ marginTop: 8 }}>
          <Field
            label="إجابتك / ملاحظاتك"
            value={content}
            onChange={setContent}
            multiline
            placeholder="اكتب إجابتك أو ملاحظاتك هنا..."
          />
          <Field
            label="رابط خارجي (Drive, Google Docs, إلخ)"
            value={url}
            onChange={setUrl}
            dir="ltr"
            placeholder="https://..."
          />
          <Btn
            label={sub ? 'إعادة التسليم' : 'تسليم الواجب'}
            onPress={() => {
              const trimmedContent = content.trim();
              const trimmedUrl = url.trim();
              if (!trimmedContent && !trimmedUrl) {
                Alert.alert('تنبيه', 'يرجى كتابة نص الإجابة أو إدخال رابط خارجي');
                return;
              }
              submitMutation.mutate({
                content: trimmedContent || null,
                url: trimmedUrl || null,
                attachmentType: trimmedUrl ? 'LINK' : 'NONE',
              });
            }}
            loading={submitMutation.isPending}
            disabled={!content.trim() && !url.trim()}
          />
          {submitMutation.error && <ErrorBox error={submitMutation.error} />}
        </View>
      )}
    </View>
  );
}

export default function LessonView({ lessonId, groupId, onBack, onOpenQuiz }: { lessonId: string; groupId?: string; onBack: (refresh?: boolean) => void; onOpenQuiz?: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<{ attachment: LessonAttachment; src: string } | null>(null);
  const lesson = useQuery({
    queryKey: ['lesson', lessonId, groupId],
    queryFn: () =>
      api<Lesson>(`/api/student/lessons/${lessonId}/view${groupId ? `?groupId=${groupId}` : ''}`),
  });
  const homeworkQuery = useQuery({
    queryKey: ['lesson-homework', groupId, lessonId],
    queryFn: () => (groupId ? studentApi.getLessonHomework(groupId, lessonId) : Promise.resolve([])),
    enabled: !!groupId,
  });
  const complete = useMutation({
    mutationFn: () => api(`/api/student/lessons/${lessonId}/complete`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      void qc.invalidateQueries({ queryKey: ['curriculum'] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });

  if (lesson.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={lesson.error} />
        <Btn label="رجوع" variant="ghost" onPress={() => onBack()} />
      </View>
    );
  }
  if (!lesson.data) return <Loading />;
  const data = lesson.data;

  return (
    <>
      <ScrollView style={s.page}>
        <Btn label="رجوع" variant="ghost" onPress={() => onBack(true)} />
        <Text style={s.h1}>{data.title}</Text>
        {data.content ? (
          <Text style={{ marginBottom: 16, lineHeight: 26 }}>{data.content}</Text>
        ) : (
          <Empty text="لا محتوى نصي لهذا الدرس" />
        )}
        {data.attachments.length > 0 && (
          <Card>
            <Text style={s.h2}>المرفقات</Text>
            {data.attachments.map((a) => (
              <AttachmentRow key={a.id} attachment={a} onOpen={(attachment, src) => setSelected({ attachment, src })} />
            ))}
          </Card>
        )}
        {groupId && (
          <Card>
            <View style={[s.row, { marginBottom: 4 }]}>
              <Text style={s.h2}>الواجب المنزلي</Text>
              {homeworkQuery.data && homeworkQuery.data.length > 0 && (
                <View style={{ backgroundColor: c.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                  <Text style={{ color: c.primaryDark, fontSize: 12, fontWeight: '700' }}>
                    {homeworkQuery.data.length} {homeworkQuery.data.length === 1 ? 'واجب' : 'واجبات'}
                  </Text>
                </View>
              )}
            </View>
            {homeworkQuery.isLoading ? (
              <Loading />
            ) : homeworkQuery.error ? (
              <ErrorBox error={homeworkQuery.error} />
            ) : !homeworkQuery.data || homeworkQuery.data.length === 0 ? (
              <Empty text="لا يوجد واجب منزلي لهذا الدرس" />
            ) : (
              homeworkQuery.data.map((hw, idx) => (
                <LessonHomeworkItem
                  key={hw.id}
                  hw={hw}
                  groupId={groupId}
                  lessonId={lessonId}
                  isLast={idx === (homeworkQuery.data?.length ?? 1) - 1}
                />
              ))
            )}
          </Card>
        )}
        {onOpenQuiz && <Btn label="اختبار الدرس" onPress={onOpenQuiz} />}
        <Btn
          label={data.completed ? 'إتمام ✓' : 'إتمام الدرس'}
          variant={data.completed ? 'ghost' : 'primary'}
          loading={complete.isPending}
          disabled={data.completed}
          onPress={() => !data.completed && complete.mutate()}
        />
        {complete.error && <ErrorBox error={complete.error} />}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 48, paddingHorizontal: 16 }}>
          <View style={s.row}>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 18 }} numberOfLines={2}>{selected?.attachment.title}</Text>
            <Btn label="إغلاق" variant="ghost" onPress={() => setSelected(null)} />
          </View>
          {selected && (
            <View style={{ flex: 1, marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
              {selected.attachment.fileType === 'IMAGE' ? (
                <Image source={{ uri: selected.src }} resizeMode="contain" style={{ flex: 1, backgroundColor: c.line }} />
              ) : (
                <WebView
                  source={viewerSource(selected.attachment, selected.src)}
                  originWhitelist={['*']}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  startInLoadingState
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}
          {selected && !selected.attachment.url && (
            <Btn
              label="تنزيل"
              onPress={() =>
                resolveAttachmentDownloadUrl(selected.attachment)
                  .then((url) => Linking.openURL(url))
                  .catch((e) => Alert.alert('تعذر التنزيل', e instanceof Error ? e.message : String(e)))
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}
