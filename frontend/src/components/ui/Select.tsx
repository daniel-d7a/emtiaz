import type { ReactNode } from 'react';

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
