import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, ErrorBox, Loading, c, s } from '../ui';
import type { QuizPayload, QuizSubmission } from '../../../shared/api';

export default function Quiz({ lessonId, quizId, groupId, onBack }: { lessonId?: string; quizId?: string; groupId: string; onBack: (refresh: boolean) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const quiz = useQuery({
    queryKey: ['quiz', quizId ?? lessonId],
    queryFn: () =>
      quizId
        ? api<QuizPayload>(`/api/student/groups/${groupId}/quizzes/${quizId}`)
        : api<QuizPayload>(`/api/student/lessons/${lessonId}/quiz`),
    enabled: !!(quizId || lessonId),
  });
  const submit = useMutation({
    mutationFn: (vars: { quizId: string; answers: Record<string, string> }) =>
      api<QuizSubmission>(`/api/student/quizzes/${vars.quizId}/submit`, { body: { groupId, answers: vars.answers } }),
    onSuccess: (res) => setResult(res),
  });

  useEffect(() => {
    if (quiz.data && !quiz.data.quiz) onBack(false);
  }, [quiz.data, onBack]);

  const error = quiz.error ?? submit.error;
  if (error) return <View style={s.page}><ErrorBox error={error} /><Btn label="رجوع" variant="ghost" onPress={() => onBack(false)} /></View>;
  if (!quiz.data) return <Loading />;
  const data = quiz.data;
  const quizData = data.quiz;
  if (!quizData) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={() => onBack(!!result)} />
      {result ? (
        <>
          <Text style={s.h1}>{result.score} / {result.maxScore}</Text>
          {result.result.map((r, i) => (
            <Card key={r.questionId}>
              <Text style={{ fontWeight: '700' }}>{r.correct ? '✓ صحيح' : '✗ خطأ'} — سؤال {i + 1}</Text>
              <Text style={{ color: c.inkSoft }}>الجواب الصحيح: {r.expected}{r.explanation ? ` — ${r.explanation}` : ''}</Text>
            </Card>
          ))}
          <Btn label="إعادة المحاولة" variant="ghost" onPress={() => { setResult(null); setAnswers({}); submit.reset(); }} />
        </>
      ) : (
        <>
          <Text style={s.h1}>{quizData.title}</Text>
          {data.questions.map((q, i) => (
            <Card key={q.id}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>{i + 1}. {q.prompt} ({q.points})</Text>
              {q.options ? (
                <View style={{ gap: 8 }}>
                  {q.options.map((opt) => (
                    <TouchableHighlight
                      key={opt}
                      underlayColor={c.primaryLight}
                      onPress={() => setAnswers({ ...answers, [q.id]: opt })}
                      style={[{ borderRadius: 10, borderWidth: 1, borderColor: c.line, padding: 10, backgroundColor: c.card }, answers[q.id] === opt && { borderColor: c.primary, backgroundColor: c.primaryLight }]}
                    >
                      <Text>{opt}</Text>
                    </TouchableHighlight>
                  ))}
                </View>
              ) : q.questionType === 'TRUE_FALSE' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['true', 'false'].map((opt) => (
                    <TouchableHighlight
                      key={opt}
                      underlayColor={c.primaryLight}
                      onPress={() => setAnswers({ ...answers, [q.id]: opt })}
                      style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: answers[q.id] === opt ? c.primary : c.line, padding: 10, backgroundColor: answers[q.id] === opt ? c.primaryLight : c.card, alignItems: 'center' }}
                    >
                      <Text>{opt === 'true' ? '✓' : '✗'}</Text>
                    </TouchableHighlight>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={s.input}
                  value={answers[q.id] ?? ''}
                  onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
                  placeholder="اكتب جوابك…"
                />
              )}
            </Card>
          ))}
          <Btn
            label={submit.isPending ? '…' : 'إرسال'}
            disabled={submit.isPending}
            onPress={() => submit.mutate({ quizId: quizData.id, answers })}
          />
        </>
      )}
    </ScrollView>
  );
}
