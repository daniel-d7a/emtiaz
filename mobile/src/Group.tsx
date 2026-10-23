import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from './api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from './ui';

type Curriculum = {
  group: { name: string; joinCode: string };
  course: { title: string };
  modules: Array<{
    title: string;
    lessons: Array<{ id: string; title: string; unlocked: boolean; completed: boolean }>;
  }>;
};

export default function Group({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const [data, setData] = useState<Curriculum | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = () => api<Curriculum>(`/api/student/groups/${groupId}/curriculum`).then(setData).catch(setError);
  useEffect(() => { load(); }, [groupId]);

  if (error) return <View style={s.page}><ErrorBox error={error} /></View>;
  if (!data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Btn label="← رجوع" variant="ghost" onPress={onBack} />
      <Text style={s.h1}>{data.group.name}</Text>
      <Text style={{ color: '#78716C', marginBottom: 12 }}>{data.course.title} — {data.group.joinCode}</Text>
      {data.modules.map((mod) => (
        <View key={mod.title}>
          <Text style={s.h2}>{mod.title}</Text>
          {mod.lessons.map((l) => (
            <Card key={l.id}>
              <View style={s.row}>
                <Text style={{ fontWeight: '700', flex: 1 }}>
                  {l.title} {l.completed ? '✓' : ''}
                </Text>
                {l.unlocked ? (
                  <Btn
                    label={l.completed ? 'أُتم ✓' : 'إتمام'}
                    variant={l.completed ? 'ghost' : 'primary'}
                    onPress={() =>
                      l.completed
                        ? undefined
                        : api(`/api/student/lessons/${l.id}/complete`, { method: 'POST', body: {} }).then(load)
                    }
                  />
                ) : (
                  <Text style={s.badge}>🔒 مقفل</Text>
                )}
              </View>
            </Card>
          ))}
        </View>
      ))}
      {data.modules.length === 0 && <Empty text="لا دروس بعد" />}
    </ScrollView>
  );
}
