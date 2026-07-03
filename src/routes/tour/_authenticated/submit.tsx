import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/tour/_authenticated/submit')({ component: Submit });

function Submit() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);
  const qc = useQueryClient();

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first.</p>;

  const checks = [
    { ok: !!tour.title, label: 'Title set' },
    { ok: !!tour.short_description, label: 'Short description' },
    { ok: !!tour.destination, label: 'Destination' },
    { ok: tour.meeting_lat != null && tour.meeting_lng != null, label: 'Meeting point coordinates' },
    { ok: !!tour.cover_url, label: 'Cover image uploaded' },
    { ok: tour.adult_price != null, label: 'Adult price set' },
  ];
  const ready = checks.every((c) => c.ok);

  async function submit() {
    if (!tour) return;
    const { error } = await supabase.from('tours').update({
      status: 'pending', submitted_at: new Date().toISOString(),
    }).eq('id', tour.id);
    if (error) return toast.error(error.message);
    toast.success('Submitted for review');
    qc.invalidateQueries({ queryKey: ['my-tours', org?.id] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Submit for Review</h2>
        <Badge variant={tour.status === 'approved' ? 'default' : 'secondary'}>{tour.status}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle>Readiness</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                {c.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {tour.rejection_reason && (
        <Card><CardHeader><CardTitle>Reviewer feedback</CardTitle></CardHeader>
          <CardContent className="text-sm text-destructive">{tour.rejection_reason}</CardContent></Card>
      )}
      <div className="text-right">
        <Button disabled={!ready} onClick={submit}>Submit for review</Button>
      </div>
    </div>
  );
}
