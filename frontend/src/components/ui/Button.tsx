import type { ReactNode } from 'react';

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
