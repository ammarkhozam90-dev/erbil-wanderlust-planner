import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Tag } from 'lucide-react';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/offers')({ component: PublicOffers });

function PublicOffers() {
  const offers = useQuery({
    queryKey: ['public-live-offers'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('merchant_offers' as any).select('id, merchant_id, title, description, offer_type, discount_value, currency, promo_code, terms, starts_at, ends_at, merchants(id, name, category, city, cover_url)').eq('is_active', true).lte('starts_at', now).gte('ends_at', now).order('ends_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16"><div className="mb-12 max-w-2xl"><div className="mb-3 flex items-center gap-2 text-gold"><Tag className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.25em]">Curated for your day</span></div><h1 className="font-display text-4xl font-bold md:text-5xl">Offers worth making room for</h1><p className="mt-4 text-lg leading-relaxed text-muted-foreground">Discover current benefits from Erbil’s restaurants, cafés, stays, and experiences. Each offer is available for a limited time at the listed location.</p></div>{offers.isLoading ? <p className="text-muted-foreground">Finding the latest offers…</p> : offers.error ? <p className="text-destructive">Offers are temporarily unavailable.</p> : offers.data?.length === 0 ? <Card className="border-dashed"><CardContent className="py-20 text-center"><Tag className="mx-auto mb-4 h-10 w-10 text-gold/50" /><h2 className="font-display text-2xl font-bold">New offers are on the way</h2><p className="mt-2 text-sm text-muted-foreground">Check back soon for limited-time experiences around Erbil.</p></CardContent></Card> : <div className="grid gap-6 md:grid-cols-2">{offers.data?.map((offer: any) => { const business = offer.merchants; return <Card key={offer.id} className="group overflow-hidden border-gold/10 transition-all hover:-translate-y-1 hover:border-gold/30 hover:shadow-luxury"><Link to="/business/$id" params={{ id: business.id }}><div className="relative aspect-[16/7] overflow-hidden bg-muted">{business.cover_url ? <img src={business.cover_url} alt={business.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-muted-foreground">ErbilGo</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><Badge className="absolute left-4 top-4 bg-gold text-background">Limited time</Badge><div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-bold text-white">{offer.title}</h2><p className="mt-1 text-xs text-white/75">{business.name}</p></div>{offer.discount_value != null && <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md">{offer.offer_type === 'percentage' ? `${offer.discount_value}% off` : `${Number(offer.discount_value).toLocaleString()} ${offer.currency || 'IQD'}`}</span>}</div></div></Link><CardContent className="space-y-3 p-5"><p className="text-sm text-muted-foreground">{offer.description || 'A special benefit for your next visit.'}</p><div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gold" />{business.city || 'Erbil'}</span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-gold" />Until {new Date(offer.ends_at).toLocaleDateString()}</span>{offer.promo_code && <span className="font-mono font-bold text-gold">Code: {offer.promo_code}</span>}</div></CardContent></Card>; })}</div>}</main></div>;
}
