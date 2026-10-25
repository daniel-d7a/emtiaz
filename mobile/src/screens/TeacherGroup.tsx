import { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';

type Lesson = { id: string; title: string; unlocked: boolean; overridden: boolean };
type Pacing = { group: { id: string; name: string; joinCode: string }; lessons: Lesson[] };
type Roster = {
  group: { id: string; name: string; joinCode: string };
  students: Array<{ studentId: string; name: string; phoneNumber: string | null; progress: number; completedLessons: number; totalLessons: number }>;
};

export default function TeacherGroup({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<Pacing>(`/api/teacher/groups/${groupId}/pacing`),
  });
  const roster = useQuery({
    queryKey: ['teacher-roster', groupId],
    queryFn: () => api<Roster>(`/api/teacher/groups/${groupId}/roster`),
  });
  const toggle = useMutation({
    mutationFn: (v: { lessonId: string; isUnlocked: boolean }) =>
      api(`/api/teacher/groups/${groupId}/lessons/${v.lessonId}/access`, {
        method: 'PATCH',
        body: { isUnlocked: v.isUnlocked },
      }),
    onMutate: (v) => setBusyId(v.lessonId),
    onSettled: () => {
      setBusyId(null);
      void qc.invalidateQueries({ queryKey: ['teacher-pacing', groupId] });
    },
  });

  const announce = useMutation({
    mutationFn: () =>
      api<{ sent: number }>(`/api/teacher/groups/${groupId}/announce`, {
        method: 'POST',
        body: { message: announcement },
      }),
    onSuccess: (res) => {
      setAnnouncement('');
      setAnnounceMsg(`تم إرسال الإعلان إلى ${res.sent}`);
    },
  });
  const error = pacing.error ?? roster.error ?? toggle.error ?? announce.error;
  if (error) return <View style={s.page}><ErrorBox error={error} /><Btn label="رجوع" onPress={onBack} variant="ghost" /></View>;
  if (!pacing.data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>{pacing.data.group.name}</Text>
      <Text style={{ color: '#78716C', marginBottom: 12 }}>رمز المجموعة: {pacing.data.group.joinCode}</Text>
      <Card>
        <Text style={s.h2}>إعلان للمجموعة</Text>
        <TextInput
          value={announcement}
          onChangeText={(v) => { setAnnouncement(v); setAnnounceMsg(''); }}
          placeholder="اكتب رسالة للطلاب..."
          multiline
          style={{ borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 8, padding: 10, marginTop: 8, minHeight: 72 }}
        />
        {announceMsg ? <Text style={{ color: '#0F766E', marginTop: 6 }}>{announceMsg}</Text> : null}
        <Btn label="إرسال" onPress={() => announce.mutate()} variant="ghost" />
      </Card>
      <Card>
        <Text style={s.h2}>فتح الدروس</Text>
        {pacing.data.lessons.length === 0 && <Empty text="لا توجد دروس بعد" />}
        {pacing.data.lessons.map((l) => (
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
              onValueChange={(v) => toggle.mutate({ lessonId: l.id, isUnlocked: v })}
              trackColor={{ true: '#0F766E' }}
            />
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.h2}>الطلاب ({roster.data?.students.length ?? 0})</Text>
        {roster.data?.students.length === 0 && <Empty text="لا يوجد طلاب بعد" />}
        {roster.data?.students.map((st) => (
          <View key={st.studentId} style={[s.row, { paddingVertical: 6 }]}>
            <Text style={{ fontWeight: '600' }}>{st.name}</Text>
            <Text style={{ color: '#78716C', fontSize: 13 }}>
              {st.progress}% ({st.completedLessons}/{st.totalLessons}) · {st.phoneNumber ?? '—'}
            </Text>
          </View>
        ))}
      </Card>
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
    </ScrollView>
  );
}
