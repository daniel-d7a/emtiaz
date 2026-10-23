import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { authApi } from './src/api';
import Courses from './src/Courses';
import Group from './src/Group';
import Login from './src/Login';
import { Loading, s } from './src/ui';

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    authApi.session().then((s) => {
      if (s?.user) setSession(s);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <Loading />;
  if (!session) return <Login onIn={setSession} />;
  if (session.user.role !== 'STUDENT') {
    return (
      <View style={s.page}>
        <Text style={s.h1}>{session.user.name}</Text>
        <Text style={{ color: '#78716C' }}>تسجيل الدخول إلى لوحة المعلم/الإدارة عبر الموقع.</Text>
      </View>
    );
  }
  return openGroup ? <Group groupId={openGroup} onBack={() => setOpenGroup(null)} /> : <Courses onOpen={setOpenGroup} />;
}
