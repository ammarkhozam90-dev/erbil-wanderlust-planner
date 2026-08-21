import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/reviews')({ component: AdminReviews });

function AdminReviews() {
  const qc = useQueryClient();
  const reviews = useQuery({
    queryKey: ['admin-all-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('merchant_reviews' as any).select('id,merchant_id,user_id,rating,comment,created_at,merchants(name,category,city)').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows: any[] = reviews.data ?? [];
  const average = rows.length ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: rows.filter((row) => row.rating === rating).length }));

  async function remove(id: string) {
    if (!window.confirm('Remove this review?')) return;
    const { error } = await supabase.from('merchant_reviews' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Review removed.');
    await qc.invalidateQueries({ queryKey: ['admin-all-reviews'] });
  }

  return <div className="space-y-8"><div><div className="mb-2 flex items-center gap-2 text-gold"><MessageSquare className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.25em]">Trust & quality</span></div><h1 className="font-display text-4xl font-bold">Ratings & reviews</h1><p className="mt-2 max-w-2xl text-muted-foreground">Monitor traveler sentiment across the directory and remove content that does not meet ErbilGo standards.</p></div><div className="grid gap-4 md:grid-cols-3"><Card className="border-gold/10"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Average rating</p><div className="mt-2 flex items-center gap-2"><Star className="h-6 w-6 fill-gold text-gold" /><span className="font-display text-3xl font-bold">{average ? average.toFixed(1) : '—'}</span></div></CardContent></Card><Card className="border-gold/10"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total reviews</p><p className="mt-2 font-display text-3xl font-bold">{rows.length}</p></CardContent></Card><Card className="border-gold/10"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Five-star share</p><p className="mt-2 font-display text-3xl font-bold text-gold">{rows.length ? `${Math.round((distribution[0].count / rows.length) * 100)}%` : '—'}</p></CardContent></Card></div><Card className="border-gold/10"><CardHeader><CardTitle className="font-display">Rating distribution</CardTitle></CardHeader><CardContent className="space-y-3">{distribution.map((item) => <div key={item.rating} className="flex items-center gap-3 text-sm"><span className="flex w-12 items-center gap-1 text-gold"><Star className="h-3.5 w-3.5 fill-gold" />{item.rating}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${rows.length ? (item.count / rows.length) * 100 : 0}%` }} /></div><span className="w-8 text-right text-xs text-muted-foreground">{item.count}</span></div>)}</CardContent></Card><Card className="border-gold/10"><CardHeader><CardTitle className="font-display">Latest traveler notes</CardTitle></CardHeader><CardContent className="space-y-3">{reviews.isLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : reviews.error ? <p className="text-sm text-destructive">Could not load reviews.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No reviews have been submitted yet.</p> : rows.map((review) => <article key={review.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{review.merchants?.name || 'Business'}</span><Badge variant="outline" className="capitalize">{review.merchants?.category || 'listing'}</Badge><span className="flex items-center gap-1 text-xs text-gold"><Star className="h-3 w-3 fill-gold" />{review.rating}/5</span></div>{review.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}<p className="mt-2 text-[11px] text-muted-foreground">{new Date(review.created_at).toLocaleString()}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => remove(review.id)} title="Remove review" className="self-end text-destructive hover:text-destructive md:self-start"><Trash2 className="h-4 w-4" /></Button></article>)}</CardContent></Card></div>;
}
