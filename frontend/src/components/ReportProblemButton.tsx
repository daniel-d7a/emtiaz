import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { publicApi, type Session, type SessionUser } from '../lib/api';
import { useLang } from '../lib/i18n';
import { sessionQuery } from '../lib/session';

export function ReportProblemButton({
  context,
  user: explicitUser,
  compact = false,
  className = '',
}: {
  context?: string;
  user?: SessionUser | null;
  compact?: boolean;
  className?: string;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const cachedSession = qc.getQueryData<Session>(sessionQuery.queryKey);
  const user = explicitUser ?? cachedSession?.user ?? null;

  const { data: support } = useQuery({
    queryKey: ['public-support'],
    queryFn: () => publicApi.support(),
    staleTime: 60_000,
  });

  const rawPhone = support?.supportWhatsapp || support?.whatsapp || '+96890000000';
  const digits = rawPhone.replace(/\D/g, '');
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const title = typeof document !== 'undefined' ? document.title : '';
  const screenInfo = context ? `${path} (${context})` : title ? `${path} — ${title}` : path;

  const lines =
    lang === 'ar'
      ? [
          'مرحباً إدارة منصة امتياز، أود الإبلاغ عن مشكلة أو إرسال ملاحظة:',
          `الصفحة: ${screenInfo}`,
          ...(user
            ? [
                `المستخدم: ${user.name} (${user.role})`,
                ...(user.phoneNumber ? [`الهاتف: ${user.phoneNumber}`] : []),
              ]
            : []),
        ]
      : [
          'Hello Emtiaz Support, I would like to report a problem or share feedback:',
          `Page: ${screenInfo}`,
          ...(user
            ? [
                `User: ${user.name} (${user.role})`,
                ...(user.phoneNumber ? [`Phone: ${user.phoneNumber}`] : []),
              ]
            : []),
        ];

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="report-problem-whatsapp"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:text-primary ${className}`}
    >
      <MessageCircle size={16} className="shrink-0 text-primary" />
      <span>{compact ? t('reportProblemShort') : t('reportProblemWhatsapp')}</span>
    </a>
  );
}
