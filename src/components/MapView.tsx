import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in bundlers (same fix as MapPicker.tsx)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  className?: string;
}

// Read-only map — shows a single pinned location, no drag, no click-to-move.
// Kept separate from MapPicker (which is for editing) so this can be reused
// anywhere a location just needs to be *displayed* — business detail pages
// today, and easily swapped for a native map later if this ever runs inside
// a Capacitor WebView.
export function MapView({ lat, lng, label, zoom = 15, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false, // avoid hijacking page scroll while browsing
    }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    if (label) marker.bindPopup(label);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

  return <div ref={containerRef} className={className ?? 'h-64 w-full rounded-xl border border-border'} />;
}
