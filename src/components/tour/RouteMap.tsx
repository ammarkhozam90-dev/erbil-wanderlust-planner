import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor: [12,41],
});

interface Stop { name: string; lat: number | null; lng: number | null; }

export function RouteMap({ stops }: { stops: Stop[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([36.1911, 44.0094], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((l) => { if ((l as any)._latlng || (l as any)._latlngs) map.removeLayer(l); });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const pts: L.LatLngExpression[] = [];
    stops.forEach((s, i) => {
      if (s.lat == null || s.lng == null) return;
      L.marker([s.lat, s.lng], { icon: Icon }).addTo(map).bindTooltip(`${i+1}. ${s.name || 'Stop'}`);
      pts.push([s.lat, s.lng]);
    });
    if (pts.length > 1) {
      L.polyline(pts, { color: '#2563eb', weight: 4 }).addTo(map);
      map.fitBounds(L.latLngBounds(pts as any).pad(0.2));
    } else if (pts.length === 1) {
      map.setView(pts[0] as any, 13);
    }
  }, [stops]);

  return <div ref={ref} className="h-96 w-full rounded-md border" />;
}

export function haversineKm(a: {lat:number,lng:number}, b: {lat:number,lng:number}) {
  const R = 6371, toRad = (v:number)=>v*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
