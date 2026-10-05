import React, { Suspense, lazy } from 'react';
import { ListIcon, Loader2Icon, SearchXIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { placeLabel } from '../../constants';
import { MapPreviewCard } from './MapPreviewCard';
import { MissingLocationNote } from './MissingLocationNote';
import type { AsyncStatus } from '../../../../hooks/useAsyncData';
import type { MappableVendorListing, Place, VendorMapResult } from '../../types';

// Leaflet (~150 kB with CSS) is only downloaded when the map view opens.
const VendorMap = lazy(() => import('./VendorMap').then((m) => ({ default: m.VendorMap })));

interface ResultsMapViewProps {
  place: Place;
  result: VendorMapResult;
  status: AsyncStatus;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  selected: MappableVendorListing | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  /** Phone-only top bar: back to the list, plus the filters button. */
  onShowList: () => void;
  filtersButton: React.ReactNode;
  emptyAction: React.ReactNode;
}

function MapLoading() {
  return (
    <div role="status" className="flex h-full w-full items-center justify-center bg-sand text-sm font-semibold text-muted">
      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      Loading map…
    </div>);

}

/**
 * Phones: a full-screen map with its own top bar and a bottom preview card.
 * Desktop: the right-hand pane of the split view, pinned while the list scrolls.
 */
export function ResultsMapView(props: ResultsMapViewProps) {
  const { place, result, status, error, hasData, selected } = props;
  const count = result.pins.length + result.missingLocation;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-cream lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-cream px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <Button variant="outline" size="sm" icon={ListIcon} onClick={props.onShowList}>
          List
        </Button>
        <p className="truncate text-sm font-bold text-ink" aria-live="polite">
          {status === 'loading' && !hasData ? 'Searching…' : `${count} ${count === 1 ? 'vendor' : 'vendors'}`}
        </p>
        {props.filtersButton}
      </div>

      <div className="relative isolate min-h-0 flex-1">
        <Suspense fallback={<MapLoading />}>
          <VendorMap
            center={place.coordinates}
            centerLabel={placeLabel(place)}
            pins={result.pins}
            selectedId={selected?.id ?? null}
            hoveredId={props.hoveredId}
            onSelect={props.onSelect} />

        </Suspense>

        {/* Overlays sit above Leaflet's panes (z-index 400–1000). */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-col items-center gap-2 lg:left-14">
          {status === 'loading' &&
          <p role="status" className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted shadow">
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Updating map…
            </p>
          }
          {status !== 'error' && <MissingLocationNote count={result.missingLocation} />}
        </div>

        {status === 'error' &&
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-cream/80 p-4">
            <ErrorState message={error ?? ''} onRetry={props.onRetry} />
          </div>
        }
        {status === 'success' && count === 0 &&
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-cream/70 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white">
              <EmptyState icon={SearchXIcon} title="No vendors match your filters" description="Try removing a filter or changing your location." action={props.emptyAction} />
            </div>
          </div>
        }

        {selected && <MapPreviewCard listing={selected} onClose={() => props.onSelect(null)} />}
      </div>
    </div>);

}
