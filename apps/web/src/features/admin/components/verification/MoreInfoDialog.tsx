import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { errorText, field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { DOCUMENT_TYPE, DOCUMENT_TYPE_LABELS } from '../../constants';
import type { DocumentType } from '../../types';

interface MoreInfoDialogProps {
  open: boolean;
  vendorName: string;
  onConfirm: (message: string, documents: DocumentType[]) => Promise<boolean>;
  onCancel: () => void;
}

/** "Request more info": which documents the vendor must upload, and a message they'll see. */
export function MoreInfoDialog({ open, vendorName, onConfirm, onCancel }: MoreInfoDialogProps) {
  const [docs, setDocs] = useState<DocumentType[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDocs([]);
      setMessage('');
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (docs.length === 0) return setError('Choose at least one document.');
    if (message.trim().length < 10) return setError('Tell the vendor what you need (at least 10 characters).');
    setBusy(true);
    const done = await onConfirm(message, docs);
    setBusy(false);
    if (done) onCancel();
  }

  return (
    <Dialog open={open} onClose={onCancel} dismissible={!busy} title="Request more information" description={`${vendorName} gets a notification and can upload from their dashboard.`}>
      <fieldset>
        <legend className={labelClass}>Documents needed</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {Object.values(DOCUMENT_TYPE).map((t) =>
          <label key={t} className="flex items-center gap-2 text-sm">
              <input
              type="checkbox"
              checked={docs.includes(t)}
              onChange={(e) => setDocs((d) => e.target.checked ? [...d, t] : d.filter((x) => x !== t))}
              className="h-4 w-4 accent-pine" />

              {DOCUMENT_TYPE_LABELS[t]}
            </label>
          )}
        </div>
      </fieldset>
      <label htmlFor="more-info-message" className={`${labelClass} mt-4`}>
        Message to the vendor
      </label>
      <textarea
        id="more-info-message"
        rows={4}
        maxLength={500}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. The proof of address is cut off at the bottom. Please upload a clear photo of the whole page, dated in the last 3 months."
        aria-describedby={error ? 'more-info-error' : undefined}
        className={`${field} ${ok}`} />

      {error && <p id="more-info-error" className={errorText}>{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} loading={busy}>
          Send request
        </Button>
      </div>
    </Dialog>);

}
