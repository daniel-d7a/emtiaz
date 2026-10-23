import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children, onClick, variant = 'primary', type = 'button', disabled, className = '',
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost';
  type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:brightness-110',
    ghost: 'bg-transparent text-ink hover:bg-line/50 border border-line',
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`rounded-xl px-5 py-3 min-h-12 text-base font-semibold shadow-sm transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>}
      <input
        {...rest}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 min-h-12 outline-none focus:border-primary"
      />
    </label>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  const { label, children, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>}
      <select {...rest} className="w-full rounded-xl border border-line bg-white px-4 py-3 min-h-12 outline-none focus:border-primary">
        {children}
      </select>
    </label>
  );
}

export function Page({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}

export function Loading() {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-soft">
      <Loader2 className="animate-spin" size={20} /> {t('loading')}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="rounded-xl bg-secondary-light px-4 py-3 text-sm text-ink">{String((error as Error)?.message ?? error)}</div>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
