import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { StudentGroup as Group } from '../../../shared/api';

export default function Courses({ onOpen }: { onOpen: (groupId: string) => void }) {
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
    <ScrollView style={s.page} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>مقرراتي</Text>
      <Card>
        <Text style={s.h2}>رمز مجموعة</Text>
        <Text style={{ color: c.inkSoft, marginBottom: 8 }}>مثال OM123456</Text>
        <TextInput
          style={s.input}
          value={joinCode}
          onChangeText={setJoin}
          placeholder="OM… "
          autoCapitalize="characters"
          placeholderTextColor={c.inkSoft}
        />
        {join.error && <ErrorBox error={join.error} />}
        <Btn
          label="انضم"
          onPress={() => joinCode.trim() && join.mutate(joinCode)}
          disabled={!joinCode.trim()}
          loading={join.isPending}
        />
      </Card>
      {groups.data.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {groups.data.map((g) => (
        <Card key={g.group.id}>
          <Text style={s.h2}>{g.course.title}</Text>
          <Text style={{ color: c.inkSoft, marginBottom: 4 }}>{g.group.name}</Text>
          <View style={s.progress}>
            <View
              style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]}
            />
          </View>
          <Text style={{ color: c.inkSoft, fontSize: 12 }}>التقدم: {Math.round(g.progress)}%</Text>
          <Btn label="افتح" onPress={() => onOpen(g.group.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}
