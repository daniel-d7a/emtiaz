import type { ReactNode } from 'react';

export function FilterLayout({
  search,
  filters,
  actions,
  children,
}: {
  search: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{search}</div>
        {actions}
      </div>
      {filters ? (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <aside className="lg:w-64 lg:shrink-0">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">{filters}</div>
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
