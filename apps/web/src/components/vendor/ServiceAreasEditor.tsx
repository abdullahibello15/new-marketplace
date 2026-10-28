import { useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { ProfileSection } from './ProfileSection';
import { bad, errorText, field, label, ok } from './formStyles';
import { nigerLgas } from '../../data/nigerLgas';
import type { NigerLga } from '../../types/marketplace';

interface ServiceAreasEditorProps {
  saved: NigerLga[];
  onSave: (areas: NigerLga[]) => void;
}

/** Keeps areas in the same alphabetical order as the master list. */
const sortAreas = (areas: NigerLga[]) => nigerLgas.filter((lga) => areas.includes(lga));

export function ServiceAreasEditor({ saved, onSave }: ServiceAreasEditorProps) {
  const [areas, setAreas] = useState<NigerLga[]>(saved);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const available = nigerLgas.filter((lga) => !areas.includes(lga));

  function change(next: NigerLga[]) {
    setAreas(sortAreas(next));
    setError('');
    setIsSaved(false);
  }

  function remove(lga: NigerLga) {
    change(areas.filter((a) => a !== lga));
    // The chip's button disappears, so send focus back to the picker.
    selectRef.current?.focus();
  }

  function handleSave() {
    if (areas.length === 0) {
      setError('Pick at least one LGA you serve.');
      return;
    }
    onSave(areas);
    setIsSaved(true);
  }

  return (
    <ProfileSection
      id="profile-areas"
      title="Service areas"
      description="The Niger State LGAs where you take jobs."
      saveLabel="Save areas"
      saved={isSaved}
      onSubmit={handleSave}>

      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="areas-add" className={label}>Add a Local Government Area</label>
        <span className="text-xs font-semibold text-muted">
          {areas.length} of {nigerLgas.length}
        </span>
      </div>
      <select
        id="areas-add"
        ref={selectRef}
        value=""
        disabled={available.length === 0}
        onChange={(e) => e.target.value && change([...areas, e.target.value as NigerLga])}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'areas-error' : undefined}
        className={`${field} ${error ? bad : ok} disabled:opacity-60`}>

        <option value="">{available.length ? 'Choose an LGA…' : 'All LGAs selected'}</option>
        {available.map((lga) =>
        <option key={lga} value={lga}>{lga}</option>
        )}
      </select>
      {error && <p id="areas-error" className={errorText}>{error}</p>}

      {areas.length > 0 &&
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected areas">
          {areas.map((lga) =>
        <li key={lga} className="inline-flex items-center gap-1 rounded-full bg-sand py-1 pl-3 pr-1 text-sm font-semibold text-ink">
              {lga}
              <button
            type="button"
            onClick={() => remove(lga)}
            aria-label={`Remove ${lga}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-line hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
        )}
        </ul>
      }

      <div className="mt-3 flex gap-4 text-sm font-semibold">
        {available.length > 0 &&
        <button type="button" onClick={() => change([...nigerLgas])} className="rounded text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
            Select all
          </button>
        }
        {areas.length > 0 &&
        <button type="button" onClick={() => change([])} className="rounded text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
            Clear all
          </button>
        }
      </div>
    </ProfileSection>);

}
