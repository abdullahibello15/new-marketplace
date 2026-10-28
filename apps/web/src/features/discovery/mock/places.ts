import type { NigerLga } from '../../../types/marketplace';
import { PLACE_KIND } from '../constants';
import type { Place } from '../types';

/** [lga, headquarters town, lat, lng]. Coordinates are approximate LGA headquarters. */
const LGAS: [NigerLga, string, number, number][] = [
['Agaie', 'Agaie', 9.0083, 6.3183],
['Agwara', 'Agwara', 10.7083, 4.5817],
['Bida', 'Bida', 9.0833, 6.0167],
['Borgu', 'New Bussa', 9.8833, 4.5167],
['Bosso', 'Minna', 9.65, 6.52],
['Chanchaga', 'Minna', 9.6139, 6.5569],
['Edati', 'Enagi', 9.0, 5.6167],
['Gbako', 'Lemu', 9.3833, 6.0333],
['Gurara', 'Gawu Babangida', 9.3667, 7.0167],
['Katcha', 'Katcha', 8.7667, 6.3],
['Kontagora', 'Kontagora', 10.4, 5.4667],
['Lapai', 'Lapai', 9.05, 6.5667],
['Lavun', 'Kutigi', 9.2, 5.6],
['Magama', 'Nasko', 10.4, 4.95],
['Mariga', 'Bangi', 10.65, 5.85],
['Mashegu', 'Mashegu', 9.9667, 5.7833],
['Mokwa', 'Mokwa', 9.295, 5.0544],
['Muya', 'Sarkin Pawa', 10.0167, 7.0833],
['Paikoro', 'Paiko', 9.4333, 6.6333],
['Rafi', 'Kagara', 10.1833, 6.25],
['Rijau', 'Rijau', 11.1, 5.25],
['Shiroro', 'Kuta', 9.8667, 6.7167],
['Suleja', 'Suleja', 9.1806, 7.1794],
['Tafa', 'Sabon Wuse', 9.2167, 7.2333],
['Wushishi', 'Wushishi', 9.7333, 6.0667]];


/** [town, lga, context, lat, lng]: neighbourhoods customers actually say. */
const TOWNS: [string, NigerLga, string, number, number][] = [
['Tunga', 'Chanchaga', 'Minna', 9.5962, 6.5531],
['Maitumbi', 'Bosso', 'Minna', 9.6331, 6.5233],
['Kpakungu', 'Chanchaga', 'Minna', 9.5901, 6.5284],
['Tudun Wada', 'Chanchaga', 'Minna', 9.6161, 6.5604],
['Bosso Estate', 'Bosso', 'Minna', 9.6555, 6.5121],
['Gidan Kwano', 'Bosso', 'Minna', 9.5334, 6.4502],
['Barkin Sale', 'Chanchaga', 'Minna', 9.625, 6.5683],
['Madalla', 'Suleja', 'Suleja', 9.1, 7.2167],
['Zuma', 'Suleja', 'Suleja', 9.1556, 7.2125]];


const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const mockPlaces: Place[] = [
...TOWNS.map(([name, lga, context, lat, lng]): Place => ({
  id: `town-${slug(name)}`,
  name,
  kind: PLACE_KIND.Town,
  lga,
  context,
  coordinates: { lat, lng }
})),
...LGAS.map(([lga, hq, lat, lng]): Place => ({
  id: `lga-${slug(lga)}`,
  name: lga,
  kind: PLACE_KIND.Lga,
  lga,
  // "Suleja, Suleja" reads oddly, so LGAs named after their HQ say the state instead.
  context: hq === lga ? 'Niger State' : hq,
  coordinates: { lat, lng }
}))];


/** Where the mocked "Use my current location" says the phone is (Tunga, Minna). */
export const MOCK_DEVICE_POSITION = { lat: 9.5975, lng: 6.5525 };
