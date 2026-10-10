import { format, isBefore } from 'date-fns';
import { CheckIcon, EyeIcon, XIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { DOCUMENT_TYPE_LABELS } from '../../constants';
import type { DocumentChecks, VerificationDocument } from '../../types';

const CHECKS: {key: keyof DocumentChecks;label: string;}[] = [
{ key: 'legible', label: 'Legible' },
{ key: 'notExpired', label: 'Not expired' },
{ key: 'nameMatches', label: 'Name matches profile' }];


interface DocumentChecklistProps {
  doc: VerificationDocument;
  applicantName: string;
  checks: DocumentChecks;
  disabled: boolean;
  onChange: (checks: DocumentChecks) => void;
  /** The full ID number once revealed (logged); otherwise the masked one shows. */
  revealed: string | null;
  canReveal: boolean;
  revealing: boolean;
  onReveal: () => void;
}

/** Pass / fail for each check on one document, with what the reviewer needs to check it against. */
export function DocumentChecklist({ doc, applicantName, checks, disabled, onChange, revealed, canReveal, revealing, onReveal }: DocumentChecklistProps) {
  const expired = doc.expiresOn ? isBefore(new Date(doc.expiresOn), new Date()) : false;
  return (
    <section aria-labelledby={`chk-${doc.id}`} className="rounded-2xl border border-line bg-white p-4">
      <h3 id={`chk-${doc.id}`} className="font-bold text-ink">Checklist · {DOCUMENT_TYPE_LABELS[doc.type]}</h3>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Name on document</dt>
          <dd className="font-semibold">{doc.nameOnDocument}</dd>
        </div>
        <div>
          <dt className="text-muted">Name on profile</dt>
          <dd className="font-semibold">{applicantName}</dd>
        </div>
        <div>
          <dt className="text-muted">Expires</dt>
          <dd className={`font-semibold ${expired ? 'text-clay-dark' : ''}`}>{doc.expiresOn ? `${format(new Date(doc.expiresOn), 'd MMM yyyy')}${expired ? ' (expired)' : ''}` : 'Doesn’t expire'}</dd>
        </div>
        {doc.idNumber &&
        <div>
            <dt className="text-muted">ID number</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">{revealed ?? doc.idNumber}</span>
              {!revealed && canReveal &&
            <Button variant="ghost" size="sm" icon={EyeIcon} loading={revealing} onClick={onReveal}>
                  Show (logged)
                </Button>
            }
            </dd>
          </div>
        }
      </dl>

      <fieldset className="mt-3 space-y-2" disabled={disabled}>
        <legend className="sr-only">Checks for {DOCUMENT_TYPE_LABELS[doc.type]}</legend>
        {CHECKS.map(({ key, label }) => {
          const value = checks[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <span>{label}</span>
              <div role="group" aria-label={label} className="flex rounded-lg bg-sand p-0.5">
                <button
                  type="button"
                  aria-pressed={value === true}
                  onClick={() => onChange({ ...checks, [key]: value === true ? null : true })}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-bold disabled:opacity-50 ${value === true ? 'bg-pine text-white' : 'text-muted hover:text-ink'}`}>

                  <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Pass
                </button>
                <button
                  type="button"
                  aria-pressed={value === false}
                  onClick={() => onChange({ ...checks, [key]: value === false ? null : false })}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-bold disabled:opacity-50 ${value === false ? 'bg-clay-dark text-white' : 'text-muted hover:text-ink'}`}>

                  <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Fail
                </button>
              </div>
            </div>);

        })}
      </fieldset>
    </section>);

}
