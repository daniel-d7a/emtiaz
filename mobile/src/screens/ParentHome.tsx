import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, authApi } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, c, s } from '../ui';

type Child = {
  id: string;
  name: string;
  email: string;
  groups: Array<{
    group: { id: string; name: string };
    course: { title: string };
    teacher: { name: string };
    progress: number;
  }>;
};
type Grades = {
  quizzes: Array<{ quizId: string; title: string; lessonTitle: string; score: number; maxScore: number }>;
  manual: Array<{ columnId: string; title: string; maxScore: number; score: number | null; note: string | null }>;
};

export default function ParentHome({ onLogout, onNotifications }: { onLogout: () => void; onNotifications: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const children = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api<Child[]>('/api/parent/students'),
  });
  const link = useMutation({
    mutationFn: () => api('/api/parent/link', { body: { code: code.trim() } }),
    onSuccess: () => {
      setCode('');
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });
  const unlink = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/parent/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['parent-students'] }),
  });

  return (
    <ScrollView style={s.page}>
      <View style={s.row}>
        <Text style={s.h1}>أبنائي</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn label="الإشعارات" variant="ghost" onPress={onNotifications} />
          <Btn
            label="خروج"
            variant="ghost"
            onPress={async () => {
              await authApi.logout();
              qc.clear();
              onLogout();
            }}
          />
        </View>
      </View>
      <Card>
        <Field label="رمز الطالب" value={code} onChange={setCode} />
        <Btn label="ربط الطالب" onPress={() => link.mutate()} disabled={code.trim().length < 4 || link.isPending} />
        {link.error && <ErrorBox error={link.error} />}
      </Card>
      {unlink.error && <ErrorBox error={unlink.error} />}
      {children.isLoading ? <Loading /> : children.error ? <ErrorBox error={children.error} /> : (
        <>
          {children.data?.map((child) => (
            <Card key={child.id}>
              <Text style={s.h2}>{child.name}</Text>
              <Text style={{ color: c.inkSoft, marginBottom: 8 }}>{child.email}</Text>
              <Btn label="فصل الطالب" variant="ghost" onPress={() => unlink.mutate(child.id)} />
              {child.groups.map((g) => {
                const key = `${child.id}:${g.group.id}`;
                return (
                  <View key={key} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
                    <Text style={{ fontWeight: '700', textAlign: 'right' }}>{g.course.title}</Text>
                    <Text style={{ color: c.inkSoft, textAlign: 'right', fontSize: 12 }}>
                      {g.group.name} · {g.teacher.name}
                    </Text>
                    <View style={s.progress}>
                      <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]} />
                    </View>
                    <Text style={{ color: c.inkSoft, fontSize: 12, textAlign: 'right' }}>التقدم: {g.progress}%</Text>
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
            </Card>
          ))}
          {children.data?.length === 0 && <Empty text="اربط طالبًا برمزه لعرض تقدمه" />}
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
        <Text key={q.quizId} style={{ textAlign: 'right', marginBottom: 4 }}>
          {q.title}: {q.score}/{q.maxScore}
        </Text>
      ))}
      {grades.data.manual.map((m) => (
        <Text key={m.columnId} style={{ textAlign: 'right', marginBottom: 4 }}>
          {m.title}: {m.score ?? '—'}/{m.maxScore}
        </Text>
      ))}
      {grades.data.quizzes.length + grades.data.manual.length === 0 && <Empty text="لا درجات بعد" />}
    </View>
  );
}
