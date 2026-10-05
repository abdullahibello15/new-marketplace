import { MapPinOffIcon } from 'lucide-react';

/** Explains why the map shows fewer vendors than the result count. */
export function MissingLocationNote({ count }: {count: number;}) {
  if (count === 0) return null;
  return (
    <p className="pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-white/95 px-3 py-2 text-xs font-semibold text-muted shadow-sm">
      <MapPinOffIcon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {count === 1 ? '1 matching vendor hasn’t' : `${count} matching vendors haven’t`} added a map location yet, so
        they’re only in the list.
      </span>
    </p>);

}
