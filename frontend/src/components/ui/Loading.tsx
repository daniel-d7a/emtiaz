import { Loader2 } from 'lucide-react';
import { useLang } from '../../lib/i18n';

export function Loading() {
  const { t } = useLang();
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-16 text-ink-soft">
      <Loader2 className="animate-spin" size={20} /> {t('loading')}
    </div>
  );
}
