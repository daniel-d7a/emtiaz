import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import type { ParentChild as Child, StudentGrades as Grades } from '../../../shared/api';

export default function ParentHome() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const children = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api<Child[]>('/api/parent/students'),
  });
  const link = useMutation({
    mutationFn: () => api('/api/parent/link', { body: { phoneNumber: phone.trim() } }),
    onSuccess: () => {
      setPhone('');
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });
  const unlink = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/parent/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['parent-students'] }),
  });

  return (
    <ScrollView style={s.page} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>أبنائي</Text>
      <Card>
        <Field label="رقم هاتف الطالب" value={phone} onChange={setPhone} keyboardType="phone-pad" />
        <Btn
          label="ربط الطالب"
          onPress={() => link.mutate()}
          disabled={phone.trim().length < 8}
          loading={link.isPending}
        />
        {link.error && <ErrorBox error={link.error} />}
      </Card>
      {unlink.error && <ErrorBox error={unlink.error} />}
      {children.isLoading ? <Loading /> : children.error ? <ErrorBox error={children.error} /> : (
        <>
          {children.data?.map((child) => (
            <Card key={child.id}>
              <Text style={s.h2}>{child.name}</Text>
              <Text style={{ color: c.inkSoft, marginBottom: 8 }}>{child.email}</Text>
              <Btn
                label="فصل الطالب"
                variant="ghost"
                loading={unlink.isPending && unlink.variables === child.id}
                onPress={() =>
                  Alert.alert(
                    'فصل الطالب',
                    `هل تريد فصل ${child.name}؟ ستحتاج إلى ربطه مرة أخرى لعرض تقدمه.`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'فصل',
                        style: 'destructive',
                        onPress: () => unlink.mutate(child.id),
                      },
                    ],
                  )
                }
              />
              {child.groups.map((g) => {
                const key = `${child.id}:${g.group.id}`;
                return (
                  <View key={key} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
                    <Text style={{ fontWeight: '700' }}>{g.course.title}</Text>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                      {g.group.name} · {g.teacher.name}
                    </Text>
                    <View style={s.progress}>
                      <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]} />
                    </View>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>التقدم: {g.progress}%</Text>
                    <View style={[s.row, { justifyContent: 'flex-start', marginTop: 4 }]}>
                      <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                        الحضور: {g.attendance.present}/{g.attendance.total} ({g.attendance.percent}%)
                      </Text>
                      <Text style={{ color: c.inkSoft, fontSize: 12 }}>المعدل: {g.averageGrade}%</Text>
                    </View>
                    <Btn
                      label={open === key ? 'إخفاء الدرجات' : 'عرض الدرجات'}
                      variant="ghost"
                      onPress={() => setOpen(open === key ? null : key)}
                    />
                    {open === key && <ChildGrades studentId={child.id} groupId={g.group.id} />}
                  </View>
                );
              })}
              {child.groups.length === 0 && <Empty text="لا مجموعات بعد" />}
              <Text style={[s.label, { marginTop: 12 }]}>التقارير المرسلة</Text>
              {child.reports.length === 0 ? (
                <Empty text="لا تقارير مرسلة بعد" />
              ) : (
                child.reports.map((report) => (
                  <View key={report.id} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                      {new Date(report.createdAt).toLocaleDateString('ar-OM')}
                    </Text>
                    <Text>{report.message}</Text>
                  </View>
                ))
              )}
            </Card>
          ))}
          {children.data?.length === 0 && <Empty text="اربط طالبًا برقم هاتفه لعرض تقدمه" />}
        </>
      )}
    </ScrollView>
  );
}

function ChildGrades({ studentId, groupId }: { studentId: string; groupId: string }) {
  const grades = useQuery({
    queryKey: ['parent-grades', studentId, groupId],
    queryFn: () => api<Grades>(`/api/parent/students/${studentId}/groups/${groupId}/grades`),
  });
  if (grades.isLoading) return <Loading />;
  if (grades.error) return <ErrorBox error={grades.error} />;
  if (!grades.data) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {grades.data.quizzes.map((q) => (
        <Text key={q.quizId} style={{ marginBottom: 4 }}>
          {q.title}: {q.score}/{q.maxScore}
        </Text>
      ))}
      {grades.data.manual.map((m) => (
        <Text key={m.columnId} style={{ marginBottom: 4 }}>
          {m.title}: {m.score ?? '—'}/{m.maxScore}
        </Text>
      ))}
      {grades.data.quizzes.length + grades.data.manual.length === 0 && <Empty text="لا درجات بعد" />}
    </View>
  );
}
