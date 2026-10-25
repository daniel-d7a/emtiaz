import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';

type Group = {
  group: { id: string; name: string; joinCode: string };
  course: { title: string };
  progressPercent: number;
};

export default function Courses({ onOpen, onProfile }: { onOpen: (groupId: string) => void; onProfile: () => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [joinCode, setJoin] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<Error | null>(null);

  const join = () => {
    if (!joinCode.trim()) return;
    setJoinBusy(true);
    setJoinError(null);
    api('/api/student/groups/join', { body: { joinCode } })
      .then(() => api(`${''}/api/student/groups`))
      .then((g) => { setGroups(g as Group[]); setJoin(''); })
      .catch((e) => setJoinError(e as Error))
      .finally(() => setJoinBusy(false));
  };
  useEffect(() => {
    api('/api/student/groups').then(setGroups).catch(setError);
  }, []);

  if (error) return <View style={s.page}><ErrorBox error={error} /></View>;
  if (!groups) return <Loading />;

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
          <Btn label={joinBusy ? '…' : 'انضم'} onPress={join} />
        </View>
        <TextInput style={s.input} value={joinCode} onChangeText={setJoin} placeholder="OM… " autoCapitalize="characters" />
        {joinError && <ErrorBox error={joinError} />}
      </Card>
      {groups.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {groups.map((g) => (
        <Card key={g.group.id}>
          <Text style={s.h2}>{g.course.title}</Text>
          <Text style={{ color: '#78716C' }}>{g.group.name}</Text>
          <View style={s.progress}>
            <View style={[s.progressFill, { width: `${Math.round(g.progressPercent)}%` as any }]} />
          </View>
          <Btn label="افتح" onPress={() => onOpen(g.group.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}
