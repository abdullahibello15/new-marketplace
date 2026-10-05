import { useEffect, useRef } from 'react';
import L from 'leaflet';
// Must come after 'leaflet': the plugin extends the global L that Leaflet sets.
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { MAP_CLUSTER_RADIUS_PX, MAP_DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from '../../constants';
import { clusterIcon, pinClassName, placeIcon, vendorPinIcon, type PinState } from './mapIcons';
import type { GeoPoint } from '../../../../types/marketplace';
import type { MappableVendorListing } from '../../types';

interface VendorMapProps {
  center: GeoPoint;
  /** e.g. "Chanchaga, Minna", announced as the map's centre. */
  centerLabel: string;
  pins: MappableVendorListing[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
}

const pinLabel = (pin: MappableVendorListing) => pin.reviews === 0 ? 'New' : pin.rating.toFixed(1);
const pinTitle = (pin: MappableVendorListing) =>
`${pin.name}, ${pin.reviews === 0 ? 'no reviews yet' : `rated ${pin.rating.toFixed(1)} from ${pin.reviews} reviews`}`;

/**
 * Leaflet + OpenStreetMap, driven imperatively from effects so React never re-creates the map.
 * Loaded lazily: Leaflet and its CSS only download when someone opens the map view.
 */
export function VendorMap({ center, centerLabel, pins, selectedId, hoveredId, onSelect }: VendorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const placeMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef(new Map<string, {marker: L.Marker;label: string;}>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const initialCenter = useRef(center);

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { lat, lng } = initialCenter.current;
    const map = L.map(el).setView([lat, lng], MAP_DEFAULT_ZOOM);
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const cluster = L.markerClusterGroup({
      maxClusterRadius: MAP_CLUSTER_RADIUS_PX,
      showCoverageOnHover: false,
      iconCreateFunction: (c) => clusterIcon(c.getChildCount())
    });
    map.addLayer(cluster);
    placeMarkerRef.current = L.marker([lat, lng], { icon: placeIcon(), interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(map);
    // A click on the map itself (not a marker) closes the preview.
    map.on('click', () => onSelectRef.current(null));
    // The split view and full-screen layouts resize the container; Leaflet must be told.
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(el);

    mapRef.current = map;
    clusterRef.current = cluster;
    const markers = markersRef.current;
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markers.clear();
    };
  }, []);

  // Re-centre when the customer picks another place.
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], MAP_DEFAULT_ZOOM);
    placeMarkerRef.current?.setLatLng([center.lat, center.lng]);
  }, [center.lat, center.lng]);

  // Rebuild markers when the results change.
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current.clear();
    const markers = pins.map((pin) => {
      const label = pinLabel(pin);
      const marker = L.marker([pin.coordinates.lat, pin.coordinates.lng], {
        icon: vendorPinIcon(label, 'default'),
        title: pinTitle(pin),
        keyboard: true,
        riseOnHover: true
      });
      marker.on('click', () => onSelectRef.current(pin.id));
      markersRef.current.set(pin.id, { marker, label });
      return marker;
    });
    cluster.addLayers(markers);
  }, [pins]);

  // Show selected and hovered states. The icon element is restyled in place (not replaced), so a marker
  // that has keyboard focus keeps it. options.icon is updated too for markers currently inside a cluster.
  useEffect(() => {
    markersRef.current.forEach(({ marker, label }, id) => {
      const state: PinState = id === selectedId ? 'selected' : id === hoveredId ? 'hovered' : 'default';
      marker.options.icon = vendorPinIcon(label, state);
      const pin = marker.getElement()?.firstElementChild;
      if (pin) pin.className = pinClassName(state);
      marker.setZIndexOffset(state === 'selected' ? 1000 : state === 'hovered' ? 500 : 0);
    });
  }, [selectedId, hoveredId, pins]);

  // Bring the selected marker into view, opening its cluster if needed.
  useEffect(() => {
    const entry = selectedId ? markersRef.current.get(selectedId) : undefined;
    if (!entry || !clusterRef.current) return;
    clusterRef.current.zoomToShowLayer(entry.marker, () => mapRef.current?.panTo(entry.marker.getLatLng()));
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Map of matching vendors around ${centerLabel}. Use Tab to reach vendor markers and Enter to preview one.`}
      onKeyDown={(e) => e.key === 'Escape' && onSelectRef.current(null)}
      className="h-full w-full bg-sand" />);


}
