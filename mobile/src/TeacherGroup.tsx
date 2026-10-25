import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { api } from './api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from './ui';

type Lesson = { id: string; title: string; unlocked: boolean; overridden: boolean };
type Pacing = { group: { id: string; name: string; joinCode: string }; lessons: Lesson[] };
type Roster = {
  group: { id: string; name: string; joinCode: string };
  students: Array<{ studentId: string; name: string; phoneNumber: string | null }>;
};

export default function TeacherGroup({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const [pacing, setPacing] = useState<Pacing | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api<Pacing>(`/api/teacher/groups/${groupId}/pacing`),
      api<Roster>(`/api/teacher/groups/${groupId}/roster`),
    ])
      .then(([p, r]) => { setPacing(p); setRoster(r); })
      .catch(setError);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (lesson: Lesson, isUnlocked: boolean) => {
    setBusyId(lesson.id);
    api(`/api/teacher/groups/${groupId}/lessons/${lesson.id}/access`, {
      method: 'PATCH',
      body: { isUnlocked },
    })
      .then(load)
      .catch(setError)
      .finally(() => setBusyId(null));
  };

  if (error) return <View style={s.page}><ErrorBox error={error} /><Btn label="رجوع" onPress={onBack} variant="ghost" /></View>;
  if (!pacing) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>{pacing.group.name}</Text>
      <Text style={{ color: '#78716C', marginBottom: 12 }}>رمز المجموعة: {pacing.group.joinCode}</Text>
      <Card>
        <Text style={s.h2}>فتح الدروس</Text>
        {pacing.lessons.length === 0 && <Empty text="لا توجد دروس بعد" />}
        {pacing.lessons.map((l) => (
          <View key={l.id} style={[s.row, { paddingVertical: 6 }]}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={{ fontWeight: '600' }}>{l.title}</Text>
              <Text style={{ color: '#78716C', fontSize: 12 }}>
                {l.unlocked ? 'مفتوح' : 'مقفل'}{l.overridden ? ' · تخصيص للمجموعة' : ''}
              </Text>
            </View>
            <Switch
              value={l.unlocked}
              disabled={busyId === l.id}
              onValueChange={(v) => toggle(l, v)}
              trackColor={{ true: '#0F766E' }}
            />
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.h2}>الطلاب ({roster?.students.length ?? 0})</Text>
        {roster?.students.length === 0 && <Empty text="لا يوجد طلاب بعد" />}
        {roster?.students.map((st) => (
          <View key={st.studentId} style={[s.row, { paddingVertical: 6 }]}>
            <Text style={{ fontWeight: '600' }}>{st.name}</Text>
            <Text style={{ color: '#78716C', fontSize: 13 }}>{st.phoneNumber ?? '—'}</Text>
          </View>
        ))}
      </Card>
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
    </ScrollView>
  );
}
