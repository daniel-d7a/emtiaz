import { ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { StudentCurriculum as Curriculum } from '../../../shared/api';

export default function Group({ groupId, onBack, onOpenLesson, onOpenQuiz, onOpenQuizById }: {
  groupId: string;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenQuiz: (lessonId: string) => void;
  onOpenQuizById: (quizId: string) => void;
}) {
  const qc = useQueryClient();
  const curriculum = useQuery({
    queryKey: ['curriculum', groupId],
    queryFn: () => api<Curriculum>(`/api/student/groups/${groupId}/curriculum`),
  });
  const complete = useMutation({
    mutationFn: (lessonId: string) =>
      api(`/api/student/lessons/${lessonId}/complete`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['curriculum', groupId] });
      void qc.invalidateQueries({ queryKey: ['student-groups'] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });

  if (curriculum.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={curriculum.error} />
        <Btn label="رجوع" variant="ghost" onPress={onBack} />
      </View>
    );
  }
  if (!curriculum.data) return <Loading />;
  const data = curriculum.data;

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={onBack} />
      <Text style={s.h1}>{data.group.name}</Text>
      <Text style={{ color: c.inkSoft, marginBottom: 12 }}>
        {data.course.title} — {data.group.joinCode}
      </Text>
      {data.quiz && (
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 4 }}>{data.quiz.title}</Text>
          <Btn label="اختبار المقرر" onPress={() => onOpenQuizById(data.quiz!.id)} />
        </Card>
      )}
      {data.modules.map((mod) => (
        <View key={mod.title}>
          <Text style={s.h2}>{mod.title}</Text>
          {mod.quiz && (
            <Card>
              <Text style={{ fontWeight: '700', marginBottom: 4 }}>{mod.quiz.title}</Text>
              <Btn label="اختبار الوحدة" variant="ghost" onPress={() => onOpenQuizById(mod.quiz!.id)} />
            </Card>
          )}
          {mod.lessons.map((l) => {
            const completing = complete.isPending && complete.variables === l.id;
            return (
              <Card key={l.id}>
                <View style={[s.row, { marginBottom: l.unlocked ? 4 : 0 }]}>
                  <Text style={{ fontWeight: '700', flexShrink: 1 }}>
                    {l.title} {l.completed ? '✓' : ''}
                  </Text>
                  {!l.unlocked && <Text style={s.badge}>🔒 مقفل</Text>}
                </View>
                {l.attachments.length > 0 && (
                  <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 4 }}>
                    المرفقات: {l.attachments.length}
                  </Text>
                )}
                {l.unlocked && (
                  <View style={[s.row, { justifyContent: 'flex-start' }]}>
                    <Btn label="فتح الدرس" variant="ghost" onPress={() => onOpenLesson(l.id)} />
                    {l.hasQuiz && <Btn label="اختبار" variant="ghost" onPress={() => onOpenQuiz(l.id)} />}
                    <Btn
                      label={l.completed ? 'أُتم ✓' : 'إتمام'}
                      variant={l.completed ? 'ghost' : 'primary'}
                      loading={completing}
                      disabled={l.completed}
                      onPress={() => !l.completed && complete.mutate(l.id)}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      ))}
      {data.modules.length === 0 && <Empty text="لا دروس بعد" />}
      {complete.error && <ErrorBox error={complete.error} />}
    </ScrollView>
  );
}
