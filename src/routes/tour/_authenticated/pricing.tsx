import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/tour-constants';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/_authenticated/pricing')({ component: Pricing });

function Pricing() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);

  const [f, setF] = useState({
    adult_price: '', child_price: '', private_price: '',
    currency: 'USD', discount_percent: '0', booking_deadline_hours: '24',
  });
  useEffect(() => {
    if (!tour) return;
    setF({
      adult_price: tour.adult_price?.toString() ?? '',
      child_price: tour.child_price?.toString() ?? '',
      private_price: tour.private_price?.toString() ?? '',
      currency: tour.currency, discount_percent: String(tour.discount_percent),
      booking_deadline_hours: String(tour.booking_deadline_hours),
    });
  }, [tour?.id]);

  async function save() {
    if (!tour) return;
    const { error } = await supabase.from('tours').update({
      adult_price: f.adult_price ? +f.adult_price : null,
      child_price: f.child_price ? +f.child_price : null,
      private_price: f.private_price ? +f.private_price : null,
      currency: f.currency,
      discount_percent: +f.discount_percent || 0,
      booking_deadline_hours: +f.booking_deadline_hours || 24,
    }).eq('id', tour.id);
    if (error) return toast.error(error.message);
    toast.success('Saved');
  }

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">Pricing — {tour.title}</h2>
      <Card>
        <CardHeader><CardTitle>Prices</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Adult price</Label>
            <Input type="number" value={f.adult_price} onChange={(e) => setF({ ...f, adult_price: e.target.value })} /></div>
          <div><Label>Child price</Label>
            <Input type="number" value={f.child_price} onChange={(e) => setF({ ...f, child_price: e.target.value })} /></div>
          <div><Label>Private tour price</Label>
            <Input type="number" value={f.private_price} onChange={(e) => setF({ ...f, private_price: e.target.value })} /></div>
          <div><Label>Currency</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Discount %</Label>
            <Input type="number" value={f.discount_percent} onChange={(e) => setF({ ...f, discount_percent: e.target.value })} /></div>
          <div><Label>Booking deadline (hours)</Label>
            <Input type="number" value={f.booking_deadline_hours} onChange={(e) => setF({ ...f, booking_deadline_hours: e.target.value })} /></div>
        </CardContent>
      </Card>
      <div className="text-right"><Button onClick={save}>Save</Button></div>
    </div>
  );
}
