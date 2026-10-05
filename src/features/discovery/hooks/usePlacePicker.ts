import { useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { normalizeSearch } from '../../../lib/sanitize';
import { PLACE_KIND, placeLabel } from '../constants';
import { detectCurrentPlace, listPlaces } from '../services/placeService';
import { usePlace } from './usePlace';
import type { Place } from '../types';

/** State for the place sheet: the searchable list, choosing, and "use my current location". */
export function usePlacePicker() {
  const { place: current, setPlace, closePicker } = usePlace();
  const toast = useToast();
  const { data, status, error, reload } = useAsyncData(listPlaces);
  const [query, setQuery] = useState('');
  const [detecting, setDetecting] = useState(false);

  const groups = useMemo(() => {
    const q = normalizeSearch(query);
    const matches = (data ?? []).filter((p) => !q || [p.name, p.lga, p.context].some((t) => t.toLowerCase().includes(q)));
    return {
      towns: matches.filter((p) => p.kind === PLACE_KIND.Town),
      lgas: matches.filter((p) => p.kind === PLACE_KIND.Lga)
    };
  }, [data, query]);

  function choose(place: Place) {
    setPlace(place);
    closePicker();
    if (place.id !== current.id) toast.success(`Showing vendors near ${placeLabel(place)}.`);
  }

  async function detectLocation() {
    setDetecting(true);
    try {
      choose(await detectCurrentPlace());
    } catch (e) {
      toast.error(errorMessage(e, 'We couldn’t find your location. Pick your area from the list instead.'));
    } finally {
      setDetecting(false);
    }
  }

  return { current, query, setQuery, groups, status, error, reload, choose, detecting, detectLocation };
}
