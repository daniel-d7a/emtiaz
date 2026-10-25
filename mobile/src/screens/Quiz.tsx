import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { api } from '../api';
import { Btn, Card, ErrorBox, Loading, c, s } from '../ui';

type QuizPayload = {
  quiz: { id: string; title: string };
  questions: Array<{
    id: string;
    questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    prompt: string;
    options: string[] | null;
    points: number;
  }>;
};

export default function Quiz({ lessonId, groupId, onBack }: { lessonId: string; groupId: string; onBack: (refresh: boolean) => void }) {
  const [data, setData] = useState<QuizPayload | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<QuizPayload>(`/api/student/lessons/${lessonId}/quiz`)
      .then((d) => (d.quiz ? setData(d) : onBack(false)))
      .catch((e) => setError(e as Error));
  }, [lessonId]);

  if (error) return <View style={s.page}><ErrorBox error={error} /><Btn label="رجوع" variant="ghost" onPress={() => onBack(false)} /></View>;
  if (!data) return <Loading />;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api(`/api/student/quizzes/${data!.quiz.id}/submit`, { body: { groupId, answers } });
      setResult(res);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={() => onBack(!!result)} />
      {result ? (
        <>
          <Text style={s.h1}>{result.score} / {result.maxScore}</Text>
          {result.result.map((r: any, i: number) => (
            <Card key={r.questionId}>
              <Text style={{ fontWeight: '700' }}>{r.correct ? '✓ صحيح' : '✗ خطأ'} — سؤال {i + 1}</Text>
              <Text style={{ color: c.inkSoft }}>الجواب الصحيح: {r.expected}{r.explanation ? ` — ${r.explanation}` : ''}</Text>
            </Card>
          ))}
          <Btn label="إعادة المحاولة" variant="ghost" onPress={() => { setResult(null); setAnswers({}); setError(null); }} />
        </>
      ) : (
        <>
          <Text style={s.h1}>{data.quiz.title}</Text>
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
          <Btn label={busy ? '…' : 'إرسال'} onPress={submit} />
          {error && <ErrorBox error={error} />}
        </>
      )}
    </ScrollView>
  );
}
