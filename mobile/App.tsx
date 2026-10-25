import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { authApi } from './src/api';
import Courses from './src/Courses';
import Group from './src/Group';
import LessonView from './src/Lesson';
import Login from './src/Login';
import Profile from './src/Profile';
import Quiz from './src/Quiz';
import { Loading, s } from './src/ui';

type Screen =
  | { name: 'courses' }
  | { name: 'profile' }
  | { name: 'group'; groupId: string }
  | { name: 'lesson'; lessonId: string; groupId: string }
  | { name: 'quiz'; lessonId: string; groupId: string };

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'courses' });

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
        <Text style={{ color: '#78716C' }}>للمعلم/الإدارة استخدم الموقع.</Text>
      </View>
    );
  }

  switch (screen.name) {
    case 'profile':
      return (
        <Profile
          onBack={() => setScreen({ name: 'courses' })}
          onLogout={() => setSession(null)}
        />
      );
    case 'quiz':
      return <Quiz lessonId={screen.lessonId} groupId={screen.groupId} onBack={(refresh) => setScreen({ name: 'lesson', lessonId: screen.lessonId, groupId: screen.groupId })} />;
    case 'lesson':
      return (
        <LessonView
          lessonId={screen.lessonId}
          onBack={() => setScreen({ name: 'group', groupId: screen.groupId })}
          onOpenQuiz={() => setScreen({ name: 'quiz', lessonId: screen.lessonId, groupId: screen.groupId })}
        />
      );
    case 'group':
      return (
        <Group
          groupId={screen.groupId}
          onBack={() => setScreen({ name: 'courses' })}
          onOpenLesson={(lessonId) => setScreen({ name: 'lesson', lessonId, groupId: screen.groupId })}
          onOpenQuiz={(lessonId) => setScreen({ name: 'quiz', lessonId, groupId: screen.groupId })}
        />
      );
    default:
      return (
        <Courses
          onOpen={(groupId) => setScreen({ name: 'group', groupId })}
          onProfile={() => setScreen({ name: 'profile' })}
        />
      );
  }
}
