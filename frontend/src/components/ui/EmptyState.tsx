import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title, description, action, icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      {Icon && <Icon className="mx-auto mb-3 text-primary" size={28} />}
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
