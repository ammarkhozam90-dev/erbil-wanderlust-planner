import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Campaign, type Currency, type Pricing, erbilToday, money, phaseOf, placementLabel,
} from '@/lib/sponsorship';

export const Route = createFileRoute('/promote/$merchantId')({ component: PromotePage });

// New tables/RPCs are not in the generated Supabase types yet.
const sb: any = supabase;

interface Quote {
  placements: string[]; daily: number; days: number; bonus_days: number; base: number; discount: number;
  total: number; currency: Currency; offer_title: string | null; start_date: string; end_date: string;
}

function PromotePage() {
  const { merchantId } = Route.useParams();
  const qc = useQueryClient();
  const today = erbilToday();

  const [placements, setPlacements] = useState<string[]>([]);
  const [start, setStart] = useState(today);
  const [days, setDays] = useState(7);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const me = useQuery({
    queryKey: ['promote-me'],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const merchant = useQuery({
    queryKey: ['promote-merchant', merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants').select('id,name,status,owner_id,is_suspended').eq('id', merchantId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const pricing = useQuery({
    queryKey: ['sponsorship-pricing'],
    queryFn: async () => {
      const { data, error } = await sb.from('sponsorship_pricing').select('*').eq('enabled', true).order('sort_order');
      if (error) throw error;
      return (data ?? []) as Pricing[];
    },
  });

  const instructions = useQuery({
    queryKey: ['sponsorship-settings'],
    queryFn: async () => {
      const { data } = await sb.from('sponsorship_settings').select('payment_instructions').eq('id', 1).maybeSingle();
      return (data?.payment_instructions ?? '') as string;
    },
  });

  const mine = useQuery({
    queryKey: ['my-sponsorships', merchantId],
    queryFn: async () => {
      const { data, error } = await sb.from('sponsorship_campaigns').select('*').eq('merchant_id', merchantId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });

  const ready = placements.length > 0 && days >= 1 && days <= 90 && !!start && start >= today;
  const quote = useQuery({
    queryKey: ['sponsorship-quote', merchantId, [...placements].sort().join(','), start, days, currency, appliedCode],
    enabled: ready && merchant.data?.owner_id === me.data,
    retry: false,
    queryFn: async () => {
      const { data, error } = await sb.rpc('quote_sponsorship', {
        p_merchant: merchantId, p_placements: placements, p_start: start, p_days: days,
        p_currency: currency, p_code: appliedCode || null,
      });
      if (error) throw new Error(error.message);
      return data as Quote;
    },
  });

  const toggle = (key: string) =>
    setPlacements((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  async function submit() {
    setSubmitting(true);
    const { error } = await sb.rpc('request_sponsorship', {
      p_merchant: merchantId, p_placements: placements, p_start: start, p_days: days,
      p_currency: currency, p_code: appliedCode || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Request sent');
    setJustSent(true);
    setPlacements([]);
    qc.invalidateQueries({ queryKey: ['my-sponsorships', merchantId] });
  }

  async function cancel(id: string) {
    if (!window.confirm('Cancel this request?')) return;
    const { error } = await sb.rpc('cancel_my_sponsorship', { p_id: id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['my-sponsorships', merchantId] });
  }

  const home = pricing.data?.filter((p) => p.placement_key === 'home') ?? [];
  const cats = pricing.data?.filter((p) => p.placement_key.startsWith('cat:')) ?? [];
  const priceOf = (p: Pricing) => money(currency === 'USD' ? p.price_usd : p.price_iqd, currency) + ' / day';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
        {merchant.isLoading || me.isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !me.data ? (
          <Card><CardContent className="p-6 text-sm">Please <Link to="/auth" className="underline">sign in</Link> to promote your business.</CardContent></Card>
        ) : !merchant.data || merchant.data.owner_id !== me.data ? (
          <Card><CardContent className="p-6 text-sm">You can only promote a business you own.</CardContent></Card>
        ) : merchant.data.status !== 'approved' || merchant.data.is_suspended ? (
          <Card><CardContent className="p-6 text-sm">Only approved businesses can be promoted. Yours is currently “{merchant.data.status}”.</CardContent></Card>
        ) : (
          <>
            <div>
              <h1 className="font-display text-3xl font-bold">Promote {merchant.data.name}</h1>
              <p className="text-sm text-muted-foreground">
                Sponsored placements show your business with a “Sponsored” label for the days you pay for, then return to normal automatically.
              </p>
            </div>

            <Card>
              <CardHeader><CardTitle>1 · Where should it appear?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {(['USD', 'IQD'] as Currency[]).map((c) => (
                    <Button key={c} size="sm" variant={currency === c ? 'default' : 'outline'} onClick={() => setCurrency(c)}>{c}</Button>
                  ))}
                </div>
                {home.map((p) => <PlacementOption key={p.placement_key} p={p} price={priceOf(p)} checked={placements.includes(p.placement_key)} onToggle={toggle} />)}
                {cats.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category pages</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {cats.map((p) => <PlacementOption key={p.placement_key} p={p} price={priceOf(p)} checked={placements.includes(p.placement_key)} onToggle={toggle} />)}
                </div>
                <p className="text-xs text-muted-foreground">Pick categories that really match your business — requests are reviewed before going live.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>2 · When and for how long?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">Start date
                    <Input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-44" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">Days
                    <Input type="number" min={1} max={90} value={days}
                      onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))} className="h-9 w-24" />
                  </label>
                  <div className="flex gap-1">
                    {[3, 7, 14, 30].map((d) => (
                      <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d}d</Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">Offer code (optional)
                    <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} className="h-9 w-44" />
                  </label>
                  <Button size="sm" variant="outline" onClick={() => setAppliedCode(codeInput.trim())}>Apply</Button>
                  {appliedCode && <Button size="sm" variant="ghost" onClick={() => { setAppliedCode(''); setCodeInput(''); }}>Remove code</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>3 · Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!ready ? (
                  <p className="text-muted-foreground">Choose at least one placement to see the price.</p>
                ) : quote.isLoading || quote.isFetching ? (
                  <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating…</div>
                ) : quote.error ? (
                  <p className="text-destructive">{(quote.error as Error).message}</p>
                ) : quote.data ? (
                  <>
                    <Row k={`${quote.data.days} day(s) × ${money(quote.data.daily, quote.data.currency)}`} v={money(quote.data.base, quote.data.currency)} />
                    {quote.data.discount > 0 && <Row k={`Offer: ${quote.data.offer_title}`} v={`− ${money(quote.data.discount, quote.data.currency)}`} />}
                    {quote.data.bonus_days > 0 && <Row k={`Bonus days${quote.data.offer_title ? ` (${quote.data.offer_title})` : ''}`} v={`+ ${quote.data.bonus_days}`} />}
                    <Row k="Runs" v={`${quote.data.start_date} → ${quote.data.end_date}`} />
                    <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
                      <span>Total</span><span>{money(quote.data.total, quote.data.currency)}</span>
                    </div>
                    <Button onClick={submit} disabled={submitting} className="w-full bg-gold text-background hover:bg-gold/90">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send sponsorship request
                    </Button>
                    <p className="text-xs text-muted-foreground">Nothing is charged online. After you send the request you’ll see how to pay; your sponsorship goes live once payment is confirmed.</p>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {justSent && (
              <Card className="border-gold/40">
                <CardHeader><CardTitle>Request sent ✔</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>To activate it, please pay the total and send the receipt:</p>
                  <p className="whitespace-pre-line rounded-md bg-muted p-3">{instructions.data || 'Our team will contact you with payment details shortly.'}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Your requests</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {!mine.data?.length && <p className="p-4 text-sm text-muted-foreground">No requests yet.</p>}
                {mine.data?.map((c) => {
                  const phase = phaseOf(c);
                  return (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {c.placements.map((p) => <Badge key={p} variant="outline">{placementLabel(p, pricing.data)}</Badge>)}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.start_date} → {c.end_date} · {money(c.total_amount, c.currency)}</p>
                        {c.admin_note && <p className="text-xs italic text-muted-foreground">{c.admin_note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={phase === 'running' ? 'default' : 'secondary'} className="capitalize">
                          {phase === 'pending' ? 'Awaiting payment' : phase}
                        </Badge>
                        {c.status === 'pending' && <Button size="sm" variant="outline" onClick={() => cancel(c.id)}>Cancel</Button>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function PlacementOption({ p, price, checked, onToggle }: { p: Pricing; price: string; checked: boolean; onToggle: (k: string) => void }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors ${checked ? 'border-gold bg-gold/10' : 'border-border'}`}>
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={() => onToggle(p.placement_key)} />
        {p.label}
      </span>
      <span className="text-xs text-muted-foreground">{price}</span>
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}
