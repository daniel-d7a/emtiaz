import type { ReactNode } from 'react';

export function IconButton({
  label, children, onClick, disabled, className = '', type = 'button',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-soft hover:bg-line/60 hover:text-ink disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
