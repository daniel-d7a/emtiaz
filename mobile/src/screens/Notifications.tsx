import { ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, c, s } from '../ui';

type Item = {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export default function Notifications({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api<Item[]>('/api/notifications?limit=50'),
    refetchInterval: 30000,
  });
  const unread = list.data?.filter((n) => !n.readAt).length ?? 0;
  const refresh = () => void qc.invalidateQueries({ queryKey: ['inbox'] });
  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: refresh,
  });

  return (
    <ScrollView style={s.page}>
      <Btn label="رجوع" variant="ghost" onPress={onBack} />
      <View style={s.row}>
        <Text style={s.h1}>الإشعارات</Text>
        {unread > 0 && <Btn label="تحديد الكل كمقروء" variant="ghost" onPress={() => markAll.mutate()} />}
      </View>
      {markRead.error && <ErrorBox error={markRead.error} />}
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : (
        <>
          {list.data?.map((n) => (
            <Card key={n.id}>
              <Text
                onPress={() => !n.readAt && markRead.mutate(n.id)}
                style={{ fontWeight: n.readAt ? '400' : '700', color: n.readAt ? c.inkSoft : c.ink, textAlign: 'right' }}
              >
                {n.message}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 6, textAlign: 'right' }}>
                {new Date(n.createdAt).toLocaleString()}
              </Text>
            </Card>
          ))}
          {list.data?.length === 0 && <Empty text="لا توجد إشعارات" />}
        </>
      )}
    </ScrollView>
  );
}
