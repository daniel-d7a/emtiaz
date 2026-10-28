import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, ErrorBox, Loading, Text, c, s } from '../ui';
import type { TeacherPacing } from '../../../shared/api';
import TeacherGroupGradebook from './TeacherGroupGradebook';
import TeacherGroupPacing from './TeacherGroupPacing';
import TeacherGroupRoster from './TeacherGroupRoster';
import TeacherGroupSettings from './TeacherGroupSettings';
import TeacherGroupStats from './TeacherGroupStats';

type Tab = 'pacing' | 'gradebook' | 'roster' | 'stats' | 'settings';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'pacing', label: 'المسار' },
  { id: 'gradebook', label: 'الدرجات' },
  { id: 'roster', label: 'الطلاب' },
  { id: 'stats', label: 'الإحصاءات' },
  { id: 'settings', label: 'الإعدادات' },
];

export default function TeacherGroup({
  groupId,
  onBack,
}: {
  groupId: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>('pacing');
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<TeacherPacing>(`/api/teacher/groups/${groupId}/pacing`),
  });

  if (pacing.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={pacing.error} />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
      </View>
    );
  }
  if (!pacing.data) return <Loading />;
  const group = pacing.data.group;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.h1}>{group.name || 'مجموعة'}</Text>
          <Text style={{ color: c.inkSoft, marginBottom: 8 }}>
            رمز الانضمام: <Text style={{ fontWeight: '700' }}>{group.joinCode}</Text>
          </Text>
        </View>
        <Btn
          label="مشاركة"
          variant="ghost"
          onPress={() =>
            void Share.share({
              message: `${group.name}\nرمز الانضمام: ${group.joinCode}`,
            })
          }
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 12 }}
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? c.primary : c.line,
                backgroundColor: selected ? c.primary : c.card,
              }}
            >
              <Text style={{ color: selected ? c.onPrimary : c.ink, fontWeight: '700' }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'pacing' ? <TeacherGroupPacing groupId={groupId} /> : null}
      {tab === 'gradebook' ? <TeacherGroupGradebook groupId={groupId} /> : null}
      {tab === 'roster' ? <TeacherGroupRoster groupId={groupId} /> : null}
      {tab === 'stats' ? <TeacherGroupStats groupId={groupId} /> : null}
      {tab === 'settings' ? <TeacherGroupSettings groupId={groupId} /> : null}
    </ScrollView>
  );
}
