import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMerchantContext } from '@/components/merchant/merchant-context';
import { OfferWizardDialog, type OfferRecord } from './OfferWizardDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, Edit3, Loader2, Pause, Play, Plus, Tag, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function OffersManager({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const { merchants, currentMerchant } = useMerchantContext();
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfferRecord | null>(null);

  const adminMerchants = useQuery({
    queryKey: ['admin-offer-merchants'],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase.from('merchants').select('id,name,category,city,status').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const availableMerchants = admin ? (adminMerchants.data ?? []) : merchants;

  useEffect(() => {
    if (selectedMerchantId && availableMerchants.some((merchant: any) => merchant.id === selectedMerchantId)) return;
    const fallback = admin ? adminMerchants.data?.[0]?.id : currentMerchant?.id;
    if (fallback) setSelectedMerchantId(fallback);
  }, [admin, adminMerchants.data, availableMerchants, currentMerchant?.id, selectedMerchantId]);

  const offers = useQuery({
    queryKey: ['merchant-offers-manager', selectedMerchantId],
    enabled: Boolean(selectedMerchantId),
    queryFn: async () => {
      const { data, error } = await supabase.from('merchant_offers' as any).select('*').eq('merchant_id', selectedMerchantId).order('starts_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OfferRecord[];
    },
  });

  const selectedMerchant = availableMerchants.find((merchant: any) => merchant.id === selectedMerchantId) as any;
  const now = Date.now();
  const counts = useMemo(() => {
    const rows = offers.data ?? [];
    return {
      total: rows.length,
      live: rows.filter((offer) => offer.is_active && new Date(offer.starts_at).getTime() <= now && new Date(offer.ends_at).getTime() >= now).length,
      scheduled: rows.filter((offer) => offer.is_active && new Date(offer.starts_at).getTime() > now).length,
    };
  }, [offers.data, now]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['merchant-offers-manager', selectedMerchantId] });
  }

  async function toggleOffer(offer: OfferRecord) {
    const { error } = await supabase.from('merchant_offers' as any).update({ is_active: !offer.is_active }).eq('id', offer.id);
    if (error) return toast.error(error.message);
    toast.success(offer.is_active ? 'Offer paused.' : 'Offer activated.');
    refresh();
  }

  async function deleteOffer(offer: OfferRecord) {
    if (!window.confirm(`Delete “${offer.title}”? This cannot be undone.`)) return;
    const { error } = await supabase.from('merchant_offers' as any).delete().eq('id', offer.id);
    if (error) return toast.error(error.message);
    toast.success('Offer deleted.');
    refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-gold"><Tag className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.25em]">Offer studio</span></div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Offers &amp; promotions</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Create timely reasons for travelers to choose this location. Every offer is tied to a specific branch so dates and redemption details stay accurate.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={!selectedMerchantId} className="bg-gold text-background shadow-luxury hover:bg-gold/90"><Plus className="mr-2 h-4 w-4" /> New offer</Button>
      </div>

      {admin && <Alert className="border-gold/20 bg-gold/5"><ShieldCheck className="h-4 w-4 text-gold" /><AlertDescription>Admin mode: you can create, edit, pause, or remove offers for any business, including offers collected by ErbilGo staff.</AlertDescription></Alert>}

      <div className="flex flex-col gap-3 rounded-2xl border border-gold/10 bg-card/50 p-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Managing location</p><p className="mt-1 font-semibold">{selectedMerchant?.name || 'Select a business'}</p></div>
        <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
          <SelectTrigger className="w-full border-gold/20 bg-background md:w-[320px]"><SelectValue placeholder="Choose a business" /></SelectTrigger>
          <SelectContent>{availableMerchants.map((merchant: any) => <SelectItem key={merchant.id} value={merchant.id}>{merchant.name || 'Untitled business'}{merchant.city ? ` · ${merchant.city}` : ''}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedMerchantId ? <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">No business is available yet. Complete your business setup first.</CardContent></Card> : offers.isLoading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin text-gold" /> Loading offers…</div> : offers.error ? <Card><CardContent className="py-10 text-center text-destructive">Could not load offers. Please try again.</CardContent></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="All offers" value={counts.total} />
            <StatCard label="Live now" value={counts.live} accent />
            <StatCard label="Scheduled" value={counts.scheduled} />
          </div>
          {(offers.data ?? []).length === 0 ? <Card className="border-dashed"><CardContent className="py-16 text-center"><Tag className="mx-auto mb-4 h-8 w-8 text-gold/60" /><h2 className="font-display text-2xl font-bold">Give travelers a reason to visit</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Start with one clear, time-limited offer. You can pause or refine it whenever your business changes.</p><Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="mt-6 bg-gold text-background hover:bg-gold/90"><Plus className="mr-2 h-4 w-4" /> Create first offer</Button></CardContent></Card> : <div className="grid gap-5 lg:grid-cols-2">{(offers.data ?? []).map((offer) => <OfferCard key={offer.id} offer={offer} onEdit={() => { setEditing(offer); setDialogOpen(true); }} onToggle={() => toggleOffer(offer)} onDelete={() => deleteOffer(offer)} />)}</div>}
        </>
      )}

      {selectedMerchantId && <OfferWizardDialog open={dialogOpen} onOpenChange={setDialogOpen} merchantId={selectedMerchantId} initialOffer={editing} onSaved={refresh} />}
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <Card className="border-gold/10 bg-card/60"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className={`mt-2 font-display text-3xl font-bold ${accent ? 'text-gold' : ''}`}>{value}</p></CardContent></Card>;
}

function OfferCard({ offer, onEdit, onToggle, onDelete }: { offer: OfferRecord; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const now = Date.now();
  const starts = new Date(offer.starts_at).getTime();
  const ends = new Date(offer.ends_at).getTime();
  const live = offer.is_active && starts <= now && ends >= now;
  const scheduled = offer.is_active && starts > now;
  const status = live ? 'Live now' : scheduled ? 'Scheduled' : !offer.is_active ? 'Paused' : 'Expired';
  const statusClass = live ? 'bg-emerald-500/10 text-emerald-500' : scheduled ? 'bg-blue-500/10 text-blue-400' : 'bg-muted text-muted-foreground';

  return <Card className="group overflow-hidden border-gold/10 bg-card/70 transition-all hover:-translate-y-1 hover:border-gold/30 hover:shadow-luxury"><CardHeader className="flex-row items-start justify-between gap-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge className={statusClass}>{status}</Badge><Badge variant="outline" className="capitalize">{offer.offer_type}</Badge></div><CardTitle className="font-display text-xl">{offer.title}</CardTitle></div><div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-hover:opacity-100"><Button size="icon" variant="ghost" onClick={onEdit} title="Edit offer"><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={onToggle} title={offer.is_active ? 'Pause offer' : 'Activate offer'}>{offer.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" onClick={onDelete} title="Delete offer" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-4"><p className="line-clamp-2 text-sm text-muted-foreground">{offer.description || 'No description added.'}</p><div className="grid gap-3 rounded-xl border border-border/60 bg-background/40 p-3 text-xs sm:grid-cols-2"><div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-gold" />{new Date(offer.starts_at).toLocaleDateString()} – {new Date(offer.ends_at).toLocaleDateString()}</div>{offer.promo_code && <div className="font-mono font-bold tracking-wider text-gold">Code: {offer.promo_code}</div>}{offer.discount_value != null && <div className="font-semibold text-foreground">{offer.offer_type === 'percentage' ? `${offer.discount_value}% off` : `${offer.discount_value.toLocaleString()} ${offer.currency || 'IQD'}`}</div>}</div>{offer.terms && <p className="text-[11px] leading-relaxed text-muted-foreground">{offer.terms}</p>}</CardContent></Card>;
}
