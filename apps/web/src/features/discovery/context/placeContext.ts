import { createContext } from 'react';
import type { Place } from '../types';

export interface PlaceContextValue {
  /** The customer's chosen area. Drives the vendor feed and search. */
  place: Place;
  setPlace: (place: Place) => void;
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
}

export const PlaceContext = createContext<PlaceContextValue | null>(null);
