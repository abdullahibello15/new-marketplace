interface LoadingStateProps {
  /** Read by screen readers, e.g. "Loading requests". */
  label: string;
  rows?: number;
  /** Height class for each placeholder row. */
  rowClassName?: string;
}

export function LoadingState({ label, rows = 3, rowClassName = 'h-20' }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) =>
      <div key={i} aria-hidden="true" className={`animate-pulse rounded-2xl bg-sand ${rowClassName}`} />
      )}
    </div>);

}
