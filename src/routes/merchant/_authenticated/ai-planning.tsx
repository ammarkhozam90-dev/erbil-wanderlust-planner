import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMyMerchant } from '@/components/merchant/use-my-merchant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PriceLevel } from '@/integrations/supabase/types-local';

export const Route = createFileRoute('/merchant/_authenticated/ai-planning')({
  component: AIPlanning,
});

const MOODS = ['romantic', 'family', 'adventure', 'relaxing', 'social', 'cultural', 'energetic', 'cozy'];
const TIMES = ['morning', 'afternoon', 'evening', 'night'];
const SUITS = ['family', 'couples', 'solo', 'groups', 'business', 'kids'];
const TRANSPORT = ['walking', 'car', 'taxi', 'public'];
const PRICES: PriceLevel[] = ['$', '$$', '$$$', '$$$$'];

function MultiPick({ label, options, value, onChange }: {
  label: string; options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  function toggle(o: string) {
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)}>
              <Badge variant={active ? 'default' : 'outline'} className={cn('cursor-pointer capitalize', active && 'bg-primary')}>
                {o}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AIPlanning() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: m } = useMyMerchant(user?.id);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (m && !form) setForm(m); }, [m, form]);
  if (!form) return <div className="text-muted-foreground">Set up your business first.</div>;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('merchants').update({
      mood_tags: form.mood_tags, best_visit_time: form.best_visit_time,
      avg_duration_minutes: Number(form.avg_duration_minutes) || 60,
      price_level: form.price_level, suitability: form.suitability,
      transportation: form.transportation,
    }).eq('id', form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    qc.invalidateQueries({ queryKey: ['my-merchant', user?.id] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">AI Planning Info</h2>
          <p className="text-sm text-muted-foreground">Helps ErbilGo recommend your place to the right travelers.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Audience & vibe</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <MultiPick label="Mood tags" options={MOODS} value={form.mood_tags ?? []} onChange={(v) => setForm({ ...form, mood_tags: v })} />
          <MultiPick label="Best visit time" options={TIMES} value={form.best_visit_time ?? []} onChange={(v) => setForm({ ...form, best_visit_time: v })} />
          <MultiPick label="Suitable for" options={SUITS} value={form.suitability ?? []} onChange={(v) => setForm({ ...form, suitability: v })} />
          <MultiPick label="Transportation" options={TRANSPORT} value={form.transportation ?? []} onChange={(v) => setForm({ ...form, transportation: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visit details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Average duration (minutes)</Label>
            <Input type="number" min={5} value={form.avg_duration_minutes ?? 60}
              onChange={(e) => setForm({ ...form, avg_duration_minutes: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Price level</Label>
            <Select value={form.price_level ?? '$$'} onValueChange={(v) => setForm({ ...form, price_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
