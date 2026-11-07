import { forwardRef, type ReactNode } from 'react';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, className = '', children, ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>}
      <select
        {...rest}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border bg-white px-3 h-10 outline-none focus:border-primary ${
          error ? 'border-secondary' : 'border-line'
        } ${className}`}
      >
        {children}
      </select>
      {error && <span role="alert" className="mt-1 block text-xs font-semibold text-secondary">{error}</span>}
    </label>
  );
});
