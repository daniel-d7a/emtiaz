import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { authApi } from './src/api';
import Courses from './src/screens/Courses';
import Group from './src/screens/Group';
import LessonView from './src/screens/Lesson';
import Login from './src/screens/Login';
import Profile from './src/screens/Profile';
import TeacherHome from './src/screens/TeacherHome';
import TeacherGroup from './src/screens/TeacherGroup';
import Quiz from './src/screens/Quiz';
import { Loading, s } from './src/ui';
import { queryClient } from './src/query';

type Screen =
  | { name: 'courses' }
  | { name: 'profile' }
  | { name: 'teacher-group'; groupId: string }
  | { name: 'group'; groupId: string }
  | { name: 'lesson'; lessonId: string; groupId: string }
  | { name: 'quiz'; lessonId: string; groupId: string };

function Root() {
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
  if (session.user.role === 'ADMIN') {
    return (
      <View style={s.page}>
        <Text style={s.h1}>{session.user.name}</Text>
        <Text style={{ color: '#78716C' }}>لوحة الإدارة متاحة على الموقع.</Text>
      </View>
    );
  }

  if (session.user.role === 'TEACHER') {
    if (screen.name === 'profile') {
      return <Profile onBack={() => setScreen({ name: 'courses' })} onLogout={() => setSession(null)} />;
    }
    if (screen.name === 'teacher-group') {
      return (
        <TeacherGroup groupId={screen.groupId} onBack={() => setScreen({ name: 'courses' })} />
      );
    }
    return (
      <TeacherHome
        onOpenGroup={(groupId) => setScreen({ name: 'teacher-group', groupId })}
        onProfile={() => setScreen({ name: 'profile' })}
      />
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  );
}
