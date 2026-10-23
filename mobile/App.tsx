import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { authApi } from './src/api';
import Courses from './src/Courses';
import Group from './src/Group';
import Login from './src/Login';
import Quiz from './src/Quiz';
import { Loading, s } from './src/ui';

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openQuiz, setOpenQuiz] = useState<{ lessonId: string; groupId: string } | null>(null);

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
  if (openQuiz) {
    return <Quiz lessonId={openQuiz.lessonId} groupId={openQuiz.groupId} onBack={(needRefresh) => { setOpenQuiz(null); if (needRefresh) setOpenGroup(openGroup); }} />;
  }
  return openGroup ? (
    <Group groupId={openGroup} onBack={() => setOpenGroup(null)} onOpenQuiz={(lessonId) => setOpenQuiz({ lessonId, groupId: openGroup })} />
  ) : (
    <Courses onOpen={setOpenGroup} />
  );
}
