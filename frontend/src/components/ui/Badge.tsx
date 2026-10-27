import type { ReactNode } from 'react';

const tones = {
  neutral: 'border-line bg-background text-ink-soft',
  primary: 'border-primary/20 bg-primary-light text-primary-dark',
  secondary: 'border-secondary/20 bg-secondary-light text-secondary',
} as const;

export function Badge({
  children, tone = 'neutral', className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
