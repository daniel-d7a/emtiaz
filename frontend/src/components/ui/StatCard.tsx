import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export function StatCard({
  label, value, hint, icon: Icon, className = '',
}: {
  label: string;
  icon?: LucideIcon;
  value: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      {Icon && (
        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
          <Icon size={18} />
        </span>
      )}
      <p className="text-3xl font-bold tabular-nums text-primary">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}
