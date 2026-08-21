import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/favorites')({ component: FavoritesPage });

function FavoritesPage() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;
  const favorites = useQuery({
    queryKey: ['favorites', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('user_favorites' as any).select('id, merchant_id, created_at, merchants(id, name, category, city, address, cover_url, logo_url, price_level, description)').eq('user_id', userId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your favorites…</div>;
  if (!session) return <Navigate to="/auth" replace />;

  async function remove(favoriteId: string) {
    const { error } = await supabase.from('user_favorites' as any).delete().eq('id', favoriteId).eq('user_id', userId!);
    if (error) return toast.error(error.message);
    toast.success('Removed from favorites.');
    await qc.invalidateQueries({ queryKey: ['favorites', userId] });
    await qc.invalidateQueries({ queryKey: ['favorite-state'] });
  }

  return (
    <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16"><div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-gold"><Heart className="h-4 w-4 fill-gold" /><span className="text-[10px] font-bold uppercase tracking-[0.25em]">Your collection</span></div><h1 className="font-display text-4xl font-bold">Saved places</h1><p className="mt-2 text-muted-foreground">Keep the places you want to remember for your next day in Erbil.</p></div><Badge variant="outline" className="w-fit border-gold/30 px-3 py-1 text-gold">{favorites.data?.length ?? 0} saved</Badge></div>
      {favorites.isLoading ? <p className="text-muted-foreground">Loading your saved places…</p> : favorites.error ? <p className="text-destructive">Could not load favorites. Please try again.</p> : favorites.data?.length === 0 ? <Card className="border-dashed"><CardContent className="py-20 text-center"><Heart className="mx-auto mb-4 h-10 w-10 text-gold/50" /><h2 className="font-display text-2xl font-bold">Your collection is waiting</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Tap the heart on any business you would like to keep close.</p><Button asChild className="mt-6 bg-gold text-background hover:bg-gold/90"><Link to="/">Explore Erbil</Link></Button></CardContent></Card> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{favorites.data?.map((row: any) => { const business = row.merchants; return <Card key={row.id} className="group overflow-hidden border-gold/10 transition-all hover:-translate-y-1 hover:border-gold/30 hover:shadow-luxury"><Link to="/business/$id" params={{ id: business.id }}><div className="relative aspect-[16/10] overflow-hidden bg-muted">{business.cover_url ? <img src={business.cover_url} alt={business.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /><div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3"><h2 className="font-display text-xl font-bold text-white">{business.name}</h2><button type="button" onClick={(event) => { event.preventDefault(); void remove(row.id); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-destructive"><Trash2 className="h-4 w-4" /></button></div></div></Link><CardContent className="space-y-2 p-4"><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{business.category}</Badge>{business.price_level && <span className="text-xs text-muted-foreground">{business.price_level}</span>}</div>{(business.address || business.city) && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 text-gold" />{business.address || business.city}</p>}</CardContent></Card>; })}</div>}
    </main></div>
  );
}
