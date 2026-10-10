import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('discovery');
  const ta = useTypeahead(initialQuery);

  const panelVisible = ta.open && (ta.status === 'recent' ? ta.options.length > 0 : ta.term !== '');
  const activeId = panelVisible && ta.activeIndex >= 0 ? optionDomId(ta.activeIndex) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        ta.submit();
      }}
      className="relative">

      <label htmlFor={inputId} className="sr-only">
        {t('search.label')}
      </label>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={inputId}
        type="search"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={QUERY_MAX_LENGTH}
        value={ta.query}
        onChange={(e) => ta.setQuery(e.target.value)}
        onFocus={() => ta.setOpen(true)}
        onBlur={() => ta.setOpen(false)}
        onKeyDown={ta.onKeyDown}
        aria-expanded={panelVisible && ta.options.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        placeholder={t('search.placeholder')}
        className="w-full rounded-2xl border border-line bg-white py-3.5 pl-12 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20" />

      {panelVisible &&
      <SuggestionPanel
        listboxId={listboxId}
        optionDomId={optionDomId}
        options={ta.options}
        activeIndex={ta.activeIndex}
        status={ta.status}
        term={ta.term}
        onSelect={ta.select}
        onClearRecent={ta.clearRecent} />

      }
    </form>);

}
