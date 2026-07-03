import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyOrganizer } from '@/components/tour/use-my-organizer';
import { useMyTours, useSelectedTour } from '@/components/tour/use-tours';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TourDestination, TourPhoto } from '@/integrations/supabase/tour-types';
import { RouteMap } from '@/components/tour/RouteMap';

export const Route = createFileRoute('/tour/_authenticated/preview')({ component: Preview });

function Preview() {
  const { user } = useAuth();
  const { data: org } = useMyOrganizer(user?.id);
  const { data: tours = [] } = useMyTours(org?.id);
  const selectedId = useSelectedTour() ?? tours[0]?.id;
  const tour = tours.find((t) => t.id === selectedId);
  const [dests, setDests] = useState<TourDestination[]>([]);
  const [photos, setPhotos] = useState<TourPhoto[]>([]);

  useEffect(() => {
    if (!tour) return;
    supabase.from('tour_destinations').select('*').eq('tour_id', tour.id).order('sort_order')
      .then((r) => setDests((r.data ?? []) as TourDestination[]));
    supabase.from('tour_photos').select('*').eq('tour_id', tour.id).order('sort_order')
      .then((r) => setPhotos((r.data ?? []) as TourPhoto[]));
  }, [tour?.id]);

  if (!tour) return <p className="text-muted-foreground">Create/select a tour first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Preview</h2>
        {tour.status === 'approved' && tour.slug &&
          <Link to="/tours/$slug" params={{ slug: tour.slug }} className="text-sm text-primary hover:underline">Open public page →</Link>}
      </div>
      {tour.cover_url && <img src={tour.cover_url} alt="" className="h-72 w-full rounded object-cover" />}
      <div>
        <h1 className="text-3xl font-bold">{tour.title}</h1>
        <p className="mt-1 text-muted-foreground">{tour.short_description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{tour.category}</Badge>
          <Badge variant="outline">{tour.difficulty}</Badge>
          {tour.adult_price != null && <Badge variant="secondary">{tour.currency} {tour.adult_price}</Badge>}
        </div>
      </div>
      <Card><CardContent className="pt-6 whitespace-pre-wrap">{tour.full_description}</CardContent></Card>

      {dests.length > 0 && (
        <>
          <h3 className="text-xl font-semibold">Route</h3>
          <RouteMap stops={dests.map((d) => ({ name: d.name, lat: d.latitude, lng: d.longitude }))} />
          <ol className="space-y-2">
            {dests.map((d, i) => (
              <li key={d.id} className="rounded border p-3">
                <div className="flex justify-between">
                  <b>{i+1}. {d.name}</b>
                  <span className="text-xs text-muted-foreground">{d.arrival_time}{d.departure_time && ` → ${d.departure_time}`}</span>
                </div>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
              </li>
            ))}
          </ol>
        </>
      )}

      {photos.length > 0 && (
        <>
          <h3 className="text-xl font-semibold">Gallery</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => <img key={p.id} src={p.url} className="h-32 w-full rounded object-cover" alt="" />)}
          </div>
        </>
      )}

      {tour.features.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold">Features</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {tour.features.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}
