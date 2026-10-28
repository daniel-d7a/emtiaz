import { ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { InboxItem as Item } from '../../../shared/api';

export default function Notifications({ onBack }: { onBack?: () => void }) {
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
      {onBack && <Btn label="رجوع" variant="ghost" onPress={onBack} />}
      <View style={s.row}>
        <Text style={s.h1}>الإشعارات</Text>
        {unread > 0 && (
          <Btn
            label="تحديد الكل كمقروء"
            variant="ghost"
            loading={markAll.isPending}
            onPress={() => markAll.mutate()}
          />
        )}
      </View>
      {markRead.error && <ErrorBox error={markRead.error} />}
      {markAll.error && <ErrorBox error={markAll.error} />}
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : (
        <>
          {list.data?.map((n) => (
            <Card key={n.id}>
              <Text
                accessibilityRole={n.readAt ? undefined : 'button'}
                onPress={() => !n.readAt && markRead.mutate(n.id)}
                style={{
                  fontWeight: n.readAt ? '400' : '700',
                  color: n.readAt ? c.inkSoft : c.ink,
                  minHeight: 44,
                  paddingVertical: 8,
                }}
              >
                {n.message}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 6 }}>
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
