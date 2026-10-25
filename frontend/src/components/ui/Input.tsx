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
