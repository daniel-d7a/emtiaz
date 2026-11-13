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
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {filters ? (
        <div className="grid items-end gap-3 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]">
          {filters}
        </div>
      ) : null}
      {children}
    </div>
  );
}
