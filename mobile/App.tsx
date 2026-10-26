import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authApi } from './src/api';
import Courses from './src/screens/Courses';
import Group from './src/screens/Group';
import LessonView from './src/screens/Lesson';
import Notifications from './src/screens/Notifications';
import Login from './src/screens/Login';
import ParentHome from './src/screens/ParentHome';
import Profile from './src/screens/Profile';
import TeacherHome from './src/screens/TeacherHome';
import TeacherGroup from './src/screens/TeacherGroup';
import Quiz from './src/screens/Quiz';
import { Loading, s } from './src/ui';
import { queryClient } from './src/query';
import type { Session } from '../shared/api';

type RootStackParamList = {
  Courses: undefined;
  Profile: undefined;
  Notifications: undefined;
  TeacherHome: undefined;
  ParentHome: undefined;
  TeacherGroup: { groupId: string };
  Group: { groupId: string };
  Lesson: { lessonId: string; groupId: string };
  Quiz: { groupId: string; lessonId?: string; quizId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#FAF8F5' },
};

function StudentStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator initialRouteName="Courses" screenOptions={screenOptions}>
      <Stack.Screen name="Courses">
        {({ navigation }) => (
          <Courses
            onOpen={(groupId) => navigation.navigate('Group', { groupId })}
            onProfile={() => navigation.navigate('Profile')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Profile">
        {({ navigation }) => (
          <Profile
            onBack={() => navigation.goBack()}
            onLogout={onLogout}
            onNotifications={() => navigation.navigate('Notifications')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications">
        {({ navigation }) => <Notifications onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Group">
        {({ navigation, route }) => (
          <Group
            groupId={route.params.groupId}
            onBack={() => navigation.goBack()}
            onOpenLesson={(lessonId) =>
              navigation.navigate('Lesson', { lessonId, groupId: route.params.groupId })
            }
            onOpenQuiz={(lessonId) =>
              navigation.navigate('Quiz', { lessonId, groupId: route.params.groupId })
            }
            onOpenQuizById={(quizId) =>
              navigation.navigate('Quiz', { quizId, groupId: route.params.groupId })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Lesson">
        {({ navigation, route }) => (
          <LessonView
            lessonId={route.params.lessonId}
            onBack={() => navigation.goBack()}
            onOpenQuiz={() =>
              navigation.navigate('Quiz', {
                lessonId: route.params.lessonId,
                groupId: route.params.groupId,
              })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Quiz">
        {({ navigation, route }) => (
          <Quiz
            lessonId={route.params.lessonId}
            quizId={route.params.quizId}
            groupId={route.params.groupId}
            onBack={() => {
              if (route.params.lessonId) {
                navigation.navigate('Lesson', {
                  lessonId: route.params.lessonId,
                  groupId: route.params.groupId,
                });
              } else {
                navigation.navigate('Group', { groupId: route.params.groupId });
              }
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function TeacherStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator initialRouteName="TeacherHome" screenOptions={screenOptions}>
      <Stack.Screen name="TeacherHome">
        {({ navigation }) => (
          <TeacherHome
            onOpenGroup={(groupId) => navigation.navigate('TeacherGroup', { groupId })}
            onProfile={() => navigation.navigate('Profile')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Profile">
        {({ navigation }) => (
          <Profile
            onBack={() => navigation.goBack()}
            onLogout={onLogout}
            onNotifications={() => navigation.navigate('Notifications')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications">
        {({ navigation }) => <Notifications onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="TeacherGroup">
        {({ navigation, route }) => (
          <TeacherGroup groupId={route.params.groupId} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function ParentStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator initialRouteName="ParentHome" screenOptions={screenOptions}>
      <Stack.Screen name="ParentHome">
        {({ navigation }) => (
          <ParentHome
            onLogout={onLogout}
            onNotifications={() => navigation.navigate('Notifications')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications">
        {({ navigation }) => <Notifications onBack={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function Root() {
  const [session, setSession] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authApi
      .session()
      .then((s) => {
        if (s?.user) setSession(s);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
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

  const logout = () => setSession(null);
  return (
    <NavigationContainer>
      {session.user.role === 'PARENT' ? (
        <ParentStack onLogout={logout} />
      ) : session.user.role === 'TEACHER' ? (
        <TeacherStack onLogout={logout} />
      ) : (
        <StudentStack onLogout={logout} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
