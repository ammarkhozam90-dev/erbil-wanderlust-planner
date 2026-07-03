import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TOUR_CATEGORIES } from '@/lib/tour-constants';
import type { Tour } from '@/integrations/supabase/tour-types';

export const Route = createFileRoute('/tours/')({
  head: () => ({ meta: [{ title: 'Organized Tours in Erbil | ErbilGo' },
    { name: 'description', content: 'Browse approved organized tours in Erbil — city, historical, nature, adventure and more.' }] }),
  component: ToursIndex,
});

function ToursIndex() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  useEffect(() => {
    (async () => {
      let query = supabase.from('tours').select('*').eq('status', 'approved').order('created_at', { ascending: false });
      const { data } = await query;
      setTours((data ?? []) as Tour[]);
    })();
  }, []);

  const filtered = tours.filter((t) =>
    (cat === 'all' || t.category === cat) &&
    (q === '' || t.title.toLowerCase().includes(q.toLowerCase()) || t.destination.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">Home</Link> / Explore Erbil / <span className="text-foreground">Organized Tours</span>
      </nav>
      <div>
        <h1 className="text-3xl font-bold">Organized Tours</h1>
        <p className="text-muted-foreground">Curated experiences by verified tour organizers.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search tours…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TOUR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No tours match your search yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link key={t.id} to="/tours/$slug" params={{ slug: t.slug ?? t.id }}>
              <Card className="overflow-hidden transition hover:shadow-lg">
                {t.cover_url && <img src={t.cover_url} className="h-40 w-full object-cover" alt="" />}
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{t.title}</h3>
                    <Badge>{t.category}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{t.short_description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.destination}</span>
                    {t.adult_price != null && <span className="font-medium">{t.currency} {t.adult_price}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
