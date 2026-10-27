import { Toaster as Sonner } from 'sonner';
import { useLang } from '../lib/i18n';

export function Toaster() {
  const { lang } = useLang();
  return (
    <Sonner
      position="top-center"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      theme="light"
      closeButton
      toastOptions={{ className: 'rounded-xl border border-line bg-surface text-ink' }}
    />
  );
}
