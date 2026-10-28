export interface StatusStyle {
  label: string;
  badgeClass: string;
  dotClass: string;
}

/** A coloured status pill with a dot and the label, so status never relies on colour alone. Used for jobs and orders. */
export function StatusBadge({ meta, className = '' }: {meta: StatusStyle;className?: string;}) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${meta.badgeClass} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>);

}
