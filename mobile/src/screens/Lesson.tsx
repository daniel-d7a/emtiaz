import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';

type Lesson = {
  title: string;
  content: string | null;
  completed: boolean;
  attachments: Array<{ id: string; title: string }>;
};

export default function LessonView({ lessonId, onBack, onOpenQuiz }: { lessonId: string; onBack: (refresh?: boolean) => void; onOpenQuiz?: () => void }) {
  const [data, setData] = useState<Lesson | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = () => api<Lesson>(`/api/student/lessons/${lessonId}/view`).then(setData).catch((e) => setError(e as Error));
  useEffect(() => { load(); }, [lessonId]);

  if (error) return <View style={s.page}><ErrorBox error={error} /><Btn label="رجوع" variant="ghost" onPress={() => onBack()} /></View>;
  if (!data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={() => onBack(true)} />
      <Text style={s.h1}>{data.title}</Text>
      {data.content ? (
        <Text style={{ marginBottom: 16, lineHeight: 24 }}>{data.content}</Text>
      ) : (
        <Empty text="لا محتوى نصي لهذا الدرس" />
      )}
      {data.attachments.length > 0 && (
        <Card>
          <Text style={s.h2}>المرفقات</Text>
          {data.attachments.map((a) => (
            <View key={a.id} style={s.row}>
              <Text style={{ flex: 1 }}>{a.title}</Text>
              <Btn
                label="فتح"
                variant="ghost"
                onPress={() =>
                  api<{ url: string }>(`/api/storage/attachments/${a.id}/download`)
                    .then((d) => Linking.openURL(d.url))
                    .catch((e) => setError(e as Error))
                }
              />
            </View>
          ))}
        </Card>
      )}
      {onOpenQuiz && <Btn label="اختبار الدرس" onPress={onOpenQuiz} />}
      <Btn
        label={data.completed ? 'إتمام ✓ (إلغاء؟)' : 'إتمام الدرس'}
        variant={data.completed ? 'ghost' : 'primary'}
        onPress={() =>
          data.completed
            ? undefined
            : api(`/api/student/lessons/${lessonId}/complete`, { method: 'POST', body: {} }).then(load)
        }
      />
    </ScrollView>
  );
}
