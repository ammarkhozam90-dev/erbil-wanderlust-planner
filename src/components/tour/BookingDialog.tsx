import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { TourAvailability } from '@/integrations/supabase/tour-types';

export function BookingDialog({ tourId, dates, adultPrice, childPrice, currency }: {
  tourId: string;
  dates: TourAvailability[]; // already filtered to upcoming, not fully booked
  adultPrice: number | null;
  childPrice: number | null;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityId, setAvailabilityId] = useState<string>('none');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const estTotal = adultPrice != null
    ? adultPrice * adults + (childPrice ?? 0) * children
    : null;

  async function submit() {
    if (!fullName.trim() || !phone.trim()) {
      return toast.error('Your name and phone number are required so the organizer can reach you.');
    }
    setSubmitting(true);
    const { error } = await supabase.from('tour_bookings').insert({
      tour_id: tourId,
      availability_id: availabilityId === 'none' ? null : availabilityId,
      full_name: fullName, phone, email: email || null,
      adults, children, notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSent(false); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto">Book this tour</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {sent ? (
          <div className="space-y-2 py-4 text-center">
            <h3 className="text-lg font-semibold">Request sent</h3>
            <p className="text-sm text-muted-foreground">
              The organizer will contact you at {phone} to confirm your booking.
            </p>
            <Button className="mt-2" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader><DialogTitle>Book this tour</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {dates.length > 0 && (
                <div>
                  <Label>Date</Label>
                  <Select value={availabilityId} onValueChange={setAvailabilityId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dates.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.specific_date}{d.start_time ? ` • ${d.start_time}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">I'll coordinate a date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Adults</Label><Input type="number" min={1} value={adults} onChange={(e) => setAdults(Math.max(1, +e.target.value))} /></div>
                <div><Label>Children</Label><Input type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, +e.target.value))} /></div>
              </div>
              {estTotal != null && (
                <p className="text-sm text-muted-foreground">Estimated total: {currency} {estTotal}</p>
              )}
              <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964…" /></div>
              <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <Button className="w-full" disabled={submitting} onClick={submit}>
                {submitting ? 'Sending…' : 'Send booking request'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This sends a request — no payment is taken here. The organizer confirms availability with you directly.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
