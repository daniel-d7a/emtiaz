import { useLang } from '../../lib/i18n';
import { Skeleton } from './Skeleton';

export function Loading({ rows = 3 }: { rows?: number }) {
  const { t } = useLang();
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-6">
      <span className="sr-only">{t('loading')}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
