import { mockResponse } from '../../../services/mockApi';
import { distanceKm } from '../../../lib/geo';
import { MOCK_DEVICE_POSITION, mockPlaces } from '../mock/places';
import type { Place } from '../types';

/** GET /places — LGAs and towns customers can pick. */
export function listPlaces(): Promise<Place[]> {
  return mockResponse(() => mockPlaces, 300);
}

/**
 * MOCK: "Use my current location". The real version would read navigator.geolocation (after asking
 * permission) and call GET /places/nearest?lat=&lng=. Here the phone is always in Tunga, Minna.
 */
export function detectCurrentPlace(): Promise<Place> {
  return mockResponse(() => {
    const nearest = [...mockPlaces].sort(
      (a, b) => distanceKm(MOCK_DEVICE_POSITION, a.coordinates) - distanceKm(MOCK_DEVICE_POSITION, b.coordinates)
    )[0];
    return nearest;
  }, 900);
}
