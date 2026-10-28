import type { ReactNode } from 'react';

export function Page({ title, right, children, wide = false }: { title: string; right?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto p-4 ${wide ? 'xl:max-w-6xl' : 'xl:max-w-3xl'}`}>
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}
