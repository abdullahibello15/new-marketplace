import L from 'leaflet';

export type PinState = 'default' | 'hovered' | 'selected';

/* Markers are HTML (divIcon) rather than images: they can show the rating, change colour when selected,
 * and avoid Leaflet's default image icons, whose paths break under bundlers. */

export const PIN_CLASSES: Record<PinState, string> = {
  default: 'bg-pine text-white',
  hovered: 'scale-110 bg-mustard text-ink',
  selected: 'scale-125 bg-clay text-white'
};

const PIN_BASE =
'flex h-8 min-w-[2.5rem] items-center justify-center rounded-full border-2 border-white px-2 text-xs font-bold shadow-md transition-transform duration-150';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function vendorPinIcon(label: string, state: PinState): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="${PIN_BASE} ${PIN_CLASSES[state]}">${escapeHtml(label)}</span>`,
    iconSize: [40, 32],
    iconAnchor: [20, 16]
  });
}

export const pinClassName = (state: PinState) => `${PIN_BASE} ${PIN_CLASSES[state]}`;

export function clusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white/80 bg-pine-deep text-sm font-extrabold text-white shadow-lg">${count}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

/** The customer's selected place, the centre of the map. */
export function placeIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: '<span class="block h-4 w-4 rounded-full border-[3px] border-white bg-[#2B4A7A] shadow-[0_0_0_6px_rgba(43,74,122,0.25)]"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}
