import { useEffect, useState } from 'react';
import { ScrollView, TextInput, TouchableHighlight, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, ErrorBox, Loading, Text, c, s } from '../ui';
import type { QuizPayload, QuizSubmission } from '../../../shared/api';

export default function Quiz({ lessonId, quizId, groupId, onBack }: { lessonId?: string; quizId?: string; groupId: string; onBack: (refresh: boolean) => void }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [retry, setRetry] = useState(false);
  const quiz = useQuery({
    queryKey: ['quiz', groupId, quizId ?? lessonId],
    queryFn: () =>
      quizId
        ? api<QuizPayload>(`/api/student/groups/${groupId}/quizzes/${quizId}`)
        : api<QuizPayload>(`/api/student/lessons/${lessonId}/quiz?groupId=${groupId}`),
    enabled: !!(quizId || lessonId),
  });
  const cleanAnswers = (values: Record<string, string>) =>
    Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
  const submit = useMutation({
    mutationFn: (vars: { quizId: string; answers: Record<string, string> }) =>
      api<QuizSubmission>(`/api/student/quizzes/${vars.quizId}/submit`, {
        body: { groupId, answers: cleanAnswers(vars.answers) },
      }),
    onSuccess: (res) => {
      setRetry(false);
      setResult(res);
      void qc.invalidateQueries({ queryKey: ['student-home'] });
      void qc.invalidateQueries({ queryKey: ['curriculum'] });
    },
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
  const shown = retry ? null : result ?? data.attempt ?? null;

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={() => onBack(!!shown)} />
      {shown ? (
        <>
          <Text style={s.h1}>{quizData.title}</Text>
          {shown.pending ? (
            <Text style={s.h2}>بانتظار التصحيح</Text>
          ) : (
            <Text style={s.h2}>{shown.score} / {shown.maxScore}</Text>
          )}
          {shown.result.map((r, i) => {
            const question = data.questions.find((q) => q.id === r.questionId);
            const awaitingGrade = shown.pending && question?.questionType === 'WRITTEN';
            return (
              <Card key={r.questionId}>
                <Text style={{ fontWeight: '700' }}>
                  {awaitingGrade ? '⏳ بانتظار التصحيح' : r.correct ? '✓ صحيح' : '✗ خطأ'} — سؤال {i + 1}
                </Text>
                {!awaitingGrade && (
                  <Text style={{ color: c.inkSoft }}>
                    {question?.questionType === 'WRITTEN' ? 'الإجابة النموذجية' : 'الجواب الصحيح'}: {r.expected}
                    {r.explanation ? ` — ${r.explanation}` : ''}
                  </Text>
                )}
              </Card>
            );
          })}
          <Btn label="إعادة المحاولة" variant="ghost" onPress={() => { setRetry(true); setResult(null); setAnswers({}); submit.reset(); }} />
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
                      onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: answers[q.id] === opt }}
                      style={[{ minHeight: 48, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.line, padding: 12, backgroundColor: c.card }, answers[q.id] === opt && { borderColor: c.primary, backgroundColor: c.primaryLight }]}
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
                      onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: answers[q.id] === opt }}
                      style={{ flex: 1, minHeight: 48, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: answers[q.id] === opt ? c.primary : c.line, padding: 12, backgroundColor: answers[q.id] === opt ? c.primaryLight : c.card, alignItems: 'center' }}
                    >
                      <Text>{opt === 'true' ? '✓ صح' : '✗ خطأ'}</Text>
                    </TouchableHighlight>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={[s.input, { minHeight: 96 }]}
                  multiline
                  maxLength={5000}
                  value={answers[q.id] ?? ''}
                  onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  placeholder="اكتب جوابك…"
                  placeholderTextColor={c.inkSoft}
                />
              )}
            </Card>
          ))}
          <Btn
            label="إرسال"
            loading={submit.isPending}
            disabled={Object.keys(answers).length === 0}
            onPress={() => submit.mutate({ quizId: quizData.id, answers })}
          />
        </>
      )}
    </ScrollView>
  );
}
