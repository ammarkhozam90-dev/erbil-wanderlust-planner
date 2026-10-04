import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Campaign, type Pricing, money, phaseOf, placementLabel,
} from '@/lib/sponsorship';

export const Route = createFileRoute('/admin/sponsorship')({ component: SponsorshipAdmin });

// New tables/RPCs are not in the generated Supabase types yet.
const sb: any = supabase;

type Tab = 'requests' | 'campaigns' | 'pricing' | 'offers' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'offers', label: 'Offers' },
  { key: 'settings', label: 'Payment info' },
];

function useRefreshAll() {
  const qc = useQueryClient();
  return () => {
    for (const k of [
      'admin-sponsorship-campaigns', 'admin-pending-sponsorships-count', 'admin-sponsorship-pricing',
      'admin-sponsorship-offers', 'featured-businesses', 'category-sponsors',
    ]) qc.invalidateQueries({ queryKey: [k] });
  };
}

function SponsorshipAdmin() {
  const [tab, setTab] = useState<Tab>('requests');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Sponsorship</h1>
        <p className="text-sm text-muted-foreground">
          Paid placements. A campaign is live only between its start and end dates (Erbil time) — the Sponsored label disappears by itself afterwards.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} size="sm" variant={tab === t.key ? 'default' : 'outline'} onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>
      {tab === 'requests' && <CampaignsTab mode="pending" />}
      {tab === 'campaigns' && <CampaignsTab mode="history" />}
      {tab === 'pricing' && <PricingTab />}
      {tab === 'offers' && <OffersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

/* ============================== PRICING (shared query) ============================== */

function usePricing() {
  return useQuery({
    queryKey: ['admin-sponsorship-pricing'],
    queryFn: async () => {
      const { data, error } = await sb.from('sponsorship_pricing').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as Pricing[];
    },
  });
}

/* ============================== CAMPAIGNS ============================== */

function CampaignsTab({ mode }: { mode: 'pending' | 'history' }) {
  const pricing = usePricing();
  const list = useQuery({
    queryKey: ['admin-sponsorship-campaigns'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('sponsorship_campaigns')
        .select('*, merchants(name, phone, whatsapp, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });

  if (list.isLoading) return <Loading />;
  if (list.error) return <p className="text-sm text-destructive">{(list.error as Error).message}</p>;

  const rows = (list.data ?? []).filter((c) => (mode === 'pending' ? c.status === 'pending' : c.status !== 'pending'));
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{mode === 'pending' ? 'No pending requests.' : 'No campaigns yet.'}</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((c) => <CampaignRow key={c.id} c={c} pricing={pricing.data} />)}
    </div>
  );
}

function CampaignRow({ c, pricing }: { c: Campaign; pricing?: Pricing[] }) {
  const refresh = useRefreshAll();
  const [method, setMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const phase = phaseOf(c);

  async function act(action: 'confirm' | 'reject' | 'cancel') {
    if (action !== 'confirm' && !window.confirm(`${action === 'reject' ? 'Reject' : 'Cancel'} this campaign?`)) return;
    setBusy(true);
    const { error } = await sb.rpc('admin_review_sponsorship', {
      p_id: c.id, p_action: action,
      p_method: action === 'confirm' ? method : null,
      p_reference: action === 'confirm' ? reference.trim() || null : null,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(action === 'confirm' ? 'Payment confirmed — campaign activated' : `Campaign ${action}ed`);
    refresh();
  }

  const tone = phase === 'running' ? 'default' : phase === 'pending' || phase === 'scheduled' ? 'secondary' : 'outline';

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{c.merchants?.name ?? c.merchant_id}</p>
            <p className="text-xs text-muted-foreground">
              {[c.merchants?.phone, c.merchants?.whatsapp, c.merchants?.email].filter(Boolean).join(' · ') || 'No contact info'}
            </p>
          </div>
          <div className="text-right">
            <Badge variant={tone as any} className="capitalize">{phase}</Badge>
            <p className="mt-1 text-lg font-bold">{money(c.total_amount, c.currency)}</p>
            {c.discount_amount > 0 && (
              <p className="text-xs text-muted-foreground">
                {money(c.base_amount, c.currency)} − {money(c.discount_amount, c.currency)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {c.placements.map((p) => <Badge key={p} variant="outline">{placementLabel(p, pricing)}</Badge>)}
        </div>
        <p className="text-xs text-muted-foreground">
          {c.start_date} → {c.end_date} · {c.days} paid day(s){c.bonus_days ? ` + ${c.bonus_days} bonus` : ''}
          {c.offer_title ? ` · Offer: ${c.offer_title}` : ''}
          {c.payment_method ? ` · Paid via ${c.payment_method}${c.payment_reference ? ` (${c.payment_reference})` : ''}` : ''}
        </p>
        {c.admin_note && <p className="text-xs italic text-muted-foreground">Note: {c.admin_note}</p>}

        {c.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {['Cash', 'Bank transfer', 'ZainCash', 'FIB', 'Other'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Payment reference" className="h-9 w-48" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 w-48" />
            <Button size="sm" disabled={busy} onClick={() => act('confirm')} className="bg-gold text-background hover:bg-gold/90">
              Payment received — activate
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act('reject')}>Reject</Button>
          </div>
        )}
        {c.status === 'active' && phase !== 'ended' && (
          <div className="flex justify-end border-t pt-3">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('cancel')}>Cancel campaign</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== PRICING ============================== */

function PricingTab() {
  const { data, isLoading } = usePricing();
  if (isLoading) return <Loading />;
  return (
    <Card>
      <CardHeader><CardTitle>Daily price per placement</CardTitle></CardHeader>
      <CardContent className="divide-y p-0">
        {data?.map((p) => <PricingRow key={p.placement_key} p={p} />)}
      </CardContent>
    </Card>
  );
}

function PricingRow({ p }: { p: Pricing }) {
  const refresh = useRefreshAll();
  const [usd, setUsd] = useState(String(p.price_usd));
  const [iqd, setIqd] = useState(String(p.price_iqd));
  const [slots, setSlots] = useState(String(p.max_slots));

  async function save(patch: Partial<Pricing>) {
    const { error } = await sb.from('sponsorship_pricing').update(patch).eq('placement_key', p.placement_key);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-56 font-medium">{p.label} <span className="text-xs text-muted-foreground">{p.placement_key}</span></div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">USD/day
        <Input type="number" min={0} step="0.5" value={usd} onChange={(e) => setUsd(e.target.value)}
          onBlur={() => Number(usd) !== p.price_usd && save({ price_usd: Number(usd) })} className="h-8 w-24" />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">IQD/day
        <Input type="number" min={0} step="500" value={iqd} onChange={(e) => setIqd(e.target.value)}
          onBlur={() => Number(iqd) !== p.price_iqd && save({ price_iqd: Number(iqd) })} className="h-8 w-28" />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Max sponsors/day
        <Input type="number" min={1} value={slots} onChange={(e) => setSlots(e.target.value)}
          onBlur={() => Number(slots) !== p.max_slots && save({ max_slots: Math.max(1, Number(slots)) })} className="h-8 w-20" />
      </label>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">Enabled
        <Switch checked={p.enabled} onCheckedChange={(v) => save({ enabled: v })} />
      </label>
    </div>
  );
}

/* ============================== OFFERS ============================== */

interface Offer {
  id: string; title: string; code: string | null; min_days: number; discount_percent: number;
  bonus_days: number; starts_on: string | null; ends_on: string | null; max_uses: number | null;
  used_count: number; enabled: boolean;
}

function OffersTab() {
  const refresh = useRefreshAll();
  const list = useQuery({
    queryKey: ['admin-sponsorship-offers'],
    queryFn: async () => {
      const { data, error } = await sb.from('sponsorship_offers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Offer[];
    },
  });
  const [f, setF] = useState({ title: '', code: '', min_days: '7', percent: '10', bonus: '0', starts: '', ends: '', max_uses: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function create() {
    if (!f.title.trim()) return toast.error('Give the offer a title');
    const { error } = await sb.from('sponsorship_offers').insert({
      title: f.title.trim(),
      code: f.code.trim() || null,
      min_days: Math.max(1, Number(f.min_days) || 1),
      discount_percent: Math.min(100, Math.max(0, Number(f.percent) || 0)),
      bonus_days: Math.max(0, Number(f.bonus) || 0),
      starts_on: f.starts || null,
      ends_on: f.ends || null,
      max_uses: f.max_uses ? Number(f.max_uses) : null,
    });
    if (error) return toast.error(error.message);
    toast.success('Offer created');
    setF({ ...f, title: '', code: '' });
    refresh();
  }

  async function toggle(o: Offer, enabled: boolean) {
    const { error } = await sb.from('sponsorship_offers').update({ enabled }).eq('id', o.id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function remove(o: Offer) {
    if (!window.confirm(`Delete offer "${o.title}"?`)) return;
    const { error } = await sb.from('sponsorship_offers').delete().eq('id', o.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>New offer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            No code = applied automatically to every request that qualifies (the best one wins). With a code = only when the merchant enters it.
            "Bonus days" are free days added on top of the paid days.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Title"><Input value={f.title} onChange={set('title')} placeholder="Weekly deal" /></Field>
            <Field label="Code (optional)"><Input value={f.code} onChange={set('code')} placeholder="WELCOME10" /></Field>
            <Field label="Minimum days"><Input type="number" min={1} value={f.min_days} onChange={set('min_days')} /></Field>
            <Field label="Discount %"><Input type="number" min={0} max={100} value={f.percent} onChange={set('percent')} /></Field>
            <Field label="Bonus days"><Input type="number" min={0} value={f.bonus} onChange={set('bonus')} /></Field>
            <Field label="Valid from"><Input type="date" value={f.starts} onChange={set('starts')} /></Field>
            <Field label="Valid until"><Input type="date" value={f.ends} onChange={set('ends')} /></Field>
            <Field label="Max uses"><Input type="number" min={1} value={f.max_uses} onChange={set('max_uses')} placeholder="Unlimited" /></Field>
          </div>
          <Button size="sm" onClick={create} className="bg-gold text-background hover:bg-gold/90">Create offer</Button>
        </CardContent>
      </Card>

      {list.isLoading ? <Loading /> : (
        <Card>
          <CardContent className="divide-y p-0">
            {!list.data?.length && <p className="p-4 text-sm text-muted-foreground">No offers yet.</p>}
            {list.data?.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-48">
                  <p className="font-medium">{o.title} {o.code ? <Badge variant="outline">{o.code}</Badge> : <Badge variant="secondary">Automatic</Badge>}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.min_days}+ days · {o.discount_percent}% off{o.bonus_days ? ` · +${o.bonus_days} bonus days` : ''}
                    {o.starts_on || o.ends_on ? ` · ${o.starts_on ?? '…'} → ${o.ends_on ?? '…'}` : ''}
                    {` · used ${o.used_count}${o.max_uses ? `/${o.max_uses}` : ''}`}
                  </p>
                </div>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">Enabled
                  <Switch checked={o.enabled} onCheckedChange={(v) => toggle(o, v)} />
                </label>
                <Button size="sm" variant="outline" onClick={() => remove(o)}>Delete</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-xs font-medium text-muted-foreground">{label}{children}</label>;
}

/* ============================== PAYMENT INFO ============================== */

function SettingsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-sponsorship-settings'],
    queryFn: async () => {
      const { data, error } = await sb.from('sponsorship_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return (data?.payment_instructions ?? '') as string;
    },
  });
  const [text, setText] = useState<string | null>(null);
  const value = text ?? q.data ?? '';

  async function save() {
    const { error } = await sb.from('sponsorship_settings')
      .upsert({ id: 1, payment_instructions: value, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setText(null);
    qc.invalidateQueries({ queryKey: ['admin-sponsorship-settings'] });
    qc.invalidateQueries({ queryKey: ['sponsorship-settings'] });
  }

  if (q.isLoading) return <Loading />;
  return (
    <Card>
      <CardHeader><CardTitle>How merchants pay</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Shown to the merchant right after they submit a request (bank details, ZainCash/FIB number, WhatsApp to send the receipt, etc.).
        </p>
        <textarea
          value={value}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-input bg-transparent p-3 text-sm outline-none"
          placeholder="e.g. Transfer the total to … then send the receipt to WhatsApp +964 …"
        />
        <Button size="sm" onClick={save} disabled={text === null} className="bg-gold text-background hover:bg-gold/90">Save</Button>
      </CardContent>
    </Card>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center p-10 text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}
