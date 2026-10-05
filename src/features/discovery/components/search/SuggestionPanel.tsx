import { Loader2Icon } from 'lucide-react';
import { SUGGESTION_GROUP_LABELS } from '../../constants';
import { SuggestionRow } from './SuggestionRow';
import type { TypeaheadStatus } from '../../hooks/useTypeahead';
import type { SuggestionGroupId, SuggestionOption } from '../../types';

interface SuggestionPanelProps {
  listboxId: string;
  optionDomId: (index: number) => string;
  options: SuggestionOption[];
  activeIndex: number;
  status: TypeaheadStatus;
  term: string;
  onSelect: (option: SuggestionOption) => void;
  onClearRecent: () => void;
}

/** The dropdown under the search box. Mouse-down is cancelled so tapping a row doesn't blur the input first. */
export function SuggestionPanel({ listboxId, optionDomId, options, activeIndex, status, term, onSelect, onClearRecent }: SuggestionPanelProps) {
  // Options arrive flattened in group order; regroup them for headings while keeping their indexes.
  const groups = options.reduce<{group: SuggestionGroupId;rows: {option: SuggestionOption;index: number;}[];}[]>((acc, option, index) => {
    const last = acc[acc.length - 1];
    if (last?.group === option.group) last.rows.push({ option, index });else
    acc.push({ group: option.group, rows: [{ option, index }] });
    return acc;
  }, []);

  let message = '';
  if (status === 'loading') message = 'Searching…';else
  if (status === 'error') message = 'Couldn’t load suggestions. Press Enter to search anyway.';else
  if (status === 'ready' && options.length === 0) message = `No suggestions for “${term}”. Press Enter to search.`;

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 text-ink shadow-xl">

      <p className="sr-only" role="status">
        {status === 'loading' ? 'Searching' : `${options.length} suggestions available`}
      </p>
      {message &&
      <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
          {status === 'loading' && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {message}
        </p>
      }

      {/* Outside the listbox (only options belong inside), placed level with the "Recent searches" heading. */}
      {status === 'recent' &&
      <button
        type="button"
        onClick={onClearRecent}
        className="absolute right-5 top-[1.15rem] z-10 rounded text-xs font-bold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

          Clear
        </button>
      }

      {options.length > 0 &&
      <ul id={listboxId} role="listbox" aria-label="Search suggestions">
          {groups.map(({ group, rows }) =>
        <li key={group} role="presentation" className="py-1">
              <div id={`${listboxId}-${group}`} className="px-3 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                {SUGGESTION_GROUP_LABELS[group]}
              </div>
              <ul role="group" aria-labelledby={`${listboxId}-${group}`}>
                {rows.map(({ option, index }) =>
            <SuggestionRow key={option.id} option={option} domId={optionDomId(index)} active={index === activeIndex} onSelect={onSelect} />
            )}
              </ul>
            </li>
        )}
        </ul>
      }
    </div>);

}
