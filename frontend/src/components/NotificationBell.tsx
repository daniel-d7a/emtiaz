import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';

type InboxItem = {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api<InboxItem[]>('/api/notifications?limit=30'),
    refetchInterval: 30000,
  });
  const unread = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: () => api<{ unread: number }>('/api/notifications/unread-count'),
    refetchInterval: 30000,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['inbox'] });
    void qc.invalidateQueries({ queryKey: ['inbox-unread'] });
  };
  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: refresh,
  });
  const count = unread.data?.unread ?? 0;

  return (
    <div className="relative">
      <button
        aria-label={t('notifications')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg px-3 py-2 hover:bg-line/60"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-secondary px-1 text-center text-xs font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-20 mt-2 w-80 rounded-xl border border-line bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="font-bold">{t('notifications')}</span>
            {count > 0 && (
              <button onClick={() => markAll.mutate()} className="text-xs font-semibold text-primary">
                {t('markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {list.data?.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                  className={`block w-full px-3 py-2 text-start text-sm hover:bg-line/40 ${n.readAt ? 'text-ink-soft' : 'font-semibold'}`}
                >
                  <span className="block">{n.message}</span>
                  <span className="mt-1 block text-xs text-ink-soft" dir="ltr">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
            {list.data?.length === 0 && <li className="px-3 py-4 text-sm text-ink-soft">{t('noNotifications')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
