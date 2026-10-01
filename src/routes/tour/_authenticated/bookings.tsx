import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TourBooking } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tour/_authenticated/bookings')({ component: Bookings });

function Bookings() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const [rows, setRows] = useState<TourBooking[]>([]);

  async function load() {
    if (tours.length === 0) return;
    const { data } = await supabase.from('tour_bookings')
      .select('*').in('tour_id', tours.map((t) => t.id)).order('created_at', { ascending: false });
    setRows((data ?? []) as TourBooking[]);
  }
  useEffect(() => { load(); }, [tours.length]);

  async function setStatus(id: string, status: TourBooking['status']) {
    const { error } = await supabase.from('tour_bookings').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  const tourTitle = (id: string) => tours.find((t) => t.id === id)?.title ?? '—';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Bookings</h2>
      {rows.length === 0 && <p className="text-muted-foreground">No booking requests yet.</p>}
      <div className="space-y-3">
        {rows.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{b.full_name} — {tourTitle(b.tour_id)}</CardTitle>
                <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                  {b.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{b.phone}{b.email && ` • ${b.email}`}</p>
              <p className="text-muted-foreground">{b.adults} adult(s){b.children > 0 && `, ${b.children} child(ren)`}</p>
              {b.notes && <p className="text-muted-foreground">"{b.notes}"</p>}
              {b.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setStatus(b.id, 'confirmed')}>Confirm</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
