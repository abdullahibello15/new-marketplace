import { useContext } from 'react';
import { PlaceContext, type PlaceContextValue } from '../context/placeContext';

export function usePlace(): PlaceContextValue {
  const ctx = useContext(PlaceContext);
  if (!ctx) throw new Error('usePlace must be used within PlaceProvider');
  return ctx;
}
