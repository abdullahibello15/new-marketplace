import React, { useCallback, useMemo, useState } from 'react';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { DEFAULT_PLACE, STORAGE_KEYS } from '../constants';
import { PlaceSheet } from '../components/location/PlaceSheet';
import { placeSchema } from '../schemas';
import { PlaceContext, type PlaceContextValue } from './placeContext';
import type { Place } from '../types';

const parsePlace = (raw: unknown): Place | null => {
  const result = placeSchema.safeParse(raw);
  return result.success ? result.data : null;
};

/**
 * Holds the customer's selected place (saved to localStorage) and renders the one place picker,
 * so the home chip, empty states and the search page can all open it.
 */
export function PlaceProvider({ children }: {children: React.ReactNode;}) {
  const [place, setPlace] = usePersistentState<Place>(STORAGE_KEYS.Place, DEFAULT_PLACE, parsePlace);
  const [isPickerOpen, setPickerOpen] = useState(false);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const value = useMemo<PlaceContextValue>(
    () => ({ place, setPlace, isPickerOpen, openPicker, closePicker }),
    [place, setPlace, isPickerOpen, openPicker, closePicker]
  );

  return (
    <PlaceContext.Provider value={value}>
      {children}
      <PlaceSheet />
    </PlaceContext.Provider>);

}
