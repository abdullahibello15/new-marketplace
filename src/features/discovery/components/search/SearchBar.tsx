import { useEffect, useId } from 'react';
import { SearchIcon } from 'lucide-react';
import { QUERY_MAX_LENGTH } from '../../constants';
import { useTypeahead } from '../../hooks/useTypeahead';
import { SuggestionPanel } from './SuggestionPanel';

interface SearchBarProps {
  initialQuery?: string;
}

/**
 * Search box with typeahead, following the ARIA combobox pattern: focus stays in the input while
 * ↑/↓ move the highlighted suggestion (aria-activedescendant), Enter picks it, Esc closes the list.
 */
export function SearchBar({ initialQuery = '' }: SearchBarProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionDomId = (index: number) => `${uid}-option-${index}`;
  const t = useTypeahead(initialQuery);

  const panelVisible = t.open && (t.status === 'recent' ? t.options.length > 0 : t.term !== '');
  const activeId = panelVisible && t.activeIndex >= 0 ? optionDomId(t.activeIndex) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        t.submit();
      }}
      className="relative">

      <label htmlFor={inputId} className="sr-only">
        Search categories, services and vendors
      </label>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={inputId}
        type="search"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={QUERY_MAX_LENGTH}
        value={t.query}
        onChange={(e) => t.setQuery(e.target.value)}
        onFocus={() => t.setOpen(true)}
        onBlur={() => t.setOpen(false)}
        onKeyDown={t.onKeyDown}
        aria-expanded={panelVisible && t.options.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        placeholder="Search plumbers, tailors, groceries…"
        className="w-full rounded-2xl border border-line bg-white py-3.5 pl-12 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />

      {panelVisible &&
      <SuggestionPanel
        listboxId={listboxId}
        optionDomId={optionDomId}
        options={t.options}
        activeIndex={t.activeIndex}
        status={t.status}
        term={t.term}
        onSelect={t.select}
        onClearRecent={t.clearRecent} />

      }
    </form>);

}
