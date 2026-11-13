import type { ReactNode } from 'react';

export function IconButton({
  label, children, onClick, disabled, className = '', type = 'button', tone = 'default',
  ariaHasPopup, ariaExpanded,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  tone?: 'default' | 'danger';
  ariaHasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  ariaExpanded?: boolean;
}) {
  const tones = {
    default: 'text-ink-soft hover:bg-line/60 hover:text-ink',
    danger: 'text-ink-soft hover:bg-danger-light hover:text-danger',
  };
  return (
    <span className="group relative inline-flex">
      <button
        type={type}
        aria-label={label}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${tones[tone]} disabled:opacity-40 ${className}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-semibold text-background opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
