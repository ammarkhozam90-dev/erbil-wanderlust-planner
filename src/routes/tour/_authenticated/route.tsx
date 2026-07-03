import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { RouteMap, haversineKm } from '@/components/tour/RouteMap';
import type { TourDestination } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tour/_authenticated/route')({ component: Planner });

function Planner() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);
  const [stops, setStops] = useState<TourDestination[]>([]);

  async function reload() {
    if (!tour) return;
    const { data } = await supabase.from('tour_destinations').select('*').eq('tour_id', tour.id).order('sort_order');
    setStops((data ?? []) as TourDestination[]);
  }
  useEffect(() => { reload(); }, [tour?.id]);

  async function addStop() {
    if (!tour) return;
    const { error } = await supabase.from('tour_destinations').insert({
      tour_id: tour.id, sort_order: stops.length, name: 'New stop',
    });
    if (error) return toast.error(error.message);
    reload();
  }
  async function update(s: TourDestination) {
    await supabase.from('tour_destinations').update({
      name: s.name, description: s.description,
      arrival_time: s.arrival_time, departure_time: s.departure_time,
      visit_duration_min: s.visit_duration_min,
      latitude: s.latitude, longitude: s.longitude,
      sort_order: s.sort_order,
    }).eq('id', s.id);
  }
  async function reorder(id: string, dir: -1 | 1) {
    const idx = stops.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const arr = [...stops];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    arr.forEach((s, i) => (s.sort_order = i));
    setStops(arr);
    for (const s of arr) await update(s);
  }
  async function remove(id: string) {
    await supabase.from('tour_destinations').delete().eq('id', id);
    reload();
  }

  const mapStops = stops.map((s) => ({ name: s.name, lat: s.latitude, lng: s.longitude }));
  let totalKm = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i-1], b = stops[i];
    if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
      totalKm += haversineKm(
        { lat: a.latitude, lng: a.longitude },
        { lat: b.latitude, lng: b.longitude },
      );
    }
  }
  const travelMin = Math.round((totalKm / 40) * 60); // ~40km/h avg

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Route Planner — {tour.title}</h2>
        <Button onClick={addStop}>+ Add stop</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <RouteMap stops={mapStops} />
          <p className="text-sm text-muted-foreground">
            Approx distance: <b>{totalKm.toFixed(1)} km</b> • Travel time: <b>~{travelMin} min</b>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {stops.map((s, i) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">#{i + 1}</CardTitle>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => reorder(s.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => reorder(s.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div><label className="text-sm">Name</label>
                <Input value={s.name}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))}
                  onBlur={() => update(s)} /></div>
              <div><label className="text-sm">Visit duration (min)</label>
                <Input type="number" value={s.visit_duration_min ?? ''}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, visit_duration_min: e.target.value ? +e.target.value : null } : x))}
                  onBlur={() => update(s)} /></div>
              <div><label className="text-sm">Arrival</label>
                <Input value={s.arrival_time ?? ''}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, arrival_time: e.target.value } : x))}
                  onBlur={() => update(s)} placeholder="09:00"/></div>
              <div><label className="text-sm">Departure</label>
                <Input value={s.departure_time ?? ''}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, departure_time: e.target.value } : x))}
                  onBlur={() => update(s)} placeholder="10:30"/></div>
              <div><label className="text-sm">Latitude</label>
                <Input type="number" step="any" value={s.latitude ?? ''}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, latitude: e.target.value ? +e.target.value : null } : x))}
                  onBlur={() => update(s)} /></div>
              <div><label className="text-sm">Longitude</label>
                <Input type="number" step="any" value={s.longitude ?? ''}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, longitude: e.target.value ? +e.target.value : null } : x))}
                  onBlur={() => update(s)} /></div>
              <div className="md:col-span-2"><label className="text-sm">Description</label>
                <Textarea rows={2} value={s.description}
                  onChange={(e) => setStops((p) => p.map((x) => x.id === s.id ? { ...x, description: e.target.value } : x))}
                  onBlur={() => update(s)} /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
