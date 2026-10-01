import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RouteMap } from '@/components/tour/RouteMap';
import { BookingDialog } from '@/components/tour/BookingDialog';
import type { Tour, TourDestination, TourPhoto, TourOrganizer, TourAvailability } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tours/$slug')({
  loader: async ({ params }) => {
    const { data: tour } = await supabase.from('tours').select('*')
      .eq('slug', params.slug).eq('status', 'approved').maybeSingle();
    if (!tour) throw notFound();
    const today = new Date().toISOString().slice(0, 10);
    const [dests, photos, org, avail] = await Promise.all([
      supabase.from('tour_destinations').select('*').eq('tour_id', tour.id).order('sort_order'),
      supabase.from('tour_photos').select('*').eq('tour_id', tour.id).order('sort_order'),
      supabase.from('tour_organizers').select('*').eq('id', tour.organizer_id).maybeSingle(),
      supabase.from('tour_availability').select('*').eq('tour_id', tour.id)
        .eq('is_fully_booked', false).gte('specific_date', today).order('specific_date'),
    ]);
    return {
      tour: tour as Tour,
      destinations: (dests.data ?? []) as TourDestination[],
      photos: (photos.data ?? []) as TourPhoto[],
      organizer: (org.data ?? null) as TourOrganizer | null,
      dates: (avail.data ?? []) as TourAvailability[],
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

const ACCOMMODATION_LABEL: Record<string, string> = {
  hotel: 'Hotel', guesthouse: 'Guesthouse', camping: 'Camping / tents', other: 'Accommodation provided',
};

function PublicTour() {
  const { tour, destinations, photos, organizer, dates } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">Home</Link> /{' '}
        <Link to="/tours" className="hover:underline">Organized Tours</Link> /{' '}
        <span className="text-foreground">{tour.title}</span>
      </nav>

      {tour.cover_url && <img src={tour.cover_url} className="h-80 w-full rounded-lg object-cover" alt="" />}

      <header className="space-y-3">
        <h1 className="text-4xl font-bold">{tour.title}</h1>
        <p className="text-lg text-muted-foreground">{tour.short_description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge>{tour.category}</Badge>
          <Badge variant="outline">{tour.difficulty}</Badge>
          <Badge variant="outline">{tour.duration_type}{tour.duration_custom && ` (${tour.duration_custom})`}</Badge>
          {tour.destination && <Badge variant="outline">{tour.destination}</Badge>}
          {tour.transportation_type && <Badge variant="outline">{tour.transportation_type}</Badge>}
          {tour.adult_price != null && (
            <Badge variant="secondary">
              {tour.currency} {tour.adult_price} / adult
              {tour.child_price != null && ` • ${tour.currency} ${tour.child_price} / child`}
            </Badge>
          )}
        </div>
        <div className="pt-2">
          <BookingDialog tourId={tour.id} dates={dates} adultPrice={tour.adult_price} childPrice={tour.child_price} currency={tour.currency} />
        </div>
      </header>

      {/* Quick facts */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {tour.languages.length > 0 && (
          <Card><CardContent className="pt-6 text-sm">
            <p className="text-muted-foreground">Languages</p>
            <p className="font-medium">{tour.languages.join(', ')}</p>
          </CardContent></Card>
        )}
        {(tour.min_guests != null || tour.max_guests != null) && (
          <Card><CardContent className="pt-6 text-sm">
            <p className="text-muted-foreground">Group size</p>
            <p className="font-medium">
              {tour.min_guests ?? 1}–{tour.max_guests ?? '∞'} guests
            </p>
          </CardContent></Card>
        )}
        {tour.meeting_point && (
          <Card><CardContent className="pt-6 text-sm">
            <p className="text-muted-foreground">{tour.transportation_type === 'Bus' ? 'Bus pickup point' : 'Meeting point'}</p>
            <p className="font-medium">{tour.meeting_point}</p>
          </CardContent></Card>
        )}
        {dates.length > 0 && (
          <Card><CardContent className="pt-6 text-sm">
            <p className="text-muted-foreground">Next available date</p>
            <p className="font-medium">
              {dates[0].specific_date}{dates[0].start_time ? ` • ${dates[0].start_time}` : ''}
            </p>
          </CardContent></Card>
        )}
      </div>

      <Card><CardContent className="whitespace-pre-wrap pt-6">{tour.full_description}</CardContent></Card>

      {tour.accommodation_type && (
        <Card>
          <CardHeader><CardTitle>Overnight stay</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{ACCOMMODATION_LABEL[tour.accommodation_type] ?? tour.accommodation_type}</p>
            {tour.accommodation_notes && <p className="text-muted-foreground">{tour.accommodation_notes}</p>}
          </CardContent>
        </Card>
      )}

      {destinations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Route & Timeline</h2>
          <RouteMap stops={destinations.map((d) => ({ name: d.name, lat: d.latitude, lng: d.longitude }))} />
          <ol className="space-y-3">
            {destinations.map((d, i) => (
              <li key={d.id} className="overflow-hidden rounded border sm:flex">
                {d.image_url && <img src={d.image_url} alt={d.name} className="h-40 w-full object-cover sm:h-auto sm:w-48" />}
                <div className="flex-1 p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>{i + 1}. {d.name}</b>
                    <span className="text-xs text-muted-foreground">
                      {d.arrival_time}{d.departure_time && ` → ${d.departure_time}`}
                      {d.visit_duration_min != null && ` • ${d.visit_duration_min} min`}
                    </span>
                  </div>
                  {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        {tour.included.length > 0 && (
          <Card><CardHeader><CardTitle>Included</CardTitle></CardHeader>
            <CardContent><ul className="list-inside list-disc text-sm">{tour.included.map((i) => <li key={i}>{i}</li>)}</ul></CardContent></Card>
        )}
        {tour.not_included.length > 0 && (
          <Card><CardHeader><CardTitle>Not included</CardTitle></CardHeader>
            <CardContent><ul className="list-inside list-disc text-sm">{tour.not_included.map((i) => <li key={i}>{i}</li>)}</ul></CardContent></Card>
        )}
        {tour.requirements.length > 0 && (
          <Card><CardHeader><CardTitle>What to bring</CardTitle></CardHeader>
            <CardContent><ul className="list-inside list-disc text-sm">{tour.requirements.map((i) => <li key={i}>{i}</li>)}</ul></CardContent></Card>
        )}
      </div>

      {dates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Available dates</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {dates.map((d) => (
              <div key={d.id} className="flex justify-between border-b py-1 last:border-0">
                <span>{d.specific_date}</span>
                <span className="text-muted-foreground">{d.start_time ?? ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
