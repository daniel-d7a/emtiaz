import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { TeacherAttendance, TeacherPacing } from '../../../shared/api';

export default function TeacherGroupAttendance({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<TeacherPacing>(`/api/teacher/groups/${groupId}/pacing`),
  });
  const lessons = pacing.data?.lessons ?? [];
  const [lessonId, setLessonId] = useState('');
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!lessonId && lessons[0]) setLessonId(lessons[0].id);
  }, [lessonId, lessons]);

  const attendance = useQuery({
    queryKey: ['attendance', groupId, lessonId],
    queryFn: () => api<TeacherAttendance>(`/api/teacher/groups/${groupId}/lessons/${lessonId}/attendance`),
    enabled: Boolean(lessonId),
  });

  useEffect(() => {
    if (!attendance.data) return;
    setMarks(
      Object.fromEntries(
        attendance.data.students
          .filter((student) => student.isPresent !== null)
          .map((student) => [student.studentId, student.isPresent as boolean]),
      ),
    );
  }, [attendance.data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/lessons/${lessonId}/attendance`, {
        method: 'PUT',
        body: {
          records: Object.entries(marks).map(([studentId, isPresent]) => ({ studentId, isPresent })),
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['group-stats', groupId] });
    },
  });

  if (pacing.error) return <ErrorBox error={pacing.error} />;
  if (!pacing.data) return <Loading />;
  if (lessons.length === 0) return <Empty text="لا توجد دروس بعد" />;

  return (
    <Card>
      <Text style={s.h2}>اختر درساً</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 12 }}>
        {lessons.map((lesson) => {
          const selected = lesson.id === lessonId;
          return (
            <Pressable
              key={lesson.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setLessonId(lesson.id)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? c.primary : c.line,
                backgroundColor: selected ? c.primaryLight : c.card,
              }}
            >
              <Text style={{ color: selected ? c.primaryDark : c.ink, fontWeight: '600' }}>{lesson.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {attendance.isLoading ? <Loading /> : attendance.error ? <ErrorBox error={attendance.error} /> : attendance.data && attendance.data.students.length === 0 ? (
        <Empty text="لا يوجد طلاب في هذه المجموعة" />
      ) : attendance.data ? (
        <>
          <View style={[s.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <Btn
              label="تحديد الكل حاضر"
              variant="ghost"
              onPress={() =>
                setMarks(Object.fromEntries(attendance.data!.students.map((student) => [student.studentId, true])))
              }
            />
            <Btn
              label="حفظ"
              loading={save.isPending}
              disabled={Object.keys(marks).length === 0}
              onPress={() => save.mutate()}
            />
          </View>
          {attendance.data.students.map((student) => {
            const mark = marks[student.studentId];
            return (
              <View
                key={student.studentId}
                style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
              >
                <Text style={{ flexShrink: 1, fontWeight: '600' }}>{student.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: mark === true }}
                    onPress={() => setMarks((current) => ({ ...current, [student.studentId]: true }))}
                    style={{
                      minHeight: 40,
                      minWidth: 64,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: mark === true ? c.primary : c.line,
                    }}
                  >
                    <Text style={{ color: mark === true ? c.onPrimary : c.inkSoft, fontWeight: '700', fontSize: 13 }}>حاضر</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: mark === false }}
                    onPress={() => setMarks((current) => ({ ...current, [student.studentId]: false }))}
                    style={{
                      minHeight: 40,
                      minWidth: 64,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: mark === false ? c.danger : c.line,
                    }}
                  >
                    <Text style={{ color: mark === false ? c.onPrimary : c.inkSoft, fontWeight: '700', fontSize: 13 }}>غائب</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
      ) : null}
      {save.error && <ErrorBox error={save.error} />}
    </Card>
  );
}
