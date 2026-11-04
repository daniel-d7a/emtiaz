import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { TeacherGradebook, TeacherQuizSubmissions } from '../../../shared/api';

function ManualScore({
  groupId,
  studentId,
  columnId,
  score,
}: {
  groupId: string;
  studentId: string;
  columnId: string;
  score: number | null;
}) {
  const qc = useQueryClient();
  const [raw, setRaw] = useState(score === null ? '' : String(score));
  const [error, setError] = useState(false);
  useEffect(() => {
    setRaw(score === null ? '' : String(score));
  }, [score]);
  const save = useMutation({
    mutationFn: (value: number | null) =>
      api(`/api/teacher/groups/${groupId}/gradebook/cell`, {
        method: 'PUT',
        body: { columnId, studentId, score: value },
      }),
    onSuccess: () => {
      setError(false);
      void qc.invalidateQueries({ queryKey: ['teacher-gradebook', groupId] });
    },
    onError: () => setError(true),
  });

  return (
    <View style={{ width: 92 }}>
      <TextInput
        value={raw}
        onChangeText={setRaw}
        onEndEditing={() => {
          const next = raw.trim();
          const current = score === null ? '' : String(score);
          if (next === current) return;
          if (next === '') {
            save.mutate(null);
            return;
          }
          const parsed = Number(next);
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
            setError(true);
            setRaw(current);
            return;
          }
          save.mutate(Math.round(parsed));
        }}
        keyboardType="number-pad"
        style={[
          s.input,
          { marginBottom: 0, textAlign: 'center', borderColor: error ? c.danger : c.line },
        ]}
        editable={!save.isPending}
        accessibilityLabel="الدرجة"
      />
      {error ? (
        <Text style={{ color: c.danger, fontSize: 11, textAlign: 'center', marginTop: 2 }}>
          درجة غير صحيحة
        </Text>
      ) : null}
    </View>
  );
}

function QuizSubmissions({
  groupId,
  quiz,
  onClose,
}: {
  groupId: string;
  quiz: { id: string; title: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  const submissions = useQuery({
    queryKey: ['teacher-quiz-submissions', groupId, quiz.id],
    queryFn: () =>
      api<TeacherQuizSubmissions>(
        `/api/teacher/groups/${groupId}/quizzes/${quiz.id}/submissions`,
      ),
  });
  useEffect(() => {
    if (!submissions.data) return;
    setGrades(
      Object.fromEntries(
        submissions.data.submissions.map((submission) => [
          submission.id,
          Object.fromEntries(
            Object.entries(submission.writtenGrades ?? {}).map(([questionId, value]) => [
              questionId,
              String(value),
            ]),
          ),
        ]),
      ),
    );
  }, [submissions.data]);
  const grade = useMutation({
    mutationFn: ({ attemptId, values }: { attemptId: string; values: Record<string, number> }) =>
      api(`/api/teacher/quiz-attempts/${attemptId}/grade`, {
        method: 'PUT',
        body: { grades: values },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-quiz-submissions', groupId, quiz.id] });
      void qc.invalidateQueries({ queryKey: ['teacher-gradebook', groupId] });
    },
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.page}>
        <Btn label="رجوع" variant="ghost" onPress={onClose} />
        <Text style={s.h1}>{quiz.title}</Text>
        {submissions.error ? <ErrorBox error={submissions.error} /> : null}
        {!submissions.data ? <Loading /> : null}
        {submissions.data?.submissions.length === 0 ? <Empty text="لا توجد إجابات بعد" /> : null}
        {submissions.data?.submissions.map((submission) => {
          const written = submissions.data!.questions.filter((q) => q.questionType === 'WRITTEN');
          const values = grades[submission.id] ?? {};
          return (
            <Card key={submission.id}>
              <View style={s.row}>
                <Text style={{ fontWeight: '700' }}>{submission.student.name}</Text>
                <Text style={s.badge}>
                  {submission.pending ? 'بانتظار التصحيح' : `${submission.score}/${submission.maxScore}`}
                </Text>
              </View>
              {submissions.data!.questions.map((question) => (
                <View key={question.id} style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: '600' }}>{question.prompt}</Text>
                  <Text style={{ color: c.inkSoft, fontSize: 13 }}>
                    {submission.answers[question.id] || 'لم تُجب'}
                  </Text>
                  {question.questionType === 'WRITTEN' ? (
                    <TextInput
                      value={values[question.id] ?? ''}
                      onChangeText={(value) =>
                        setGrades((current) => ({
                          ...current,
                          [submission.id]: { ...current[submission.id], [question.id]: value },
                        }))
                      }
                      keyboardType="number-pad"
                      placeholder="الدرجة من 10"
                      placeholderTextColor={c.inkSoft}
                      style={s.input}
                    />
                  ) : null}
                </View>
              ))}
              {written.length > 0 ? (
                <Btn
                  label="حفظ الدرجات"
                  loading={grade.isPending}
                  disabled={written.some((q) => !values[q.id])}
                  onPress={() =>
                    grade.mutate({
                      attemptId: submission.id,
                      values: Object.fromEntries(written.map((q) => [q.id, Number(values[q.id])])),
                    })
                  }
                />
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </Modal>
  );
}

export default function TeacherGroupGradebook({ groupId }: { groupId: string }) {
  const [filter, setFilter] = useState('');
  const [openQuiz, setOpenQuiz] = useState<{ id: string; title: string } | null>(null);
  const gradebook = useQuery({
    queryKey: ['teacher-gradebook', groupId],
    queryFn: () => api<TeacherGradebook>(`/api/teacher/groups/${groupId}/gradebook`),
  });

  if (gradebook.error) return <ErrorBox error={gradebook.error} />;
  if (!gradebook.data) return <Loading />;
  const data = gradebook.data;
  const needle = filter.trim().toLowerCase();
  const students = data.students.filter(
    (student) =>
      !needle ||
      student.name.toLowerCase().includes(needle) ||
      (student.phoneNumber ?? '').includes(needle),
  );

  return (
    <View>
      <Card>
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="ابحث بالاسم أو الهاتف"
          placeholderTextColor={c.inkSoft}
          style={s.input}
        />
        <Text style={{ color: c.inkSoft, fontSize: 13 }}>
          {students.length} طالب · {data.quizColumns.length} اختبار ·{' '}
          {data.manualColumns.length} عمود يدوي
        </Text>
      </Card>

      {data.students.length === 0 && <Empty text="لا يوجد طلاب في المجموعة" />}
      {students.length === 0 && data.students.length > 0 && <Empty text="لا توجد نتائج" />}
      {students.map((student) => (
        <Card key={student.id}>
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{student.name}</Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                {student.phoneNumber ?? 'بدون هاتف'}
              </Text>
            </View>
            <Text style={s.badge}>حضور {data.attendance[student.id] ?? 0}%</Text>
          </View>

          {data.quizColumns.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={s.label}>درجات الاختبارات</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {data.quizColumns.map((column) => {
                  const value = data.quizCells[`${student.id}:${column.quizId}`];
                  return (
                    <Pressable
                      key={column.quizId}
                      accessibilityRole="button"
                      onPress={() => setOpenQuiz({ id: column.quizId, title: column.lessonTitle })}
                      style={{
                        borderWidth: 1,
                        borderColor: c.line,
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        maxWidth: '100%',
                      }}
                    >
                      <Text style={{ color: c.inkSoft, fontSize: 11 }}>{column.lessonTitle}</Text>
                      <Text style={{ fontWeight: '700', color: c.primaryDark }}>
                        {value ?? '—'} / {column.maxScore}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {data.manualColumns.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={s.label}>الدرجات اليدوية</Text>
              {data.manualColumns.map((column) => {
                const cell = data.manualCells.find(
                  (item) => item.studentId === student.id && item.columnId === column.id,
                );
                return (
                  <View
                    key={column.id}
                    style={[s.row, { paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }]}
                  >
                    <View style={{ flexShrink: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{column.title}</Text>
                      <Text style={{ color: c.inkSoft, fontSize: 11 }}>
                        من {column.maxScore}
                      </Text>
                    </View>
                    <ManualScore
                      groupId={groupId}
                      studentId={student.id}
                      columnId={column.id}
                      score={cell?.score ?? null}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 8 }}>
              لا توجد أعمدة يدوية. أضفها من الإعدادات.
            </Text>
          )}
        </Card>
      ))}
      {openQuiz ? (
        <QuizSubmissions groupId={groupId} quiz={openQuiz} onClose={() => setOpenQuiz(null)} />
      ) : null}
    </View>
  );
}
