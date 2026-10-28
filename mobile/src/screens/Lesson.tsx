import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { StudentLessonView as Lesson } from '../../../shared/api';

export default function LessonView({ lessonId, onBack, onOpenQuiz }: { lessonId: string; onBack: (refresh?: boolean) => void; onOpenQuiz?: () => void }) {
  const qc = useQueryClient();
  const [downloadError, setDownloadError] = useState<Error | null>(null);
  const lesson = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api<Lesson>(`/api/student/lessons/${lessonId}/view`),
  });
  const complete = useMutation({
    mutationFn: () => api(`/api/student/lessons/${lessonId}/complete`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      void qc.invalidateQueries({ queryKey: ['curriculum'] });
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
            <View key={a.id} style={[s.row, { paddingVertical: 4 }]}>
              <Text style={{ flexShrink: 1 }}>{a.title}</Text>
              <Btn
                label="فتح"
                variant="ghost"
                onPress={() => {
                  setDownloadError(null);
                  api<{ url: string }>(`/api/storage/attachments/${a.id}/download`)
                    .then((d) => Linking.openURL(d.url))
                    .catch((e) => setDownloadError(e as Error));
                }}
              />
            </View>
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
      {downloadError && <ErrorBox error={downloadError} />}
      {complete.error && <ErrorBox error={complete.error} />}
    </ScrollView>
  );
}
