export function ErrorBox({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-xl bg-secondary-light px-4 py-3 text-sm text-ink">{String((error as Error)?.message ?? error)}</div>;
}
