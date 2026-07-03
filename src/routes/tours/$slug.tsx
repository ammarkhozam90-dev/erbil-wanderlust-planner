import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RouteMap } from '@/components/tour/RouteMap';
import type { Tour, TourDestination, TourPhoto, TourOrganizer } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tours/$slug')({
  loader: async ({ params }) => {
    const { data: tour } = await supabase.from('tours').select('*')
      .eq('slug', params.slug).eq('status', 'approved').maybeSingle();
    if (!tour) throw notFound();
    const [dests, photos, org] = await Promise.all([
      supabase.from('tour_destinations').select('*').eq('tour_id', tour.id).order('sort_order'),
      supabase.from('tour_photos').select('*').eq('tour_id', tour.id).order('sort_order'),
      supabase.from('tour_organizers').select('*').eq('id', tour.organizer_id).maybeSingle(),
    ]);
    return {
      tour: tour as Tour,
      destinations: (dests.data ?? []) as TourDestination[],
      photos: (photos.data ?? []) as TourPhoto[],
      organizer: (org.data ?? null) as TourOrganizer | null,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.tour.title} | ErbilGo Tours` },
      { name: 'description', content: loaderData.tour.short_description },
      { property: 'og:title', content: loaderData.tour.title },
      { property: 'og:description', content: loaderData.tour.short_description },
      ...(loaderData.tour.cover_url ? [{ property: 'og:image', content: loaderData.tour.cover_url }] : []),
    ] : [],
  }),
  errorComponent: () => <div className="p-8">Failed to load tour.</div>,
  notFoundComponent: () => <div className="p-8">Tour not found.</div>,
  component: PublicTour,
});

function PublicTour() {
  const { tour, destinations, photos, organizer } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">Home</Link> /{' '}
        <Link to="/tours" className="hover:underline">Organized Tours</Link> /{' '}
        <span className="text-foreground">{tour.title}</span>
      </nav>

      {tour.cover_url && <img src={tour.cover_url} className="h-80 w-full rounded-lg object-cover" alt="" />}

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">{tour.title}</h1>
        <p className="text-lg text-muted-foreground">{tour.short_description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge>{tour.category}</Badge>
          <Badge variant="outline">{tour.difficulty}</Badge>
          <Badge variant="outline">{tour.duration_type}{tour.duration_custom && ` (${tour.duration_custom})`}</Badge>
          {tour.adult_price != null && <Badge variant="secondary">{tour.currency} {tour.adult_price}</Badge>}
        </div>
      </header>

      <Card><CardContent className="whitespace-pre-wrap pt-6">{tour.full_description}</CardContent></Card>

      {destinations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Route & Timeline</h2>
          <RouteMap stops={destinations.map((d) => ({ name: d.name, lat: d.latitude, lng: d.longitude }))} />
          <ol className="space-y-2">
            {destinations.map((d, i) => (
              <li key={d.id} className="rounded border p-3">
                <div className="flex justify-between">
                  <b>{i+1}. {d.name}</b>
                  <span className="text-xs text-muted-foreground">{d.arrival_time}{d.departure_time && ` → ${d.departure_time}`}</span>
                </div>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {photos.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">Gallery</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => <img key={p.id} src={p.url} className="h-32 w-full rounded object-cover" alt="" />)}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tour.features.length > 0 && (
          <Card><CardHeader><CardTitle>Features</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tour.features.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}
            </CardContent></Card>
        )}
        {tour.included.length > 0 && (
          <Card><CardHeader><CardTitle>Included</CardTitle></CardHeader>
            <CardContent><ul className="list-inside list-disc text-sm">{tour.included.map((i) => <li key={i}>{i}</li>)}</ul></CardContent></Card>
        )}
      </div>

      {organizer && (
        <Card>
          <CardHeader><CardTitle>Organizer</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{organizer.company_name}</p>
            <p className="text-muted-foreground">{organizer.contact_email} {organizer.contact_phone && `• ${organizer.contact_phone}`}</p>
            {organizer.website && <a href={organizer.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">{organizer.website}</a>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
