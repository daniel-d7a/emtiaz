import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { StudentCurriculum as Curriculum, StudentGrades as Grades } from '../../../shared/api';

export default function Group({ groupId, onBack, onOpenLesson, onOpenQuiz, onOpenQuizById }: {
  groupId: string;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenQuiz: (lessonId: string) => void;
  onOpenQuizById: (quizId: string) => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'lessons' | 'grades'>('lessons');
  const curriculum = useQuery({
    queryKey: ['curriculum', groupId],
    queryFn: () => api<Curriculum>(`/api/student/groups/${groupId}/curriculum`),
  });
  const grades = useQuery({
    queryKey: ['grades', groupId],
    queryFn: () => api<Grades>(`/api/student/groups/${groupId}/grades`),
    enabled: tab === 'grades',
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
      <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
        <Btn
          label="الدروس"
          variant={tab === 'lessons' ? 'primary' : 'ghost'}
          onPress={() => setTab('lessons')}
        />
        <Btn
          label="درجاتي"
          variant={tab === 'grades' ? 'primary' : 'ghost'}
          onPress={() => setTab('grades')}
        />
      </View>

      {tab === 'grades' ? (
        <>
          {grades.error && <ErrorBox error={grades.error} />}
          {!grades.data ? <Loading /> : (
            <Card>
              {grades.data.quizzes.length === 0 && grades.data.manual.length === 0 && (
                <Text style={{ color: c.inkSoft }}>—</Text>
              )}
              {grades.data.quizzes.map((quiz) => (
                <View
                  key={quiz.quizId}
                  style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{quiz.title}</Text>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                      {[quiz.unitTitle, quiz.lessonTitle].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {quiz.pending && <Text style={s.badge}>بانتظار التصحيح</Text>}
                    <Text style={{ fontWeight: '700' }}>{quiz.score}/{quiz.maxScore}</Text>
                  </View>
                </View>
              ))}
              {grades.data.manual.map((row) => (
                <View
                  key={row.columnId}
                  style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
                >
                  <Text style={{ flexShrink: 1 }}>
                    {row.title}{row.note ? ` — ${row.note}` : ''}
                  </Text>
                  <Text style={{ fontWeight: '700' }}>{row.score ?? '—'}/{row.maxScore}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          {data.quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <Text style={{ fontWeight: '700', marginBottom: 4 }}>{quiz.title}</Text>
              <Btn label="اختبار المقرر" onPress={() => onOpenQuizById(quiz.id)} />
            </Card>
          ))}
          {data.modules.map((mod) => (
            <View key={mod.title}>
              <Text style={s.h2}>{mod.title}</Text>
              {mod.quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <Text style={{ fontWeight: '700', marginBottom: 4 }}>{quiz.title}</Text>
                  <Btn label="اختبار الوحدة" variant="ghost" onPress={() => onOpenQuizById(quiz.id)} />
                </Card>
              ))}
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
                      <View style={{ gap: 4 }}>
                        <View style={[s.row, { justifyContent: 'flex-start' }]}>
                          <Btn label="فتح الدرس" variant="ghost" onPress={() => onOpenLesson(l.id)} />
                          <Btn
                            label={l.completed ? 'أُتم ✓' : 'إتمام'}
                            variant={l.completed ? 'ghost' : 'primary'}
                            loading={completing}
                            disabled={l.completed}
                            onPress={() => !l.completed && complete.mutate(l.id)}
                          />
                        </View>
                        {l.quizzes.map((quiz) => (
                          <Btn
                            key={quiz.id}
                            label={`اختبار: ${quiz.title}`}
                            variant="ghost"
                            onPress={() => onOpenQuizById(quiz.id)}
                          />
                        ))}
                      </View>
                    )}
                  </Card>
                );
              })}
            </View>
          ))}
          {data.modules.length === 0 && <Empty text="لا دروس بعد" />}
          {complete.error && <ErrorBox error={complete.error} />}
        </>
      )}
    </ScrollView>
  );
}
