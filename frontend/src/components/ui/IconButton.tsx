import type { ReactNode } from 'react';

export function IconButton({
  label, children, onClick, disabled, className = '', type = 'button', tone = 'default',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  tone?: 'default' | 'danger';
}) {
  const tones = {
    default: 'text-ink-soft hover:bg-line/60 hover:text-ink',
    danger: 'text-ink-soft hover:bg-danger-light hover:text-danger',
  };
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${tones[tone]} disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
