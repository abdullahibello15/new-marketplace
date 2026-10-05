import { useEffect, useState } from 'react';
import type { MappableVendorListing } from '../types';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Which vendor is selected (marker clicked → preview card) and which is hovered (list card under the
 * pointer → marker highlighted). Selecting scrolls the matching list card into view on desktop.
 */
export function useMapSelection(pins: MappableVendorListing[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // A selection that no longer matches the filters goes away.
  useEffect(() => {
    if (selectedId && !pins.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [pins, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.
    querySelector(`[data-vendor-id="${CSS.escape(selectedId)}"]`)?.
    scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [selectedId]);

  return {
    selectedId,
    selected: pins.find((p) => p.id === selectedId) ?? null,
    select: setSelectedId,
    hoveredId,
    hover: setHoveredId
  };
}
