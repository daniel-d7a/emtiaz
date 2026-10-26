import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';
import type { StudentGroup as Group } from '../../../shared/api';

export default function Courses({ onOpen, onProfile }: { onOpen: (groupId: string) => void; onProfile: () => void }) {
  const qc = useQueryClient();
  const [joinCode, setJoin] = useState('');
  const groups = useQuery({
    queryKey: ['student-groups'],
    queryFn: () => api<Group[]>('/api/student/groups'),
  });
  const join = useMutation({
    mutationFn: (code: string) => api('/api/student/groups/join', { body: { joinCode: code } }),
    onSuccess: () => {
      setJoin('');
      void qc.invalidateQueries({ queryKey: ['student-groups'] });
    },
  });

  if (groups.error) return <View style={s.page}><ErrorBox error={groups.error} /></View>;
  if (!groups.data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <View style={s.row}>
        <Text style={s.h1}>مقرراتي</Text>
        <Btn label="حسابي" onPress={onProfile} variant="ghost" />
      </View>
      <Card>
        <View style={s.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.h2}>رمز مجموعة</Text>
            <Text style={{ color: '#78716C' }}>مثال OM123456</Text>
          </View>
          <Btn
            label={join.isPending ? '…' : 'انضم'}
            onPress={() => joinCode.trim() && join.mutate(joinCode)}
            disabled={join.isPending}
          />
        </View>
        <TextInput style={s.input} value={joinCode} onChangeText={setJoin} placeholder="OM… " autoCapitalize="characters" />
        {join.error && <ErrorBox error={join.error} />}
      </Card>
      {groups.data.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {groups.data.map((g) => (
        <Card key={g.group.id}>
          <Text style={s.h2}>{g.course.title}</Text>
          <Text style={{ color: '#78716C' }}>{g.group.name}</Text>
          <View style={s.progress}>
            <View style={[s.progressFill, { width: `${Math.round(g.progress)}%` as any }]} />
          </View>
          <Btn label="افتح" onPress={() => onOpen(g.group.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}
