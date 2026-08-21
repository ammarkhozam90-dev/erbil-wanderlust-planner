import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function Stars({ value, interactive = false, onChange }: { value: number; interactive?: boolean; onChange?: (value: number) => void }) {
  return <div className="flex items-center gap-1" role={interactive ? 'radiogroup' : undefined} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" disabled={!interactive} onClick={() => onChange?.(star)} aria-label={`${star} star${star === 1 ? '' : 's'}`} className={interactive ? 'rounded p-0.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold' : 'cursor-default'}><Star className={`h-5 w-5 ${star <= value ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} /></button>)}
  </div>;
}

export function ReviewsPanel({ merchantId, averageRating, reviewCount }: { merchantId: string; averageRating?: number | null; reviewCount?: number | null }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const reviews = useQuery({
    queryKey: ['merchant-reviews', merchantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('merchant_reviews' as any).select('id,user_id,rating,comment,created_at').eq('merchant_id', merchantId).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });
  const computed = useMemo(() => { const rows: any[] = reviews.data ?? []; return rows.length ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length : Number(averageRating ?? 0); }, [reviews.data, averageRating]);

  async function submit() {
    if (!session?.user) return toast('Sign in to leave a rating.');
    if (!rating) return toast.error('Choose a star rating first.');
    setSaving(true);
    const { error } = await supabase.from('merchant_reviews' as any).upsert({ merchant_id: merchantId, user_id: session.user.id, rating, comment: comment.trim() || null }, { onConflict: 'merchant_id,user_id' });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Your rating has been saved.');
    setComment('');
    setRating(0);
    await qc.invalidateQueries({ queryKey: ['merchant-reviews', merchantId] });
    await qc.invalidateQueries({ queryKey: ['business-detail'] });
  }

  return <section className="mt-8 space-y-5 rounded-2xl border border-gold/15 bg-card/40 p-5 md:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Community notes</p><h2 className="mt-1 font-display text-2xl font-bold">How travelers felt</h2></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-display text-3xl font-bold text-gold">{computed ? computed.toFixed(1) : '—'}</p><p className="text-[10px] text-muted-foreground">{reviewCount ?? reviews.data?.length ?? 0} ratings</p></div><Stars value={Math.round(computed)} /></div></div>
    {session?.user ? <div className="rounded-xl border border-border bg-background/50 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold">Share your experience</p><Badge variant="outline" className="border-gold/30 text-gold">One rating per visit</Badge></div><Stars value={rating} interactive onChange={setRating} /><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should another traveler know? (optional)" rows={3} className="mt-3 border-gold/15 bg-background" /><Button type="button" onClick={submit} disabled={saving} className="mt-3 bg-gold text-background hover:bg-gold/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Save rating</Button></div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Sign in to share a rating and help future travelers choose confidently.</p>}
    {reviews.isLoading ? <p className="text-sm text-muted-foreground">Loading traveler notes…</p> : reviews.data?.length ? <div className="space-y-3">{reviews.data.map((review: any) => <article key={review.id} className="rounded-xl border border-border/60 bg-background/40 p-4"><div className="flex items-center justify-between gap-3"><Stars value={review.rating} /><time className="text-[11px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</time></div>{review.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}</article>)}</div> : <p className="text-sm text-muted-foreground">Be the first traveler to leave a note.</p>}
  </section>;
}
