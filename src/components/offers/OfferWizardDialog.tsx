import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

export type OfferRecord = {
  id: string;
  merchant_id: string;
  title: string;
  description?: string | null;
  offer_type: 'percentage' | 'fixed' | 'bundle' | 'special';
  discount_value?: number | null;
  currency?: string | null;
  promo_code?: string | null;
  terms?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

type OfferWizardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  initialOffer?: OfferRecord | null;
  onSaved: () => void;
};

type Draft = {
  title: string;
  description: string;
  offer_type: OfferRecord['offer_type'];
  discount_value: string;
  currency: string;
  promo_code: string;
  terms: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const STEPS = [
  { label: 'Offer identity', description: 'Give the offer a clear, attractive name.' },
  { label: 'Value & code', description: 'Explain the benefit and how to redeem it.' },
  { label: 'Schedule & terms', description: 'Control when the offer is available.' },
];

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function blankDraft(): Draft {
  const start = new Date();
  start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: '', description: '', offer_type: 'percentage', discount_value: '', currency: 'IQD',
    promo_code: '', terms: '', starts_at: start.toISOString().slice(0, 16),
    ends_at: end.toISOString().slice(0, 16), is_active: true,
  };
}

function draftFromOffer(offer: OfferRecord): Draft {
  return {
    title: offer.title ?? '', description: offer.description ?? '', offer_type: offer.offer_type ?? 'special',
    discount_value: offer.discount_value == null ? '' : String(offer.discount_value),
    currency: offer.currency ?? 'IQD', promo_code: offer.promo_code ?? '', terms: offer.terms ?? '',
    starts_at: toLocalDateTime(offer.starts_at), ends_at: toLocalDateTime(offer.ends_at), is_active: offer.is_active,
  };
}

export function OfferWizardDialog({ open, onOpenChange, merchantId, initialOffer, onSaved }: OfferWizardDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(initialOffer ? draftFromOffer(initialOffer) : blankDraft());
  }, [open, initialOffer]);

  const isEditing = Boolean(initialOffer?.id);
  const dateError = useMemo(() => {
    if (!draft.starts_at || !draft.ends_at) return 'Choose a start and end date.';
    if (new Date(draft.ends_at) <= new Date(draft.starts_at)) return 'The end date must be after the start date.';
    return '';
  }, [draft.starts_at, draft.ends_at]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function next() {
    if (step === 0 && draft.title.trim().length < 2) {
      toast.error('Add a short name for this offer.');
      return;
    }
    if (step === 2 && dateError) {
      toast.error(dateError);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function save() {
    if (!draft.title.trim()) return toast.error('Offer title is required.');
    if (dateError) return toast.error(dateError);
    setSaving(true);
    try {
      const payload = {
        merchant_id: merchantId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        offer_type: draft.offer_type,
        discount_value: draft.discount_value === '' ? null : Number(draft.discount_value),
        currency: draft.currency.trim().toUpperCase() || 'IQD',
        promo_code: draft.promo_code.trim() || null,
        terms: draft.terms.trim() || null,
        starts_at: new Date(draft.starts_at).toISOString(),
        ends_at: new Date(draft.ends_at).toISOString(),
        is_active: draft.is_active,
        updated_by: user?.id ?? null,
      };

      const request = initialOffer?.id
        ? supabase.from('merchant_offers' as any).update(payload).eq('id', initialOffer.id)
        : supabase.from('merchant_offers' as any).insert({ ...payload, created_by: user?.id ?? null });
      const { error } = await request;
      if (error) throw error;
      toast.success(isEditing ? 'Offer updated.' : 'Offer created.');
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error?.message ?? 'Could not save the offer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-gold/20 bg-card/95 shadow-luxury backdrop-blur-xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-gold"><Tag className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.25em]">Offer studio</span></div>
          <DialogTitle className="font-display text-2xl">{isEditing ? 'Refine this offer' : 'Create a new offer'}</DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {STEPS.map((item, index) => (
            <div key={item.label} className="flex flex-1 items-center gap-2">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${index <= step ? 'bg-gold text-background' : 'bg-muted text-muted-foreground'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</div>
              <span className={`hidden text-xs font-semibold sm:block ${index === step ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
              {index < STEPS.length - 1 && <div className={`h-px flex-1 ${index < step ? 'bg-gold/60' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="min-h-[250px] py-4">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2"><Label>Offer title</Label><Input autoFocus value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. 20% off your first dinner" className="h-12 border-gold/20 bg-background" /></div>
              <div className="space-y-2"><Label>Short description</Label><Textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Tell travelers what they receive in one clear sentence…" rows={4} className="border-gold/20 bg-background" /></div>
              <div className="grid gap-2 sm:grid-cols-4">
                {(['percentage', 'fixed', 'bundle', 'special'] as const).map((type) => <button type="button" key={type} onClick={() => update('offer_type', type)} className={`rounded-xl border px-3 py-3 text-xs font-semibold capitalize transition-colors ${draft.offer_type === type ? 'border-gold bg-gold/10 text-gold' : 'border-border hover:border-gold/40'}`}>{type}</button>)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {(draft.offer_type === 'percentage' || draft.offer_type === 'fixed') && <div className="grid gap-4 sm:grid-cols-[1fr_120px]"><div className="space-y-2"><Label>{draft.offer_type === 'percentage' ? 'Discount percentage' : 'Discount value'}</Label><Input type="number" min="0" value={draft.discount_value} onChange={(event) => update('discount_value', event.target.value)} placeholder="20" className="h-12 border-gold/20 bg-background" /></div><div className="space-y-2"><Label>Currency</Label><Input value={draft.currency} onChange={(event) => update('currency', event.target.value)} disabled={draft.offer_type === 'percentage'} className="h-12 border-gold/20 bg-background" /></div></div>}
              <div className="space-y-2"><Label>Promo code <span className="font-normal text-muted-foreground">(optional)</span></Label><Input value={draft.promo_code} onChange={(event) => update('promo_code', event.target.value.toUpperCase())} placeholder="ERBILGO20" className="h-12 border-gold/20 bg-background font-mono tracking-wider" /></div>
              <div className="rounded-2xl border border-gold/10 bg-gold/5 p-4 text-sm text-muted-foreground">Keep the redemption step simple. A clear title, benefit, and optional code usually converts better than a long explanation.</div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Starts</Label><Input type="datetime-local" value={draft.starts_at} onChange={(event) => update('starts_at', event.target.value)} className="h-12 border-gold/20 bg-background" /></div><div className="space-y-2"><Label>Ends</Label><Input type="datetime-local" value={draft.ends_at} onChange={(event) => update('ends_at', event.target.value)} className="h-12 border-gold/20 bg-background" /></div></div>
              {dateError && <p className="text-xs text-destructive">{dateError}</p>}
              <div className="space-y-2"><Label>Terms &amp; conditions <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea value={draft.terms} onChange={(event) => update('terms', event.target.value)} placeholder="Valid once per person. Cannot be combined with another offer." rows={4} className="border-gold/20 bg-background" /></div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 p-4"><div><p className="text-sm font-semibold">Publish when the schedule begins</p><p className="text-xs text-muted-foreground">You can pause this offer at any time.</p></div><Switch checked={draft.is_active} onCheckedChange={(value) => update('is_active', value)} className="data-[state=checked]:bg-gold" /></div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between border-t border-border/60 pt-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}><ChevronLeft className="mr-2 h-4 w-4" />{step === 0 ? 'Cancel' : 'Back'}</Button>
          {step < STEPS.length - 1 ? <Button type="button" onClick={next} className="bg-gold text-background hover:bg-gold/90">Next<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={save} disabled={saving} className="bg-gold text-background hover:bg-gold/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEditing ? 'Save changes' : 'Publish offer'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
