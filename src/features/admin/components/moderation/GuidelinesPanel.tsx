import { XIcon } from 'lucide-react';
import { MODERATION_GUIDELINES } from '../../config/moderationGuidelines';

/** The moderation rules (static config), opened beside the item being reviewed. */
export function GuidelinesPanel({ onClose }: {onClose: () => void;}) {
  return (
    <aside aria-labelledby="guidelines-heading" className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="guidelines-heading" className="font-bold text-ink">Moderation guidelines</h2>
        <button type="button" onClick={onClose} aria-label="Close guidelines" className="rounded-lg p-1.5 text-muted hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-sm">
        {MODERATION_GUIDELINES.map((g) =>
        <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <h3 id={`g-${g.id}`} className="text-xs font-bold uppercase tracking-wider text-muted">{g.title}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-ink">
              {g.rules.map((r) =>
            <li key={r}>{r}</li>
            )}
            </ul>
          </section>
        )}
      </div>
    </aside>);

}
