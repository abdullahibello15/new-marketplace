import { TriangleAlertIcon } from 'lucide-react';

/** The cash caveat. Shown wherever cash is chosen or confirmed. */
export function CashNote() {
  return (
    <p className="flex gap-2 rounded-xl bg-[#FBF3DC] px-3 py-2.5 text-sm text-ink">
      <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-mustard-dark" aria-hidden="true" />
      <span>
        <strong>Cash isn’t protected.</strong> Cash payments aren’t covered by Gwani’s escrow or refunds. Only hand over cash once the work is done
        (or you have your order), and both confirm the amount in the app.
      </span>
    </p>);

}
