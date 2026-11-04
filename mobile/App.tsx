import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Cairo_400Regular } from '@expo-google-fonts/cairo/400Regular';
import { Cairo_600SemiBold } from '@expo-google-fonts/cairo/600SemiBold';
import { Cairo_700Bold } from '@expo-google-fonts/cairo/700Bold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { authApi } from './src/api';
import Courses from './src/screens/Courses';
import CourseBrowser from './src/screens/CourseBrowser';
import ChangePassword from './src/screens/ChangePassword';
import Group from './src/screens/Group';
import LessonView from './src/screens/Lesson';
import Notifications from './src/screens/Notifications';
import Login from './src/screens/Login';
import ParentHome from './src/screens/ParentHome';
import Profile from './src/screens/Profile';
import TeacherHome from './src/screens/TeacherHome';
import TeacherCourse from './src/screens/TeacherCourse';
import TeacherCurriculum from './src/screens/TeacherCurriculum';
import TeacherGroup from './src/screens/TeacherGroup';
import TeacherNewCourse from './src/screens/TeacherNewCourse';
import Quiz from './src/screens/Quiz';
import { Loading, Text, c, f, s } from './src/ui';
import { queryClient } from './src/query';
import type { Session } from '../shared/api';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

type RootStackParamList = {
  Main: undefined;
  TeacherGroup: { groupId: string };
  TeacherCourse: { courseId: string };
  TeacherCurriculum: { courseId: string };
  TeacherNewCourse: undefined;
  CourseBrowser: undefined;
  Group: { groupId: string };
  Lesson: { lessonId: string; groupId: string };
  Quiz: { groupId: string; lessonId?: string; quizId?: string };
};

type TabParamList = {
  Home: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: c.background },
};
const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: c.primary,
  tabBarInactiveTintColor: c.inkSoft,
  tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
  tabBarItemStyle: { minHeight: 48 },
  tabBarLabelStyle: { fontFamily: f.semiBold, fontSize: 13 },
  sceneStyle: { backgroundColor: c.background },
};

function MainTabs({ home, onLogout }: { home: ReactNode; onLogout: () => void }) {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" options={{ title: 'الرئيسية' }}>
        {() => home}
      </Tab.Screen>
      <Tab.Screen name="Notifications" options={{ title: 'الإشعارات' }}>
        {() => <Notifications />}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: 'حسابي' }}>
        {() => <Profile onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function StudentStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator initialRouteName="Main" screenOptions={screenOptions}>
      <Stack.Screen name="Main">
        {({ navigation }) => (
          <MainTabs
            onLogout={onLogout}
            home={
              <Courses
                onOpen={(groupId) => navigation.navigate('Group', { groupId })}
                onBrowse={() => navigation.navigate('CourseBrowser')}
              />
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CourseBrowser">
        {({ navigation }) => <CourseBrowser onBack={() => navigation.goBack()} />}
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
            groupId={route.params.groupId}
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
    <Stack.Navigator initialRouteName="Main" screenOptions={screenOptions}>
      <Stack.Screen name="Main">
        {({ navigation }) => (
          <MainTabs
            onLogout={onLogout}
            home={
              <TeacherHome
                onOpenCourse={(courseId) => navigation.navigate('TeacherCourse', { courseId })}
                onOpenCurriculum={(courseId) =>
                  navigation.navigate('TeacherCurriculum', { courseId })
                }
                onOpenGroup={(groupId) => navigation.navigate('TeacherGroup', { groupId })}
                onNewCourse={() => navigation.navigate('TeacherNewCourse')}
              />
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TeacherGroup">
        {({ navigation, route }) => (
          <TeacherGroup groupId={route.params.groupId} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="TeacherCourse">
        {({ navigation, route }) => (
          <TeacherCourse
            courseId={route.params.courseId}
            onBack={() => navigation.goBack()}
            onOpenGroup={(groupId) => navigation.navigate('TeacherGroup', { groupId })}
            onOpenCurriculum={(courseId) =>
              navigation.navigate('TeacherCurriculum', { courseId })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TeacherCurriculum">
        {({ navigation, route }) => (
          <TeacherCurriculum
            courseId={route.params.courseId}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TeacherNewCourse">
        {({ navigation }) => (
          <TeacherNewCourse
            onBack={() => navigation.goBack()}
            onCreated={(courseId) => navigation.replace('TeacherCourse', { courseId })}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function ParentStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator initialRouteName="Main" screenOptions={screenOptions}>
      <Stack.Screen name="Main">
        {() => <MainTabs onLogout={onLogout} home={<ParentHome />} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function Root() {
  const [session, setSession] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    DMSans_400Regular,
    DMSans_700Bold,
  });

  useEffect(() => {
    authApi
      .session()
      .then((s) => {
        if (s?.user) setSession(s);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!fontsLoaded && !fontError) return <Loading />;
  if (!loaded) return <Loading />;
  if (!session) return <Login onIn={setSession} />;
  if (session.user.mustChangePassword) {
    return (
      <ChangePassword
        onDone={() => {
          authApi.session().then(setSession).catch(() => setSession(null));
        }}
      />
    );
  }
  if (session.user.role === 'ADMIN') {
    return (
      <View style={s.page}>
        <Text style={s.h1}>{session.user.name}</Text>
        <Text style={{ color: c.inkSoft }}>لوحة الإدارة متاحة على الموقع.</Text>
      </View>
    );
  }

  const logout = () => setSession(null);
  return (
    <NavigationContainer direction="rtl">
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
        <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
          <Root />
        </SafeAreaView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
