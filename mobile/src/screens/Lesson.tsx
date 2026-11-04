import { useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, ScrollView, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, resolveAttachmentDownloadUrl, resolveAttachmentUrl } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import { embedUrl } from '../../../shared/embed';
import type { AttachmentType, StudentLessonView as Lesson } from '../../../shared/api';

type LessonAttachment = Lesson['attachments'][number];

const typeLabel: Record<AttachmentType, string> = {
  IMAGE: 'صورة',
  PDF: 'PDF',
  DOC: 'مستند',
  AUDIO: 'صوت',
  ARCHIVE: 'أرشيف',
  LINK: 'رابط',
  VIDEO: 'فيديو',
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

export default function LessonView({ lessonId, groupId, onBack, onOpenQuiz }: { lessonId: string; groupId?: string; onBack: (refresh?: boolean) => void; onOpenQuiz?: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<{ attachment: LessonAttachment; src: string } | null>(null);
  const lesson = useQuery({
    queryKey: ['lesson', lessonId, groupId],
    queryFn: () =>
      api<Lesson>(`/api/student/lessons/${lessonId}/view${groupId ? `?groupId=${groupId}` : ''}`),
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
