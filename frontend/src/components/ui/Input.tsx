import { forwardRef } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, className = '', ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>}
      <input
        {...rest}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border bg-white px-4 py-3 min-h-12 outline-none focus:border-primary ${
          error ? 'border-secondary' : 'border-line'
        } ${className}`}
      />
      {error && <span role="alert" className="mt-1 block text-xs font-semibold text-secondary">{error}</span>}
    </label>
  );
});
