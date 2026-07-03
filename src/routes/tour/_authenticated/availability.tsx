import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { TourAvailability } from '@/integrations/supabase/tour-types';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const Route = createFileRoute('/tour/_authenticated/availability')({ component: Availability });

function Availability() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);
  const [rows, setRows] = useState<TourAvailability[]>([]);
  const [specific, setSpecific] = useState('');
  const [maxB, setMaxB] = useState('');

  async function reload() {
    if (!tour) return;
    const { data } = await supabase.from('tour_availability').select('*').eq('tour_id', tour.id);
    setRows((data ?? []) as TourAvailability[]);
  }
  useEffect(() => { reload(); }, [tour?.id]);

  async function toggleDay(day: number, checked: boolean) {
    if (!tour) return;
    const existing = rows.find((r) => r.day_of_week === day && r.is_recurring);
    if (checked && !existing) {
      await supabase.from('tour_availability').insert({
        tour_id: tour.id, day_of_week: day, is_recurring: true,
        max_bookings: maxB ? +maxB : null,
      });
    } else if (!checked && existing) {
      await supabase.from('tour_availability').delete().eq('id', existing.id);
    }
    reload();
  }

  async function addSpecific() {
    if (!tour || !specific) return;
    await supabase.from('tour_availability').insert({
      tour_id: tour.id, specific_date: specific, is_recurring: false,
      max_bookings: maxB ? +maxB : null,
    });
    setSpecific('');
    reload();
  }
  async function toggleFull(r: TourAvailability) {
    await supabase.from('tour_availability').update({ is_fully_booked: !r.is_fully_booked }).eq('id', r.id);
    reload();
  }
  async function del(id: string) { await supabase.from('tour_availability').delete().eq('id', id); reload(); }

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first.</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Availability — {tour.title}</h2>
      <Card>
        <CardHeader><CardTitle>Weekly (recurring)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {DAYS.map((d, i) => {
            const on = rows.some((r) => r.day_of_week === i && r.is_recurring);
            return (
              <label key={d} className="flex items-center gap-2 rounded border px-3 py-2">
                <Checkbox checked={on} onCheckedChange={(c) => toggleDay(i, !!c)} /> {d}
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Specific dates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Date</Label><Input type="date" value={specific} onChange={(e) => setSpecific(e.target.value)} /></div>
            <div><Label>Max bookings</Label><Input type="number" value={maxB} onChange={(e) => setMaxB(e.target.value)} /></div>
            <Button onClick={addSpecific}>Add</Button>
          </div>
          <ul className="divide-y">
            {rows.filter((r) => !r.is_recurring).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>{r.specific_date} {r.max_bookings != null && `• max ${r.max_bookings}`}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant={r.is_fully_booked ? 'destructive' : 'outline'} onClick={() => toggleFull(r)}>
                    {r.is_fully_booked ? 'Fully booked' : 'Available'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(r.id)}>×</Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
