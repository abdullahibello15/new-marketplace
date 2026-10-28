import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { tradeBrowseLabel } from '../../../i18n/labels';
import { useState } from 'react';
import { MapPinIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { PageContainer } from '../../../components/ui/PageContainer';
import { browseCategories } from '../../../data/tradeCategories';
import { RESULTS_VIEW, placeLabel } from '../constants';
import { ActiveFilterChips } from '../components/filters/ActiveFilterChips';
import { DesktopFilterPanel } from '../components/filters/DesktopFilterPanel';
import { FiltersButton } from '../components/filters/FiltersButton';
import { MobileFilterSheet } from '../components/filters/MobileFilterSheet';
import { SortSelect } from '../components/filters/SortSelect';
import { ViewToggle } from '../components/filters/ViewToggle';
import { VendorListingResults } from '../components/listings/VendorListingResults';
import { PlaceChip } from '../components/location/PlaceChip';
import { ResultsMapView } from '../components/map/ResultsMapView';
import { SearchBar } from '../components/search/SearchBar';
import { useMapSelection } from '../hooks/useMapSelection';
import { usePlace } from '../hooks/usePlace';
import { useSearchResults } from '../hooks/useSearchResults';
import { useVendorMapPins } from '../hooks/useVendorMapPins';
import type { SearchFilters } from '../types';

function pageTitle(f: SearchFilters, t: TFunction): string {
  if (f.query) return `“${f.query}”`;
  if (f.categories.length === 1 && browseCategories.some((c) => c.id === f.categories[0])) return tradeBrowseLabel(f.categories[0]);
  return t('search.title');
}

export function SearchResultsSection() {
  const { t } = useTranslation('discovery');
  const s = useSearchResults();
  const { place, openPicker } = usePlace();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { list, filters } = s;
  const isMap = filters.view === RESULTS_VIEW.Map;
  const map = useVendorMapPins(s.criteria, place, isMap);
  const selection = useMapSelection(map.result.pins);
  const hasFilters = s.activeCount > 0 || Boolean(filters.query);

  const filtersButton = <FiltersButton activeCount={s.activeCount} expanded={sheetOpen} onClick={() => setSheetOpen(true)} />;

  const emptyAction =
  <div className="flex flex-wrap justify-center gap-2">
      {hasFilters &&
    <Button variant="secondary" size="sm" onClick={s.clearAll}>
          {t('results.clearFilters')}
        </Button>
    }
      <Button variant="secondary" size="sm" icon={MapPinIcon} onClick={openPicker}>
        {t('place.change')}
      </Button>
    </div>;


  const toolbar =
  <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* The left filter column only exists in list view on desktop; otherwise filters open in a dialog. */}
          <div className={isMap ? '' : 'lg:hidden'}>{filtersButton}</div>
          <h2 className="text-sm font-bold text-ink" aria-live="polite">
            {list.status === 'loading' ? t('results.searching') : t('results.count', { count: list.total })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle value={filters.view} onChange={s.setView} />
          <SortSelect value={filters.sort} onChange={s.setSort} />
        </div>
      </div>
      <ActiveFilterChips chips={s.chips} onRemove={(chip) => s.setFilters(chip.remove(filters))} onClearAll={s.clearAll} />
    </div>;


  const results =
  <VendorListingResults
    items={list.items}
    total={list.total}
    status={list.status}
    error={list.error}
    hasMore={list.hasMore}
    onLoadMore={list.loadMore}
    onRetry={list.retry}
    emptyTitle={t('results.emptyFiltersTitle')}
    emptyDescription={t('results.emptyFiltersText', { place: placeLabel(place) })}
    emptyAction={emptyAction}
    singleColumn={isMap}
    highlightedId={isMap ? selection.selectedId : null}
    onItemHover={isMap ? selection.hover : undefined} />;



  return (
    <>
      <PageHeader title={pageTitle(filters, t)} subtitle={t('search.near', { place: placeLabel(place) })} backTo={{ to: '/', label: t('search.home') }}>
        <div className="space-y-3 lg:max-w-xl">
          <PlaceChip />
          {/* Keyed by the query so the box shows the new search after navigating from a suggestion. */}
          <SearchBar key={filters.query} initialQuery={filters.query} />
        </div>
      </PageHeader>

      <PageContainer>
        {isMap ?
        <div className="space-y-4">
            {toolbar}
            {/* Desktop: list left, map right. Phones: the map takes over the screen (see ResultsMapView). */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <div className="hidden min-w-0 lg:block">{results}</div>
              <ResultsMapView
              place={place}
              result={map.result}
              status={map.status}
              error={map.error}
              hasData={map.hasData}
              onRetry={map.reload}
              selected={selection.selected}
              hoveredId={selection.hoveredId}
              onSelect={selection.select}
              onShowList={() => s.setView(RESULTS_VIEW.List)}
              filtersButton={filtersButton}
              emptyAction={emptyAction} />

            </div>
          </div> :

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
            <div className="hidden lg:block">
              <DesktopFilterPanel filters={filters} activeCount={s.activeCount} onApply={s.setFilters} onClearAll={s.clearAll} />
            </div>
            <div className="min-w-0 space-y-4">
              {toolbar}
              {results}
            </div>
          </div>
        }
      </PageContainer>

      <MobileFilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} filters={filters} onApply={s.setFilters} />
    </>);

}
