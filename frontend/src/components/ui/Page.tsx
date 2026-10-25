import type { ReactNode } from 'react';

export function Page({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}
