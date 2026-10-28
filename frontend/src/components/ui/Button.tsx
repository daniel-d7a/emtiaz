import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ children, variant = 'primary', type = 'button', className = '', ...rest }: Props) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:brightness-110',
    ghost: 'bg-transparent text-ink hover:bg-line/50 border border-line',
    danger: 'bg-danger text-white hover:bg-danger/90',
  };
  return (
    <button
      type={type}
      {...rest}
      className={`rounded-xl px-5 py-3 min-h-12 text-base font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
