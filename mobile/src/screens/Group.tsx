import { ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';
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
    },
  });

  if (curriculum.error) return <View style={s.page}><ErrorBox error={curriculum.error} /></View>;
  if (!curriculum.data) return <Loading />;
  const data = curriculum.data;

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={onBack} />
      <Text style={s.h1}>{data.group.name}</Text>
      <Text style={{ color: '#78716C', marginBottom: 12 }}>{data.course.title} — {data.group.joinCode}</Text>
      {data.quiz && (
        <Card>
          <View style={s.row}>
            <Text style={{ fontWeight: '700', flex: 1, textAlign: 'right' }}>{data.quiz.title}</Text>
            <Btn label="اختبار المقرر" onPress={() => onOpenQuizById(data.quiz!.id)} />
          </View>
        </Card>
      )}
      {data.modules.map((mod) => (
        <View key={mod.title}>
          <Text style={s.h2}>{mod.title}</Text>
          {mod.quiz && (
            <Card>
              <View style={s.row}>
                <Text style={{ fontWeight: '700', flex: 1, textAlign: 'right' }}>{mod.quiz.title}</Text>
                <Btn label="اختبار الوحدة" variant="ghost" onPress={() => onOpenQuizById(mod.quiz!.id)} />
              </View>
            </Card>
          )}
          {mod.lessons.map((l) => (
            <Card key={l.id}>
              <View style={s.row}>
                <Text style={{ fontWeight: '700', flex: 1, textAlign: 'right' }} onPress={() => onOpenLesson(l.id)}>
                  {l.title} {l.completed ? '✓' : ''}
                </Text>
                {l.unlocked ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {l.hasQuiz && <Btn label="اختبار" variant="ghost" onPress={() => onOpenQuiz(l.id)} />}
                    <Btn
                      label={l.completed ? 'أُتم ✓' : 'إتمام'}
                      variant={l.completed ? 'ghost' : 'primary'}
                      disabled={complete.isPending}
                      onPress={() => !l.completed && complete.mutate(l.id)}
                    />
                  </View>
                ) : (
                  <Text style={s.badge}>🔒 مقفل</Text>
                )}
              </View>
            </Card>
          ))}
        </View>
      ))}
      {data.modules.length === 0 && <Empty text="لا دروس بعد" />}
      {complete.error && <ErrorBox error={complete.error} />}
    </ScrollView>
  );
}
