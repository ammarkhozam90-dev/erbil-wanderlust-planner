import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Send, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

function Stars({ value, interactive = false, onChange }: { value: number; interactive?: boolean; onChange?: (value: number) => void }) {
  return <div className="flex items-center gap-1" role={interactive ? 'radiogroup' : undefined} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" disabled={!interactive} onClick={() => onChange?.(star)} aria-label={`${star} star${star === 1 ? '' : 's'}`} className={interactive ? 'rounded p-0.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold' : 'cursor-default'}><Star className={`${interactive ? 'h-6 w-6' : 'h-5 w-5'} ${star <= value ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} /></button>)}
  </div>;
}

export function ReviewsPanel({ merchantId, averageRating, reviewCount }: { merchantId: string; averageRating?: number | null; reviewCount?: number | null }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
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

  function chooseRating(value: number) {
    if (!session?.user) {
      toast('Sign in to leave a rating.');
      return;
    }
    setRating(value);
    setComposerOpen(true);
  }

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
    setComposerOpen(false);
    await qc.invalidateQueries({ queryKey: ['merchant-reviews', merchantId] });
    await qc.invalidateQueries({ queryKey: ['business-detail'] });
  }

  return <section className="mt-8 space-y-4 rounded-2xl border border-gold/15 bg-card/40 p-4 md:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Community notes</p><h2 className="mt-1 font-display text-2xl font-bold">How travelers felt</h2><p className="mt-1 text-sm text-muted-foreground">Real impressions from people who visited this place.</p></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 sm:justify-end"><div className="text-right"><p className="font-display text-2xl font-bold text-gold">{computed ? computed.toFixed(1) : '—'}</p><p className="text-[10px] text-muted-foreground">{reviewCount ?? reviews.data?.length ?? 0} ratings</p></div><Stars value={Math.round(computed)} /></div>
    </div>

    {session?.user ? <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gold/25 bg-gold/5 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Visited this place?</p><p className="text-xs text-muted-foreground">Tap a star to share your experience.</p></div><div className="flex items-center gap-2"><Stars value={rating} interactive onChange={chooseRating} /><Badge variant="outline" className="hidden border-gold/30 text-gold sm:inline-flex">One rating per visit</Badge></div></div> : <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Sign in to share a rating and help future travelers choose confidently.</p>}

    {reviews.isLoading ? <p className="text-sm text-muted-foreground">Loading traveler notes…</p> : reviews.data?.length ? <div className="space-y-3">{reviews.data.map((review: any) => <article key={review.id} className="rounded-xl border border-border/60 bg-background/40 p-4"><div className="flex items-center justify-between gap-3"><Stars value={review.rating} /><time className="text-[11px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</time></div>{review.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}</article>)}</div> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4 text-gold" /> Be the first traveler to leave a note.</p>}

    <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">Share your experience</DialogTitle><DialogDescription>Your rating helps future travelers choose with confidence.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2"><div className="flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 p-3"><span className="text-sm font-semibold">Your rating</span><Stars value={rating} interactive onChange={setRating} /></div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should another traveler know? (optional)" rows={4} className="border-gold/15 bg-background" /></div>
        <DialogFooter><Button type="button" onClick={submit} disabled={saving || !rating} className="bg-gold text-background hover:bg-gold/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Save rating</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

