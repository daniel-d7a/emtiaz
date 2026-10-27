import { Card } from './Card';

export function StatCard({
  label, value, hint, className = '',
}: {
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <p className="text-3xl font-extrabold text-primary">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}
