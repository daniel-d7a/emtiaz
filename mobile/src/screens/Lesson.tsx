import { useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, resolveAttachmentUrl } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
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

function AttachmentRow({ attachment }: { attachment: LessonAttachment }) {
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
      <Btn label="فتح" variant="ghost" onPress={open} />
    </View>
  );
}

export default function LessonView({ lessonId, groupId, onBack, onOpenQuiz }: { lessonId: string; groupId?: string; onBack: (refresh?: boolean) => void; onOpenQuiz?: () => void }) {
  const qc = useQueryClient();
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
            <AttachmentRow key={a.id} attachment={a} />
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
  );
}
